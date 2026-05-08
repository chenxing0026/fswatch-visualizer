use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension};

use crate::models::{AppSettings, EventType, FsEventRecord, ListEventsQuery, ListEventsResult, OverviewStats, WatchedPath, WatchRule};

pub fn open_db(db_path: &Path) -> rusqlite::Result<Connection> {
  let conn = Connection::open(db_path)?;
  conn.pragma_update(None, "journal_mode", "WAL")?;
  conn.pragma_update(None, "synchronous", "NORMAL")?;
  Ok(conn)
}

pub fn init_db(conn: &Connection) -> rusqlite::Result<()> {
  conn.execute_batch(
    r#"
CREATE TABLE IF NOT EXISTS watched_paths (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  recursive INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watch_rules (
  id TEXT PRIMARY KEY,
  include_globs TEXT NOT NULL,
  exclude_globs TEXT NOT NULL,
  event_types TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fs_event_records (
  id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  event_type TEXT NOT NULL,
  full_path TEXT NOT NULL,
  base_path_id TEXT NOT NULL,
  rule_id TEXT,
  size_before INTEGER,
  size_after INTEGER,
  process_name TEXT,
  username TEXT,
  important INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_events_time ON fs_event_records(occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_path ON fs_event_records(full_path);
CREATE INDEX IF NOT EXISTS idx_events_base_path ON fs_event_records(base_path_id);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
"#,
  )?;
  Ok(())
}

pub fn upsert_watched_path(conn: &Connection, item: &WatchedPath) -> rusqlite::Result<()> {
  conn.execute(
    r#"
INSERT INTO watched_paths (id, path, recursive, enabled, created_at)
VALUES (?1, ?2, ?3, ?4, ?5)
ON CONFLICT(id) DO UPDATE SET
  path=excluded.path,
  recursive=excluded.recursive,
  enabled=excluded.enabled;
"#,
    params![
      item.id,
      item.path,
      if item.recursive { 1 } else { 0 },
      if item.enabled { 1 } else { 0 },
      item.created_at
    ],
  )?;
  Ok(())
}

pub fn list_watched_paths(conn: &Connection) -> rusqlite::Result<Vec<WatchedPath>> {
  let mut stmt = conn.prepare(
    "SELECT id, path, recursive, enabled, created_at FROM watched_paths ORDER BY created_at DESC",
  )?;
  let rows = stmt.query_map([], |row| {
    Ok(WatchedPath {
      id: row.get(0)?,
      path: row.get(1)?,
      recursive: row.get::<_, i64>(2)? != 0,
      enabled: row.get::<_, i64>(3)? != 0,
      created_at: row.get(4)?,
    })
  })?;
  let mut items = Vec::new();
  for r in rows {
    items.push(r?);
  }
  Ok(items)
}

pub fn upsert_rule(conn: &Connection, rule: &WatchRule) -> rusqlite::Result<()> {
  conn.execute(
    r#"
INSERT INTO watch_rules (id, include_globs, exclude_globs, event_types, enabled, created_at)
VALUES (?1, ?2, ?3, ?4, ?5, ?6)
ON CONFLICT(id) DO UPDATE SET
  include_globs=excluded.include_globs,
  exclude_globs=excluded.exclude_globs,
  event_types=excluded.event_types,
  enabled=excluded.enabled;
"#,
    params![
      rule.id,
      serde_json::to_string(&rule.include_globs).unwrap_or_else(|_| "[]".to_string()),
      serde_json::to_string(&rule.exclude_globs).unwrap_or_else(|_| "[]".to_string()),
      serde_json::to_string(&rule.event_types).unwrap_or_else(|_| "[]".to_string()),
      if rule.enabled { 1 } else { 0 },
      rule.created_at
    ],
  )?;
  Ok(())
}

pub fn list_rules(conn: &Connection) -> rusqlite::Result<Vec<WatchRule>> {
  let mut stmt = conn.prepare(
    "SELECT id, include_globs, exclude_globs, event_types, enabled, created_at FROM watch_rules ORDER BY created_at DESC",
  )?;
  let rows = stmt.query_map([], |row| {
    let include_globs_str: String = row.get(1)?;
    let exclude_globs_str: String = row.get(2)?;
    let event_types_str: String = row.get(3)?;
    Ok(WatchRule {
      id: row.get(0)?,
      include_globs: serde_json::from_str(&include_globs_str).unwrap_or_default(),
      exclude_globs: serde_json::from_str(&exclude_globs_str).unwrap_or_default(),
      event_types: serde_json::from_str(&event_types_str).unwrap_or_default(),
      enabled: row.get::<_, i64>(4)? != 0,
      created_at: row.get(5)?,
    })
  })?;
  let mut items = Vec::new();
  for r in rows {
    items.push(r?);
  }
  Ok(items)
}

pub fn insert_events(conn: &mut Connection, items: &[FsEventRecord]) -> rusqlite::Result<()> {
  let tx = conn.transaction()?;
  {
    let mut stmt = tx.prepare(
      r#"INSERT INTO fs_event_records
        (id, occurred_at, event_type, full_path, base_path_id, rule_id, size_before, size_after, process_name, username, important)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)"#,
    )?;
    for it in items {
      stmt.execute(params![
        it.id,
        it.occurred_at,
        event_type_to_str(it.event_type),
        it.full_path,
        it.base_path_id,
        it.rule_id,
        it.size_before,
        it.size_after,
        it.process_name,
        it.username,
        if it.important { 1 } else { 0 }
      ])?;
    }
  }
  tx.commit()?;
  Ok(())
}

pub fn list_events(conn: &Connection, q: &ListEventsQuery) -> rusqlite::Result<ListEventsResult> {
  let limit = q.limit.unwrap_or(200).min(500) as usize;
  let sort = q.sort.clone().unwrap_or_else(|| "time_desc".to_string());

  let mut where_parts: Vec<String> = Vec::new();
  let mut args: Vec<rusqlite::types::Value> = Vec::new();

  if let Some(ids) = &q.base_path_ids {
    if !ids.is_empty() {
      let placeholders: Vec<&str> = (0..ids.len()).map(|_| "?").collect();
      where_parts.push(format!("base_path_id IN ({})", placeholders.join(",")));
      for id in ids {
        args.push(id.clone().into());
      }
    }
  }

  if let Some(types) = &q.event_types {
    if !types.is_empty() {
      let placeholders: Vec<&str> = (0..types.len()).map(|_| "?").collect();
      where_parts.push(format!("event_type IN ({})", placeholders.join(",")));
      for t in types {
        args.push(event_type_to_str(*t).to_string().into());
      }
    }
  }

  if let Some(s) = &q.path_contains {
    if !s.trim().is_empty() {
      where_parts.push("full_path LIKE ?".to_string());
      args.push(format!("%{}%", s.trim()).into());
    }
  }

  if let Some(exts) = &q.extensions {
    let cleaned: Vec<String> = exts
      .iter()
      .map(|e| e.trim().to_string())
      .filter(|e| !e.is_empty())
      .map(|e| if e.starts_with('.') { e } else { format!(".{}", e) })
      .collect();
    if !cleaned.is_empty() {
      let ors: Vec<&str> = (0..cleaned.len()).map(|_| "full_path LIKE ?").collect();
      where_parts.push(format!("({})", ors.join(" OR ")));
      for e in cleaned {
        args.push(format!("%{}", e).into());
      }
    }
  }

  if let Some(min_size) = q.min_size {
    where_parts.push("size_after >= ?".to_string());
    args.push(min_size.into());
  }
  if let Some(max_size) = q.max_size {
    where_parts.push("size_after <= ?".to_string());
    args.push(max_size.into());
  }

  if let Some(s) = &q.start_time {
    where_parts.push("occurred_at >= ?".to_string());
    args.push(s.clone().into());
  }
  if let Some(s) = &q.end_time {
    where_parts.push("occurred_at <= ?".to_string());
    args.push(s.clone().into());
  }

  if let Some(cursor) = &q.cursor {
    if let Some((t, id)) = cursor.split_once('|') {
      if sort == "time_desc" {
        where_parts.push("(occurred_at < ? OR (occurred_at = ? AND id < ?))".to_string());
      } else {
        where_parts.push("(occurred_at > ? OR (occurred_at = ? AND id > ?))".to_string());
      }
      args.push(t.to_string().into());
      args.push(t.to_string().into());
      args.push(id.to_string().into());
    }
  }

  let where_sql = if where_parts.is_empty() {
    "".to_string()
  } else {
    format!("WHERE {}", where_parts.join(" AND "))
  };
  let order_sql = if sort == "time_asc" {
    "ORDER BY occurred_at ASC, id ASC".to_string()
  } else {
    "ORDER BY occurred_at DESC, id DESC".to_string()
  };

  let sql = format!(
    "SELECT id, occurred_at, event_type, full_path, base_path_id, rule_id, size_before, size_after, process_name, username, important FROM fs_event_records {} {} LIMIT {}",
    where_sql, order_sql, limit + 1
  );

  let mut stmt = conn.prepare(&sql)?;

  let rows = stmt.query_map(rusqlite::params_from_iter(args.iter()), |row| {
    let event_type_str: String = row.get(2)?;
    Ok(FsEventRecord {
      id: row.get(0)?,
      occurred_at: row.get(1)?,
      event_type: event_type_from_str(&event_type_str).unwrap_or(EventType::Modify),
      full_path: row.get(3)?,
      base_path_id: row.get(4)?,
      rule_id: row.get(5)?,
      size_before: row.get(6)?,
      size_after: row.get(7)?,
      process_name: row.get(8)?,
      username: row.get(9)?,
      important: row.get::<_, i64>(10)? != 0,
    })
  })?;

  let mut items = Vec::new();
  for r in rows {
    items.push(r?);
  }

  let mut next_cursor = None;
  if items.len() > limit {
    let last = items.pop().unwrap();
    next_cursor = Some(format!("{}|{}", last.occurred_at, last.id));
  }

  Ok(ListEventsResult { items, next_cursor })
}

pub fn get_event(conn: &Connection, id: &str) -> rusqlite::Result<Option<FsEventRecord>> {
  let mut stmt = conn.prepare(
    "SELECT id, occurred_at, event_type, full_path, base_path_id, rule_id, size_before, size_after, process_name, username, important FROM fs_event_records WHERE id = ?1",
  )?;
  let mut rows = stmt.query([id])?;
  if let Some(row) = rows.next()? {
    let event_type_str: String = row.get(2)?;
    return Ok(Some(FsEventRecord {
      id: row.get(0)?,
      occurred_at: row.get(1)?,
      event_type: event_type_from_str(&event_type_str).unwrap_or(EventType::Modify),
      full_path: row.get(3)?,
      base_path_id: row.get(4)?,
      rule_id: row.get(5)?,
      size_before: row.get(6)?,
      size_after: row.get(7)?,
      process_name: row.get(8)?,
      username: row.get(9)?,
      important: row.get::<_, i64>(10)? != 0,
    }));
  }
  Ok(None)
}

pub fn get_overview(conn: &Connection, start_time: &str) -> rusqlite::Result<OverviewStats> {
  let total: u64 = conn.query_row(
    "SELECT COUNT(*) FROM fs_event_records WHERE occurred_at >= ?1",
    [start_time],
    |row| row.get::<_, i64>(0).map(|v| v as u64),
  )?;

  let mut per_type: Vec<(EventType, u64)> = Vec::new();
  {
    let mut stmt = conn.prepare(
      "SELECT event_type, COUNT(*) FROM fs_event_records WHERE occurred_at >= ?1 GROUP BY event_type",
    )?;
    let rows = stmt.query_map([start_time], |row| {
      let t: String = row.get(0)?;
      let c: i64 = row.get(1)?;
      Ok((event_type_from_str(&t).unwrap_or(EventType::Modify), c as u64))
    })?;
    for r in rows {
      per_type.push(r?);
    }
  }

  let mut per_minute: Vec<(String, u64)> = Vec::new();
  {
    let mut stmt = conn.prepare(
      "SELECT substr(occurred_at, 1, 16) as minute, COUNT(*) FROM fs_event_records WHERE occurred_at >= ?1 GROUP BY minute ORDER BY minute ASC",
    )?;
    let rows = stmt.query_map([start_time], |row| {
      let minute: String = row.get(0)?;
      let c: i64 = row.get(1)?;
      Ok((minute, c as u64))
    })?;
    for r in rows {
      per_minute.push(r?);
    }
  }

  Ok(OverviewStats {
    total,
    per_type,
    per_minute,
  })
}

pub fn get_settings(conn: &Connection) -> rusqlite::Result<AppSettings> {
  let defaults = AppSettings {
    retain_days: 7,
    max_events: 200_000,
    batch_interval_ms: 200,
    important_globs: vec![
      "**/.env".to_string(),
      "**/*.pem".to_string(),
      "**/*.key".to_string(),
      "**/.ssh/**".to_string(),
    ],
    system_notifications_enabled: true,
  };

  let value: Option<String> = conn
    .query_row(
      "SELECT value FROM app_settings WHERE key = 'settings'",
      [],
      |row| row.get(0),
    )
    .optional()?;

  if let Some(v) = value {
    if let Ok(parsed) = serde_json::from_str::<AppSettings>(&v) {
      return Ok(parsed);
    }
  }
  Ok(defaults)
}

pub fn set_settings(conn: &Connection, settings: &AppSettings) -> rusqlite::Result<()> {
  conn.execute(
    "INSERT INTO app_settings (key, value) VALUES ('settings', ?1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    [serde_json::to_string(settings).unwrap_or_else(|_| "{}".to_string())],
  )?;
  Ok(())
}

pub fn cleanup_events(conn: &Connection, settings: &AppSettings, cutoff_iso: &str) -> rusqlite::Result<()> {
  if settings.retain_days > 0 {
    conn.execute(
      "DELETE FROM fs_event_records WHERE occurred_at < ?1",
      [cutoff_iso],
    )?;
  }

  if settings.max_events > 0 {
    let max_events = settings.max_events as i64;
    conn.execute(
      "DELETE FROM fs_event_records WHERE id IN (SELECT id FROM fs_event_records ORDER BY occurred_at DESC, id DESC LIMIT -1 OFFSET ?1)",
      [max_events],
    )?;
  }
  Ok(())
}

fn event_type_to_str(t: EventType) -> &'static str {
  match t {
    EventType::Create => "create",
    EventType::Modify => "modify",
    EventType::Delete => "delete",
    EventType::Rename => "rename",
  }
}

fn event_type_from_str(s: &str) -> Option<EventType> {
  match s {
    "create" => Some(EventType::Create),
    "modify" => Some(EventType::Modify),
    "delete" => Some(EventType::Delete),
    "rename" => Some(EventType::Rename),
    _ => None,
  }
}

