import { useMemo, useState } from "react";
import { Pause, Play, RotateCcw, TriangleAlert } from "lucide-react";

import { useAppStore } from "@/store/appStore";
import { backendStartWatch, backendStopWatch } from "@/utils/backend";

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "running"
      ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
      : status === "paused"
        ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
        : "bg-zinc-800/60 text-zinc-200 ring-1 ring-zinc-700";
  const label = status === "running" ? "监听中" : status === "paused" ? "已暂停" : "未启动";
  return <span className={`rounded-full px-2.5 py-1 text-xs ${cls}`}>{label}</span>;
}

export default function TopBar() {
  const watchedPaths = useAppStore((s) => s.watchedPaths);
  const watchStatus = useAppStore((s) => s.watchStatus);
  const setWatchStatus = useAppStore((s) => s.setWatchStatus);
  const lastError = useAppStore((s) => s.lastError);
  const setLastError = useAppStore((s) => s.setLastError);
  const clearLiveEvents = useAppStore((s) => s.clearLiveEvents);
  const [busy, setBusy] = useState(false);

  const enabledCount = useMemo(() => watchedPaths.filter((p) => p.enabled).length, [watchedPaths]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/70 bg-zinc-950 px-4">
      <div className="flex items-center gap-3">
        <StatusPill status={watchStatus} />
        <div className="text-xs text-zinc-400">已启用目录：{enabledCount}</div>
        {lastError ? (
          <div className="flex items-center gap-2 rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-200 ring-1 ring-red-500/30">
            <TriangleAlert className="h-3.5 w-3.5" />
            <span className="max-w-[520px] truncate">{lastError}</span>
            <button
              className="ml-2 rounded px-1.5 py-0.5 hover:bg-red-500/10"
              onClick={() => setLastError(undefined)}
              type="button"
            >
              关闭
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy || enabledCount === 0}
          className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 transition hover:bg-zinc-800 disabled:opacity-50"
          onClick={async () => {
            setBusy(true);
            try {
              if (watchStatus === "running") {
                await backendStopWatch();
                setWatchStatus("paused");
              } else {
                await backendStartWatch();
                setWatchStatus("running");
              }
            } finally {
              setBusy(false);
            }
          }}
        >
          {watchStatus === "running" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {watchStatus === "running" ? "暂停" : "开始"}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-300 ring-1 ring-zinc-800 transition hover:bg-zinc-900"
          onClick={() => clearLiveEvents()}
        >
          <RotateCcw className="h-4 w-4" />
          清空实时
        </button>
      </div>
    </header>
  );
}

