import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";

import { useAppStore } from "@/store/appStore";
import { backendGetSettings, backendSetSettings } from "@/utils/backend";
import type { AppSettings } from "../../shared/types";

export default function Settings() {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const [draft, setDraft] = useState<AppSettings | undefined>(settings);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    backendGetSettings().then((s) => {
      setSettings(s);
      setDraft(s);
    });
  }, [setSettings]);

  const importantText = useMemo(
    () => (draft ? draft.importantGlobs.join("\n") : ""),
    [draft],
  );

  if (!draft) {
    return (
      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950 p-4">
        <div className="animate-pulse text-sm text-zinc-400">加载中…</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">应用设置</div>
        <div className="mt-1 text-sm text-zinc-400">保留策略、告警与性能</div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800/70 bg-zinc-950 p-4">
          <div className="text-sm font-semibold">数据保留</div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs text-zinc-400">保留天数</div>
              <input
                type="number"
                value={draft.retainDays}
                onChange={(e) => setDraft({ ...draft, retainDays: Number(e.target.value) })}
                className="mt-1 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 outline-none"
              />
            </div>
            <div>
              <div className="text-xs text-zinc-400">最大事件条数</div>
              <input
                type="number"
                value={draft.maxEvents}
                onChange={(e) => setDraft({ ...draft, maxEvents: Number(e.target.value) })}
                className="mt-1 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 outline-none"
              />
            </div>
          </div>
          <div className="mt-1 text-xs text-zinc-500">当前版本仅保存设置，清理策略在后续迭代实现</div>
        </div>

        <div className="rounded-xl border border-zinc-800/70 bg-zinc-950 p-4">
          <div className="text-sm font-semibold">告警与通知</div>
          <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={draft.systemNotificationsEnabled}
              onChange={(e) => setDraft({ ...draft, systemNotificationsEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
            />
            系统通知（重要变动）
          </label>
          <div className="mt-3">
            <div className="text-xs text-zinc-400">重要路径匹配（glob，每行一个）</div>
            <textarea
              value={importantText}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  importantGlobs: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              rows={6}
              className="mt-1 w-full rounded-md bg-zinc-900 px-3 py-2 font-mono text-xs ring-1 ring-zinc-800 outline-none"
            />
          </div>
        </div>
      </div>

      <div>
        <button
          type="button"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 hover:bg-zinc-800 disabled:opacity-50"
          onClick={async () => {
            setBusy(true);
            try {
              const saved = await backendSetSettings(draft);
              setSettings(saved);
              alert("已保存");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Save className="h-4 w-4" />
          保存设置
        </button>
      </div>
    </div>
  );
}

