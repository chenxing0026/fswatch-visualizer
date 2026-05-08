use std::{
  collections::HashMap,
  path::{Path, PathBuf},
  sync::{mpsc, Arc},
  thread,
  time::Duration,
};

use chrono::Utc;
use crossbeam_channel::{select, tick, unbounded};
use globset::{Glob, GlobSet, GlobSetBuilder};
use notify::{event::ModifyKind, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter};

use crate::{
  db,
  models::{AppSettings, EventType, FsEventRecord, WatchRule, WatchedPath},
};

pub struct WatcherHandle {
  stop_tx: mpsc::Sender<()>,
  join: Option<thread::JoinHandle<()>>,
}

impl WatcherHandle {
  pub fn stop(mut self) {
    let _ = self.stop_tx.send(());
    if let Some(j) = self.join.take() {
      let _ = j.join();
    }
  }
}

#[derive(Clone)]
struct CompiledRules {
  include: Option<GlobSet>,
  exclude: Option<GlobSet>,
  event_types: Option<Vec<EventType>>,
}

fn compile_globs(globs: &[String]) -> Option<GlobSet> {
  if globs.is_empty() {
    return None;
  }
  let mut b = GlobSetBuilder::new();
  for g in globs {
    if let Ok(glob) = Glob::new(g) {
      b.add(glob);
    }
  }
  b.build().ok()
}

fn compile_rules(rules: &[WatchRule]) -> CompiledRules {
  let enabled: Vec<&WatchRule> = rules.iter().filter(|r| r.enabled).collect();
  if enabled.is_empty() {
    return CompiledRules {
      include: None,
      exclude: None,
      event_types: None,
    };
  }
  let mut include: Vec<String> = Vec::new();
  let mut exclude: Vec<String> = Vec::new();
  let mut types: Vec<EventType> = Vec::new();
  for r in enabled {
    include.extend(r.include_globs.iter().cloned());
    exclude.extend(r.exclude_globs.iter().cloned());
    types.extend(r.event_types.iter().cloned());
  }
  types.sort_by_key(|t| *t as u8);
  types.dedup();

  CompiledRules {
    include: compile_globs(&include),
    exclude: compile_globs(&exclude),
    event_types: if types.is_empty() { None } else { Some(types) },
  }
}

fn compile_important(settings: &AppSettings) -> Option<GlobSet> {
  compile_globs(&settings.important_globs)
}

fn should_take_event(
  rules: &CompiledRules,
  event_type: EventType,
  path: &Path,
) -> bool {
  if let Some(allowed) = &rules.event_types {
    if !allowed.contains(&event_type) {
      return false;
    }
  }

  if let Some(ex) = &rules.exclude {
    if ex.is_match(path) {
      return false;
    }
  }
  if let Some(inc) = &rules.include {
    if !inc.is_match(path) {
      return false;
    }
    return true;
  }

  true
}

pub fn start_watcher(
  app: AppHandle,
  db_path: PathBuf,
  base_paths: Vec<WatchedPath>,
  rules: Vec<WatchRule>,
) -> Result<WatcherHandle, String> {
  if base_paths.is_empty() {
    return Err("no watched paths".to_string());
  }

  let (stop_tx, stop_rx) = mpsc::channel::<()>();
  let join = thread::spawn(move || {
    let settings = {
      let conn = match db::open_db(&db_path) {
        Ok(c) => c,
        Err(e) => {
          let _ = app.emit("watcher_error", e.to_string());
          return;
        }
      };
      match db::get_settings(&conn) {
        Ok(s) => s,
        Err(e) => {
          let _ = app.emit("watcher_error", e.to_string());
          return;
        }
      }
    };

    let compiled_rules = Arc::new(compile_rules(&rules));
    let important_globs = Arc::new(compile_important(&settings));

    let (raw_tx, raw_rx) = unbounded::<notify::Result<notify::Event>>();
    let mut watcher = match RecommendedWatcher::new(
      move |res| {
        let _ = raw_tx.send(res);
      },
      notify::Config::default(),
    ) {
      Ok(w) => w,
      Err(e) => {
        let _ = app.emit("watcher_error", e.to_string());
        return;
      }
    };

    for bp in &base_paths {
      let mode = if bp.recursive {
        RecursiveMode::Recursive
      } else {
        RecursiveMode::NonRecursive
      };
      if let Err(e) = watcher.watch(Path::new(&bp.path), mode) {
        let _ = app.emit("watcher_error", format!("watch failed: {}", e));
        return;
      }
    }

    let mut conn = match db::open_db(&db_path) {
      Ok(c) => c,
      Err(e) => {
        let _ = app.emit("watcher_error", e.to_string());
        return;
      }
    };

    let mut meta_cache: HashMap<String, i64> = HashMap::new();
    let mut buffer: Vec<FsEventRecord> = Vec::new();
    let ticker = tick(Duration::from_millis(settings.batch_interval_ms.max(50) as u64));
    let mut flush_count: u64 = 0;

    loop {
      select! {
        recv(ticker) -> _ => {
          if !buffer.is_empty() {
            if db::insert_events(&mut conn, &buffer).is_err() {
              let _ = app.emit("watcher_error", "db insert failed".to_string());
            }
            flush_count += 1;
            if flush_count % 10 == 0 {
              let cutoff = (Utc::now() - chrono::Duration::days(settings.retain_days as i64)).to_rfc3339();
              let _ = db::cleanup_events(&conn, &settings, &cutoff);
            }
            let payload = buffer.clone();
            buffer.clear();
            let _ = app.emit("fs_events", payload);
          }
        }
        recv(raw_rx) -> msg => {
          let res = match msg {
            Ok(v) => v,
            Err(_) => continue,
          };
          let evt = match res {
            Ok(e) => e,
            Err(e) => {
              let _ = app.emit("watcher_error", e.to_string());
              continue;
            }
          };

          let kind = evt.kind;
          let event_type = map_event_type(kind);
          if event_type.is_none() {
            continue;
          }
          let event_type = event_type.unwrap();

          for p in evt.paths {
            if p.as_os_str().is_empty() {
              continue;
            }
            let base_path_id = match find_base_path(&base_paths, &p) {
              Some(id) => id,
              None => continue,
            };

            if !should_take_event(&compiled_rules, event_type, &p) {
              continue;
            }

            let full_path = p.to_string_lossy().to_string();
            let (size_before, size_after) = size_before_after(&full_path, &p, &mut meta_cache);

            let important = important_globs
              .as_ref()
              .as_ref()
              .map(|g| g.is_match(&p))
              .unwrap_or(false);

            let record = FsEventRecord {
              id: uuid::Uuid::new_v4().to_string(),
              occurred_at: Utc::now().to_rfc3339(),
              event_type,
              full_path,
              base_path_id,
              rule_id: None,
              size_before,
              size_after,
              process_name: None,
              username: None,
              important,
            };
            buffer.push(record);
            if buffer.len() >= 1000 {
              let _ = db::insert_events(&mut conn, &buffer);
              flush_count += 1;
              if flush_count % 10 == 0 {
                let cutoff = (Utc::now() - chrono::Duration::days(settings.retain_days as i64)).to_rfc3339();
                let _ = db::cleanup_events(&conn, &settings, &cutoff);
              }
              let payload = buffer.clone();
              buffer.clear();
              let _ = app.emit("fs_events", payload);
            }
          }
        }
        default(Duration::from_millis(50)) => {
          if stop_rx.try_recv().is_ok() {
            break;
          }
        }
      }
    }

    drop(watcher);
  });

  Ok(WatcherHandle {
    stop_tx,
    join: Some(join),
  })
}

fn map_event_type(kind: EventKind) -> Option<EventType> {
  match kind {
    EventKind::Create(_) => Some(EventType::Create),
    EventKind::Remove(_) => Some(EventType::Delete),
    EventKind::Modify(ModifyKind::Name(_)) => Some(EventType::Rename),
    EventKind::Modify(_) => Some(EventType::Modify),
    _ => None,
  }
}

fn find_base_path(base_paths: &[WatchedPath], path: &Path) -> Option<String> {
  let s = path.to_string_lossy().to_string();
  for bp in base_paths {
    if s == bp.path {
      return Some(bp.id.clone());
    }

    let base = bp.path.trim_end_matches(['/', '\\']);
    if s == base {
      return Some(bp.id.clone());
    }

    let with_sep = format!("{}\\", base);
    let with_sep2 = format!("{}/", base);
    if s.starts_with(&with_sep) || s.starts_with(&with_sep2) {
      return Some(bp.id.clone());
    }
  }
  None
}

fn size_before_after(
  key: &str,
  path: &Path,
  cache: &mut HashMap<String, i64>,
) -> (Option<i64>, Option<i64>) {
  let before = cache.get(key).copied();
  let after = std::fs::metadata(path)
    .ok()
    .map(|m| m.len() as i64);
  if let Some(a) = after {
    if cache.len() > 50_000 {
      cache.clear();
    }
    cache.insert(key.to_string(), a);
  }
  (before, after)
}

