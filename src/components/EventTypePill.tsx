import type { EventType } from "../../shared/types";
import { eventTypeLabel } from "@/utils/format";

export default function EventTypePill({ type }: { type: EventType }) {
  const cls =
    type === "create"
      ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
      : type === "delete"
        ? "bg-red-500/15 text-red-200 ring-1 ring-red-500/30"
        : type === "rename"
          ? "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-500/30"
          : "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30";
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs ${cls}`}>{eventTypeLabel(type)}</span>;
}

