use std::path::PathBuf;

use chrono::{Duration, Utc};
use tauri::{AppHandle, State};

use crate::{
  db,
  models::{AppSettings, FsEventRecord, ListEventsQuery, ListEventsResult, OverviewStats, WatchedPath, WatchRule},
  watcher,
  AppState,
};

#[tauri::command]
pub fn list_watched_paths(state: State<'_, AppState>) -> Result<Vec<WatchedPath>, String> {
  let conn = db::open_db(&state.db_path).map_err(|e| e.to_string())?;
  db::list_watched_paths(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn upsert_watched_path(state: State<'_, AppState>, input: WatchedPath) -> Result<WatchedPath, String> {
  let conn = db::open_db(&state.db_path).map_err(|e| e.to_string())?;
  db::upsert_watched_path(&conn, &input).map_err(|e| e.to_string())?;
  Ok(input)
}

#[tauri::command]
pub fn list_rules(state: State<'_, AppState>) -> Result<Vec<WatchRule>, String> {
  let conn = db::open_db(&state.db_path).map_err(|e| e.to_string())?;
  db::list_rules(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn upsert_rule(state: State<'_, AppState>, input: WatchRule) -> Result<WatchRule, String> {
  let conn = db::open_db(&state.db_path).map_err(|e| e.to_string())?;
  db::upsert_rule(&conn, &input).map_err(|e| e.to_string())?;
  Ok(input)
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
  let conn = db::open_db(&state.db_path).map_err(|e| e.to_string())?;
  db::get_settings(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_settings(state: State<'_, AppState>, settings: AppSettings) -> Result<AppSettings, String> {
  let conn = db::open_db(&state.db_path).map_err(|e| e.to_string())?;
  db::set_settings(&conn, &settings).map_err(|e| e.to_string())?;
  Ok(settings)
}

#[tauri::command]
pub fn list_events(state: State<'_, AppState>, query: ListEventsQuery) -> Result<ListEventsResult, String> {
  let conn = db::open_db(&state.db_path).map_err(|e| e.to_string())?;
  db::list_events(&conn, &query).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_event(state: State<'_, AppState>, id: String) -> Result<Option<FsEventRecord>, String> {
  let conn = db::open_db(&state.db_path).map_err(|e| e.to_string())?;
  db::get_event(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_overview(state: State<'_, AppState>, window: String) -> Result<OverviewStats, String> {
  let start = match window.as_str() {
    "5m" => Utc::now() - Duration::minutes(5),
    "1h" => Utc::now() - Duration::hours(1),
    _ => Utc::now() - Duration::hours(24),
  };
  let conn = db::open_db(&state.db_path).map_err(|e| e.to_string())?;
  db::get_overview(&conn, &start.to_rfc3339()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn start_watch(app: AppHandle, state: State<'_, AppState>, base_path_ids: Option<Vec<String>>) -> Result<bool, String> {
  let conn = db::open_db(&state.db_path).map_err(|e| e.to_string())?;
  let mut paths = db::list_watched_paths(&conn).map_err(|e| e.to_string())?;
  paths.retain(|p| p.enabled);
  if let Some(ids) = base_path_ids {
    paths.retain(|p| ids.contains(&p.id));
  }
  let rules = db::list_rules(&conn).map_err(|e| e.to_string())?;

  let mut guard = state.watcher.lock().map_err(|_| "watcher lock failed".to_string())?;
  if guard.is_some() {
    return Ok(true);
  }
  let handle = watcher::start_watcher(app, state.db_path.clone(), paths, rules)?;
  *guard = Some(handle);
  Ok(true)
}

#[tauri::command]
pub fn stop_watch(state: State<'_, AppState>) -> Result<bool, String> {
  let mut guard = state.watcher.lock().map_err(|_| "watcher lock failed".to_string())?;
  if let Some(h) = guard.take() {
    h.stop();
  }
  Ok(true)
}

#[tauri::command]
pub fn export_events(state: State<'_, AppState>, query: ListEventsQuery, format: String) -> Result<String, String> {
  let conn = db::open_db(&state.db_path).map_err(|e| e.to_string())?;
  let mut q = query.clone();
  q.limit = Some(500);
  q.cursor = None;
  let mut all: Vec<FsEventRecord> = Vec::new();
  let mut cursor: Option<String> = None;
  loop {
    q.cursor = cursor.clone();
    let res = db::list_events(&conn, &q).map_err(|e| e.to_string())?;
    all.extend(res.items);
    if res.next_cursor.is_none() {
      break;
    }
    cursor = res.next_cursor;
    if all.len() > 50_000 {
      break;
    }
  }

  let dir = std::env::temp_dir();
  let file_path = if format == "csv" {
    let p = dir.join("fswatch-export.csv");
    let mut wtr = csv::Writer::from_path(&p).map_err(|e| e.to_string())?;
    for it in all {
      wtr.serialize(it).map_err(|e| e.to_string())?;
    }
    wtr.flush().map_err(|e| e.to_string())?;
    p
  } else {
    let p = dir.join("fswatch-export.json");
    std::fs::write(&p, serde_json::to_vec_pretty(&all).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    p
  };
  Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_in_folder(path: String) -> Result<bool, String> {
  open::that(PathBuf::from(path)).map_err(|e| e.to_string())?;
  Ok(true)
}

