import { create } from "zustand";

import type { AppSettings, FsEventRecord, OverviewStats, WatchedPath, WatchRule } from "../../shared/types";

type WatchStatus = "idle" | "running" | "paused";

interface AppState {
  watchStatus: WatchStatus;
  lastError?: string;

  watchedPaths: WatchedPath[];
  rules: WatchRule[];
  settings?: AppSettings;

  liveEvents: FsEventRecord[];
  overview?: OverviewStats;

  setWatchStatus: (s: WatchStatus) => void;
  setLastError: (msg?: string) => void;
  setWatchedPaths: (items: WatchedPath[]) => void;
  setRules: (items: WatchRule[]) => void;
  setSettings: (s: AppSettings) => void;
  pushLiveEvents: (items: FsEventRecord[]) => void;
  setOverview: (o: OverviewStats) => void;
  clearLiveEvents: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  watchStatus: "idle",
  watchedPaths: [],
  rules: [],
  liveEvents: [],
  setWatchStatus: (watchStatus) => set({ watchStatus }),
  setLastError: (lastError) => set({ lastError }),
  setWatchedPaths: (watchedPaths) => set({ watchedPaths }),
  setRules: (rules) => set({ rules }),
  setSettings: (settings) => set({ settings }),
  pushLiveEvents: (items) =>
    set((s) => {
      const next = [...items, ...s.liveEvents];
      return { liveEvents: next.slice(0, 500) };
    }),
  setOverview: (overview) => set({ overview }),
  clearLiveEvents: () => set({ liveEvents: [] }),
}));

