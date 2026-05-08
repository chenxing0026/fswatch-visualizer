import { Link } from "react-router-dom";

import type { FsEventRecord } from "../../shared/types";
import { deriveDelta, formatBytes, shortPath } from "@/utils/format";
import EventTypePill from "@/components/EventTypePill";

export default function EventTable({ items }: { items: FsEventRecord[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800/70">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-zinc-950">
            <tr className="border-b border-zinc-800/70 text-left text-xs text-zinc-400">
              <th className="px-3 py-2">时间</th>
              <th className="px-3 py-2">类型</th>
              <th className="px-3 py-2">路径</th>
              <th className="px-3 py-2">大小</th>
              <th className="px-3 py-2">变化</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const delta = deriveDelta(it);
              return (
                <tr
                  key={it.id}
                  className={
                    "border-b border-zinc-900/60 hover:bg-zinc-900/40 " +
                    (it.important ? "bg-red-500/5" : "")
                  }
                >
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-400">
                    {it.occurredAt.replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="px-3 py-2">
                    <EventTypePill type={it.eventType} />
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      to={`/events/${it.id}`}
                      className="font-mono text-xs text-zinc-200 hover:underline"
                      title={it.fullPath}
                    >
                      {shortPath(it.fullPath)}
                    </Link>
                    {it.important ? (
                      <span className="ml-2 rounded bg-red-500/15 px-2 py-0.5 text-[11px] text-red-200 ring-1 ring-red-500/30">
                        重要
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-300">
                    {formatBytes(it.sizeAfter)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                    {delta === undefined ? (
                      <span className="text-zinc-500">-</span>
                    ) : delta === 0 ? (
                      <span className="text-zinc-400">0</span>
                    ) : delta > 0 ? (
                      <span className="text-emerald-300">+{formatBytes(delta)}</span>
                    ) : (
                      <span className="text-red-200">-{formatBytes(Math.abs(delta))}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

