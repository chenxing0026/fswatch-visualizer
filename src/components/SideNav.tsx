import { NavLink } from "react-router-dom";
import { Activity, Bell, FolderTree, LayoutDashboard, Settings } from "lucide-react";

const items = [
  { to: "/", label: "总览", icon: LayoutDashboard },
  { to: "/events", label: "事件", icon: Activity },
  { to: "/watch", label: "监控", icon: FolderTree },
  { to: "/settings", label: "设置", icon: Settings },
];

export default function SideNav() {
  return (
    <aside className="w-60 shrink-0 border-r border-zinc-800/70 bg-zinc-950 p-3">
      <div className="flex items-center gap-2 px-2 py-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-zinc-800">
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">FSWatch</div>
          <div className="truncate text-xs text-zinc-400">实时文件变动监控</div>
        </div>
      </div>
      <nav className="mt-2 space-y-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              [
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                isActive
                  ? "bg-zinc-900 text-zinc-50 ring-1 ring-zinc-800"
                  : "text-zinc-300 hover:bg-zinc-900/60 hover:text-zinc-50",
              ].join(" ")
            }
          >
            <it.icon className="h-4 w-4" />
            <span>{it.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-4 rounded-lg border border-zinc-800/60 bg-zinc-950 p-3">
        <div className="text-xs text-zinc-400">提示</div>
        <div className="mt-1 text-xs leading-5 text-zinc-300">
          建议先在“监控”页添加目录，再开始监听。
        </div>
      </div>
    </aside>
  );
}

