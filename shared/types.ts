export type EventType = "create" | "modify" | "delete" | "rename";

export type SortMode = "time_desc" | "time_asc";

export interface WatchedPath {
  id: string;
  path: string;
  recursive: boolean;
  enabled: boolean;
  createdAt: string;
}

export interface WatchRule {
  id: string;
  includeGlobs: string[];
  excludeGlobs: string[];
  eventTypes: EventType[];
  enabled: boolean;
  createdAt: string;
}

export interface FsEventRecord {
  id: string;
  occurredAt: string;
  eventType: EventType;
  fullPath: string;
  basePathId: string;
  ruleId?: string;
  sizeBefore?: number;
  sizeAfter?: number;
  processName?: string;
  username?: string;
  important: boolean;
}

export interface ListEventsQuery {
  limit?: number;
  cursor?: string;
  basePathIds?: string[];
  eventTypes?: EventType[];
  pathContains?: string;
  extensions?: string[];
  minSize?: number;
  maxSize?: number;
  startTime?: string;
  endTime?: string;
  sort?: SortMode;
}

export interface ListEventsResult {
  items: FsEventRecord[];
  nextCursor?: string;
}

export interface OverviewStats {
  total: number;
  perType: Array<[EventType, number]>;
  perMinute: Array<[string, number]>;
}

export interface AppSettings {
  retainDays: number;
  maxEvents: number;
  batchIntervalMs: number;
  importantGlobs: string[];
  systemNotificationsEnabled: boolean;
}

