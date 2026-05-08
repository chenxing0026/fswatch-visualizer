import { useMemo, useState } from "react";
import { Plus, Save } from "lucide-react";

import { useAppStore } from "@/store/appStore";
import { backendUpsertRule, backendUpsertWatchedPath } from "@/utils/backend";
import type { EventType, WatchedPath, WatchRule } from "../../shared/types";

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Math.random().toString(16).slice(2);
}

export default function WatchConfig() {
  const watchedPaths = useAppStore((s) => s.watchedPaths);
  const setWatchedPaths = useAppStore((s) => s.setWatchedPaths);
  const rules = useAppStore((s) => s.rules);
  const setRules = useAppStore((s) => s.setRules);

  const [newPath, setNewPath] = useState("");
  const [newRecursive, setNewRecursive] = useState(true);

  const [includeGlobs, setIncludeGlobs] = useState("**/*");
  const [excludeGlobs, setExcludeGlobs] = useState("**/node_modules/**\n**/.git/**");
  const [eventTypes, setEventTypes] = useState<EventType[]>(["create", "modify", "delete", "rename"]);

  const enabledCount = useMemo(() => watchedPaths.filter((p) => p.enabled).length, [watchedPaths]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">监控配置</div>
        <div className="mt-1 text-sm text-zinc-400">添加目录、配置递归与过滤规则</div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800/70 bg-zinc-950 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">监听目录</div>
            <div className="text-xs text-zinc-400">已启用：{enabledCount}</div>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 outline-none"
              placeholder="输入目录路径，例如 C:\\Users\\...\\Desktop"
            />
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 hover:bg-zinc-800"
              onClick={async () => {
                const p = newPath.trim();
                if (!p) return;
                const item: WatchedPath = {
                  id: uid(),
                  path: p,
                  recursive: newRecursive,
                  enabled: true,
                  createdAt: nowIso(),
                };
                const saved = await backendUpsertWatchedPath(item);
                setWatchedPaths([saved, ...watchedPaths]);
                setNewPath("");
              }}
            >
              <Plus className="h-4 w-4" />
              添加
            </button>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={newRecursive}
              onChange={(e) => setNewRecursive(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
            />
            递归监听子目录
          </label>

          <div className="mt-4 space-y-2">
            {watchedPaths.length === 0 ? (
              <div className="rounded-lg border border-zinc-800/60 bg-zinc-950 p-3 text-sm text-zinc-400">
                还没有监听目录。
              </div>
            ) : (
              watchedPaths.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/60 bg-zinc-950 p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs text-zinc-200" title={p.path}>
                      {p.path}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">{p.recursive ? "递归" : "非递归"}</div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="text-xs text-zinc-500">启用</span>
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={async (e) => {
                        const next = { ...p, enabled: e.target.checked };
                        await backendUpsertWatchedPath(next);
                        setWatchedPaths(watchedPaths.map((x) => (x.id === p.id ? next : x)));
                      }}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
                    />
                  </label>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800/70 bg-zinc-950 p-4">
          <div className="text-sm font-semibold">过滤规则（全局）</div>
          <div className="mt-1 text-xs text-zinc-400">当前实现为合并规则集，命中 include 且不命中 exclude 即记录</div>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <div className="text-xs text-zinc-400">包含（每行一个 glob）</div>
              <textarea
                value={includeGlobs}
                onChange={(e) => setIncludeGlobs(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md bg-zinc-900 px-3 py-2 font-mono text-xs ring-1 ring-zinc-800 outline-none"
              />
            </div>
            <div>
              <div className="text-xs text-zinc-400">排除（每行一个 glob）</div>
              <textarea
                value={excludeGlobs}
                onChange={(e) => setExcludeGlobs(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md bg-zinc-900 px-3 py-2 font-mono text-xs ring-1 ring-zinc-800 outline-none"
              />
            </div>
            <div>
              <div className="text-xs text-zinc-400">事件类型</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {([
                  ["create", "创建"],
                  ["modify", "修改"],
                  ["delete", "删除"],
                  ["rename", "重命名"],
                ] as const).map(([v, label]) => {
                  const active = eventTypes.includes(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() =>
                        setEventTypes((s) => (active ? s.filter((x) => x !== v) : [...s, v]))
                      }
                      className={
                        "rounded-full px-3 py-1.5 text-xs ring-1 transition " +
                        (active
                          ? "bg-zinc-800 text-zinc-50 ring-zinc-700"
                          : "bg-zinc-950 text-zinc-300 ring-zinc-800 hover:bg-zinc-900")
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 hover:bg-zinc-800"
              onClick={async () => {
                const rule: WatchRule = {
                  id: uid(),
                  includeGlobs: includeGlobs
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  excludeGlobs: excludeGlobs
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  eventTypes,
                  enabled: true,
                  createdAt: nowIso(),
                };
                const saved = await backendUpsertRule(rule);
                setRules([saved, ...rules]);
              }}
            >
              <Save className="h-4 w-4" />
              保存为新规则
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {rules.length === 0 ? (
              <div className="rounded-lg border border-zinc-800/60 bg-zinc-950 p-3 text-sm text-zinc-400">
                还没有规则。默认记录全部事件。
              </div>
            ) : (
              rules.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-zinc-800/60 bg-zinc-950 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-xs text-zinc-300">{r.id}</div>
                    <label className="flex items-center gap-2 text-xs text-zinc-400">
                      启用
                      <input
                        type="checkbox"
                        checked={r.enabled}
                        onChange={async (e) => {
                          const next = { ...r, enabled: e.target.checked };
                          await backendUpsertRule(next);
                          setRules(rules.map((x) => (x.id === r.id ? next : x)));
                        }}
                        className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
                      />
                    </label>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div>
                      <div className="text-xs text-zinc-500">include</div>
                      <div className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-zinc-300">
                        {r.includeGlobs.join("\n") || "(none)"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">exclude</div>
                      <div className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-zinc-300">
                        {r.excludeGlobs.join("\n") || "(none)"}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

