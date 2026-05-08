import ReactECharts from "echarts-for-react";

import type { OverviewStats } from "../../shared/types";
import { formatIsoMinute } from "@/utils/format";

export default function ChartsPanel({ overview }: { overview?: OverviewStats }) {
  const perMinute = overview?.perMinute ?? [];
  const perType = overview?.perType ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950 p-3 lg:col-span-2">
        <div className="px-1 py-1 text-xs text-zinc-400">事件速率（按分钟）</div>
        <ReactECharts
          option={{
            grid: { left: 36, right: 16, top: 24, bottom: 28 },
            xAxis: {
              type: "category",
              data: perMinute.map(([m]) => formatIsoMinute(m)),
              axisLabel: { color: "#a1a1aa", fontSize: 10 },
              axisLine: { lineStyle: { color: "#27272a" } },
            },
            yAxis: {
              type: "value",
              axisLabel: { color: "#a1a1aa", fontSize: 10 },
              splitLine: { lineStyle: { color: "#27272a" } },
            },
            series: [
              {
                type: "line",
                data: perMinute.map(([, c]) => c),
                smooth: true,
                showSymbol: false,
                lineStyle: { color: "#22c55e" },
                areaStyle: { color: "rgba(34,197,94,0.12)" },
              },
            ],
            tooltip: { trigger: "axis" },
            backgroundColor: "transparent",
          }}
          style={{ height: 240 }}
        />
      </div>
      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950 p-3">
        <div className="px-1 py-1 text-xs text-zinc-400">类型分布</div>
        <ReactECharts
          option={{
            tooltip: { trigger: "item" },
            series: [
              {
                type: "pie",
                radius: ["45%", "75%"],
                avoidLabelOverlap: true,
                label: { color: "#e4e4e7", fontSize: 11 },
                labelLine: { lineStyle: { color: "#3f3f46" } },
                data: perType.map(([t, c]) => ({ name: t, value: c })),
              },
            ],
            backgroundColor: "transparent",
          }}
          style={{ height: 240 }}
        />
      </div>
    </div>
  );
}

