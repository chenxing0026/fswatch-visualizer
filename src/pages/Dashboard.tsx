import { useEffect, useMemo, useState } from "react";

import ChartsPanel from "@/components/ChartsPanel";
import EventTable from "@/components/EventTable";
import StatCard from "@/components/StatCard";
import { useAppStore } from "@/store/appStore";
import { backendGetOverview } from "@/utils/backend";

export default function Dashboard() {
  const liveEvents = useAppStore((s) => s.liveEvents);
  const overview = useAppStore((s) => s.overview);
  const setOverview = useAppStore((s) => s.setOverview);
  const watchedPaths = useAppStore((s) => s.watchedPaths);
  const [window, setWindow] = useState<"5m" | "1h" | "24h">("1h");

  const enabledCount = useMemo(() => watchedPaths.filter((p) => p.enabled).length, [watchedPaths]);

  useEffect(() => {
    let cancelled = false;
    backendGetOverview(window).then((o) => {
      if (cancelled) return;
      setOverview(o);
    });
    return () => {
      cancelled = true;
    };
  }, [setOverview, window]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">监控总览</div>
          <div className="mt-1 text-sm text-zinc-400">实时事件流 + 统计趋势</div>
        </div>
        <div className="flex items-center gap-2">
          {(["5m", "1h", "24h"] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindow(w)}
              className={
                "rounded-md px-3 py-2 text-sm ring-1 ring-zinc-800 transition " +
                (window === w ? "bg-zinc-800 text-zinc-50" : "bg-zinc-950 text-zinc-300 hover:bg-zinc-900")
              }
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="近窗口事件总数" value={String(overview?.total ?? 0)} hint={`窗口：${window}`} />
        <StatCard label="已启用监听目录" value={String(enabledCount)} hint="仅计算 enabled=true" />
        <StatCard label="实时缓存条数" value={String(liveEvents.length)} hint="用于快速浏览最新事件" />
      </div>

      <ChartsPanel overview={overview} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">最近事件（实时）</div>
          <div className="text-xs text-zinc-400">最多显示 500 条</div>
        </div>
        <EventTable items={liveEvents} />
      </div>
    </div>
  );
}

