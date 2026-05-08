import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import type {
  AppSettings,
  FsEventRecord,
  ListEventsQuery,
  ListEventsResult,
  OverviewStats,
  WatchedPath,
  WatchRule,
} from "../../shared/types";

export const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

export async function backendListWatchedPaths() {
  if (!isTauri) return [] as WatchedPath[];
  return invoke<WatchedPath[]>("list_watched_paths");
}

export async function backendUpsertWatchedPath(input: WatchedPath) {
  if (!isTauri) return input;
  return invoke<WatchedPath>("upsert_watched_path", { input });
}

export async function backendListRules() {
  if (!isTauri) return [] as WatchRule[];
  return invoke<WatchRule[]>("list_rules");
}

export async function backendUpsertRule(input: WatchRule) {
  if (!isTauri) return input;
  return invoke<WatchRule>("upsert_rule", { input });
}

export async function backendGetSettings() {
  if (!isTauri) {
    const raw = localStorage.getItem("fswatch_settings");
    if (raw) return JSON.parse(raw) as AppSettings;
    return {
      retainDays: 7,
      maxEvents: 200_000,
      batchIntervalMs: 200,
      importantGlobs: ["**/.env", "**/*.pem", "**/*.key", "**/.ssh/**"],
      systemNotificationsEnabled: true,
    };
  }
  return invoke<AppSettings>("get_settings");
}

export async function backendSetSettings(settings: AppSettings) {
  if (!isTauri) {
    localStorage.setItem("fswatch_settings", JSON.stringify(settings));
    return settings;
  }
  return invoke<AppSettings>("set_settings", { settings });
}

export async function backendStartWatch(basePathIds?: string[]) {
  if (!isTauri) return true;
  return invoke<boolean>("start_watch", { basePathIds });
}

export async function backendStopWatch() {
  if (!isTauri) return true;
  return invoke<boolean>("stop_watch");
}

export async function backendListEvents(query: ListEventsQuery) {
  if (!isTauri) return { items: [], nextCursor: undefined } as ListEventsResult;
  return invoke<ListEventsResult>("list_events", { query });
}

export async function backendGetEvent(id: string) {
  if (!isTauri) return undefined;
  return invoke<FsEventRecord | null>("get_event", { id });
}

export async function backendGetOverview(window: "5m" | "1h" | "24h") {
  if (!isTauri) return { total: 0, perType: [], perMinute: [] } as OverviewStats;
  return invoke<OverviewStats>("get_overview", { window });
}

export async function backendExport(query: ListEventsQuery, format: "json" | "csv") {
  if (!isTauri) return "";
  return invoke<string>("export_events", { query, format });
}

export async function backendOpenInFolder(path: string) {
  if (!isTauri) return true;
  return invoke<boolean>("open_in_folder", { path });
}

export async function subscribeFsEvents(onItems: (items: FsEventRecord[]) => void) {
  if (!isTauri) return () => {};
  const unlisten = await listen<FsEventRecord[]>("fs_events", (e) => {
    onItems(e.payload);
  });
  return () => {
    unlisten();
  };
}

export async function subscribeWatcherError(onError: (msg: string) => void) {
  if (!isTauri) return () => {};
  const unlisten = await listen<string>("watcher_error", (e) => {
    onError(e.payload);
  });
  return () => {
    unlisten();
  };
}

