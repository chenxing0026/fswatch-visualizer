import { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";

import EventTable from "@/components/EventTable";
import { useAppStore } from "@/store/appStore";
import { backendExport, backendListEvents } from "@/utils/backend";
import type { EventType, FsEventRecord, ListEventsQuery, SortMode } from "../../shared/types";

const typeOptions: { value: EventType; label: string }[] = [
  { value: "create", label: "创建" },
  { value: "modify", label: "修改" },
  { value: "delete", label: "删除" },
  { value: "rename", label: "重命名" },
];

export default function Events() {
  const watchedPaths = useAppStore((s) => s.watchedPaths);
  const [items, setItems] = useState<FsEventRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);

  const [pathContains, setPathContains] = useState("");
  const [extensions, setExtensions] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<EventType[]>([]);
  const [selectedBasePathIds, setSelectedBasePathIds] = useState<string[]>([]);
  const [sort, setSort] = useState<SortMode>("time_desc");
  const [window, setWindow] = useState<"5m" | "1h" | "24h" | "custom">("1h");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [minSize, setMinSize] = useState("");
  const [maxSize, setMaxSize] = useState("");

  const basePathOptions = useMemo(
    () => watchedPaths.map((p) => ({ id: p.id, label: p.path })),
    [watchedPaths],
  );

  const load = useCallback(async (reset: boolean) => {
    setBusy(true);
    try {
      const q: ListEventsQuery = {
        limit: 200,
        cursor: reset ? undefined : cursor,
        sort,
        pathContains: pathContains.trim() ? pathContains.trim() : undefined,
        extensions: extensions.trim()
          ? extensions
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        minSize: minSize.trim() ? Number(minSize) : undefined,
        maxSize: maxSize.trim() ? Number(maxSize) : undefined,
        eventTypes: selectedTypes.length ? selectedTypes : undefined,
        basePathIds: selectedBasePathIds.length ? selectedBasePathIds : undefined,
      };

      if (window !== "custom") {
        const now = new Date();
        const start = new Date(now.getTime() - (window === "5m" ? 5 : window === "1h" ? 60 : 1440) * 60_000);
        q.startTime = start.toISOString();
        q.endTime = now.toISOString();
      } else {
        q.startTime = startTime || undefined;
        q.endTime = endTime || undefined;
      }

      const res = await backendListEvents(q);
      setItems(res.items);
      setNextCursor(res.nextCursor);
      if (reset) setCursor(undefined);
    } finally {
      setBusy(false);
    }
  }, [cursor, endTime, extensions, maxSize, minSize, pathContains, selectedBasePathIds, selectedTypes, sort, startTime, window]);

  useEffect(() => {
    load(true);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">事件浏览</div>
          <div className="mt-1 text-sm text-zinc-400">历史检索、筛选与导出</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 hover:bg-zinc-800"
            onClick={async () => {
              const q: ListEventsQuery = {
                limit: 500,
                sort,
                pathContains: pathContains.trim() ? pathContains.trim() : undefined,
                extensions: extensions.trim()
                  ? extensions
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : undefined,
                minSize: minSize.trim() ? Number(minSize) : undefined,
                maxSize: maxSize.trim() ? Number(maxSize) : undefined,
                eventTypes: selectedTypes.length ? selectedTypes : undefined,
                basePathIds: selectedBasePathIds.length ? selectedBasePathIds : undefined,
              };
              const filePath = await backendExport(q, "json");
              if (filePath) {
                alert(`已导出：${filePath}`);
              }
            }}
          >
            <Download className="h-4 w-4" />
            导出 JSON
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-xs text-zinc-400">路径关键词</div>
            <input
              value={pathContains}
              onChange={(e) => setPathContains(e.target.value)}
              className="mt-1 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 outline-none focus:ring-zinc-700"
              placeholder="例如：/src 或 .env"
            />
          </div>
          <div>
            <div className="text-xs text-zinc-400">文件类型（扩展名）</div>
            <input
              value={extensions}
              onChange={(e) => setExtensions(e.target.value)}
              className="mt-1 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 outline-none"
              placeholder="例如：.ts,.json"
            />
          </div>
          <div>
            <div className="text-xs text-zinc-400">时间窗口</div>
            <select
              value={window}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "5m" || v === "1h" || v === "24h" || v === "custom") {
                  setWindow(v);
                }
              }}
              className="mt-1 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 outline-none"
            >
              <option value="5m">近 5 分钟</option>
              <option value="1h">近 1 小时</option>
              <option value="24h">近 24 小时</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-zinc-400">排序</div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="mt-1 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 outline-none"
            >
              <option value="time_desc">时间：新 → 旧</option>
              <option value="time_asc">时间：旧 → 新</option>
            </select>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className="text-xs text-zinc-400">最小大小（bytes）</div>
            <input
              value={minSize}
              onChange={(e) => setMinSize(e.target.value)}
              className="mt-1 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 outline-none"
              placeholder="例如：1024"
            />
          </div>
          <div>
            <div className="text-xs text-zinc-400">最大大小（bytes）</div>
            <input
              value={maxSize}
              onChange={(e) => setMaxSize(e.target.value)}
              className="mt-1 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 outline-none"
              placeholder="例如：1048576"
            />
          </div>
          <div className="md:col-span-2 text-xs text-zinc-500 md:pt-6">
            大小筛选基于记录时的 sizeAfter；删除事件可能为 -。
          </div>
        </div>

        {window === "custom" ? (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs text-zinc-400">开始时间（ISO）</div>
              <input
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 outline-none"
                placeholder="2026-01-01T00:00:00.000Z"
              />
            </div>
            <div>
              <div className="text-xs text-zinc-400">结束时间（ISO）</div>
              <input
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 outline-none"
                placeholder="2026-01-01T12:00:00.000Z"
              />
            </div>
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-xs text-zinc-400">事件类型</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {typeOptions.map((t) => {
                const active = selectedTypes.includes(t.value);
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() =>
                      setSelectedTypes((s) =>
                        active ? s.filter((x) => x !== t.value) : [...s, t.value],
                      )
                    }
                    className={
                      "rounded-full px-3 py-1.5 text-xs ring-1 transition " +
                      (active
                        ? "bg-zinc-800 text-zinc-50 ring-zinc-700"
                        : "bg-zinc-950 text-zinc-300 ring-zinc-800 hover:bg-zinc-900")
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-zinc-400">监听目录</div>
            <select
              multiple
              value={selectedBasePathIds}
              onChange={(e) => {
                const v = Array.from(e.target.selectedOptions).map((o) => o.value);
                setSelectedBasePathIds(v);
              }}
              className="mt-1 h-[90px] w-full rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 outline-none"
            >
              {basePathOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs text-zinc-500">支持按住 Ctrl/Shift 多选</div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => load(true)}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm ring-1 ring-zinc-800 hover:bg-zinc-800 disabled:opacity-50"
          >
            应用筛选
          </button>
          <button
            type="button"
            disabled={busy || !nextCursor}
            onClick={() => {
              if (!nextCursor) return;
              setCursor(nextCursor);
              load(false);
            }}
            className="rounded-md px-4 py-2 text-sm text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-900 disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>

      <EventTable items={items} />
    </div>
  );
}

