use std::{
  path::PathBuf,
  sync::{Mutex},
};

use tauri::Manager;

mod commands;
mod db;
mod models;
mod watcher;

pub struct AppState {
  pub db_path: PathBuf,
  pub watcher: Mutex<Option<watcher::WatcherHandle>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {}", e))?;
      std::fs::create_dir_all(&app_data).map_err(|e| format!("create app dir: {}", e))?;
      let db_path = app_data.join("fswatch.db");
      let conn = db::open_db(&db_path).map_err(|e| e.to_string())?;
      db::init_db(&conn).map_err(|e| e.to_string())?;
      app.manage(AppState {
        db_path,
        watcher: Mutex::new(None),
      });
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::list_watched_paths,
      commands::upsert_watched_path,
      commands::list_rules,
      commands::upsert_rule,
      commands::get_settings,
      commands::set_settings,
      commands::list_events,
      commands::get_event,
      commands::get_overview,
      commands::start_watch,
      commands::stop_watch,
      commands::export_events,
      commands::open_in_folder,
    ])
    .on_window_event(|_window, event| {
      if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

