use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchedPath {
  pub id: String,
  pub path: String,
  pub recursive: bool,
  pub enabled: bool,
  pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchRule {
  pub id: String,
  pub include_globs: Vec<String>,
  pub exclude_globs: Vec<String>,
  pub event_types: Vec<EventType>,
  pub enabled: bool,
  pub created_at: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EventType {
  Create,
  Modify,
  Delete,
  Rename,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FsEventRecord {
  pub id: String,
  pub occurred_at: String,
  pub event_type: EventType,
  pub full_path: String,
  pub base_path_id: String,
  pub rule_id: Option<String>,
  pub size_before: Option<i64>,
  pub size_after: Option<i64>,
  pub process_name: Option<String>,
  pub username: Option<String>,
  pub important: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListEventsQuery {
  pub limit: Option<u32>,
  pub cursor: Option<String>,
  pub base_path_ids: Option<Vec<String>>,
  pub event_types: Option<Vec<EventType>>,
  pub path_contains: Option<String>,
  pub extensions: Option<Vec<String>>,
  pub min_size: Option<i64>,
  pub max_size: Option<i64>,
  pub start_time: Option<String>,
  pub end_time: Option<String>,
  pub sort: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListEventsResult {
  pub items: Vec<FsEventRecord>,
  pub next_cursor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverviewStats {
  pub total: u64,
  pub per_type: Vec<(EventType, u64)>,
  pub per_minute: Vec<(String, u64)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
  pub retain_days: u32,
  pub max_events: u32,
  pub batch_interval_ms: u32,
  pub important_globs: Vec<String>,
  pub system_notifications_enabled: bool,
}

