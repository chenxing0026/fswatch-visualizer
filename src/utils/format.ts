import type { EventType, FsEventRecord } from "../../shared/types";

export function formatBytes(bytes?: number) {
  if (bytes === undefined || bytes === null) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"] as const;
  let v = bytes / 1024;
  let idx = 0;
  while (v >= 1024 && idx < units.length - 1) {
    v /= 1024;
    idx += 1;
  }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[idx]}`;
}

export function formatIsoMinute(isoMinute: string) {
  return isoMinute.replace("T", " ");
}

export function eventTypeLabel(t: EventType) {
  switch (t) {
    case "create":
      return "创建";
    case "modify":
      return "修改";
    case "delete":
      return "删除";
    case "rename":
      return "重命名";
  }
}

export function shortPath(p: string) {
  const parts = p.split(/[\\/]/).filter(Boolean);
  if (parts.length <= 3) return p;
  return `${parts.slice(0, 1).join("/")}/…/${parts.slice(-2).join("/")}`;
}

export function deriveDelta(e: FsEventRecord) {
  if (e.sizeBefore === undefined || e.sizeAfter === undefined) return undefined;
  return e.sizeAfter - e.sizeBefore;
}

