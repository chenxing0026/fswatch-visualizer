import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Copy, FolderOpen } from "lucide-react";

import EventTypePill from "@/components/EventTypePill";
import { backendGetEvent, backendOpenInFolder } from "@/utils/backend";
import { formatBytes } from "@/utils/format";
import type { FsEventRecord } from "../../shared/types";

export default function EventDetails() {
  const { id } = useParams();
  const [item, setItem] = useState<FsEventRecord | null>(null);

  useEffect(() => {
    if (!id) return;
    backendGetEvent(id).then((r) => {
      setItem(r ?? null);
    });
  }, [id]);

  const delta = useMemo(() => {
    if (!item || item.sizeBefore === undefined || item.sizeAfter === undefined) return undefined;
    return item.sizeAfter - item.sizeBefore;
  }, [item]);

  if (!id) {
    return <div className="text-sm text-zinc-400">缺少事件 ID</div>;
  }

  if (!item) {
    return (
      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950 p-4">
        <div className="animate-pulse text-sm text-zinc-400">加载中…</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">事件详情</div>
        <div className="mt-1 text-sm text-zinc-400">{item.id}</div>
      </div>

      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <EventTypePill type={item.eventType} />
            {item.important ? (
              <span className="rounded bg-red-500/15 px-2 py-1 text-xs text-red-200 ring-1 ring-red-500/30">
                重要告警
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 hover:bg-zinc-800"
              onClick={async () => {
                await navigator.clipboard.writeText(item.fullPath);
              }}
            >
              <Copy className="h-4 w-4" />
              复制路径
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-900"
              onClick={async () => {
                await backendOpenInFolder(item.fullPath);
              }}
            >
              <FolderOpen className="h-4 w-4" />
              打开位置
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs text-zinc-400">发生时间</div>
            <div className="mt-1 font-mono text-sm">{item.occurredAt}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">完整路径</div>
            <div className="mt-1 break-all font-mono text-sm">{item.fullPath}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">大小</div>
            <div className="mt-1 text-sm text-zinc-200">
              {formatBytes(item.sizeAfter)}
              {delta !== undefined ? (
                <span className="ml-2 text-xs text-zinc-400">（变化 {delta > 0 ? "+" : ""}{formatBytes(delta)}）</span>
              ) : null}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">监听目录 ID</div>
            <div className="mt-1 font-mono text-sm">{item.basePathId}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

