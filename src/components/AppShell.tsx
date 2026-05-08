import { useEffect } from "react";

import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";
import {
  backendGetSettings,
  backendListRules,
  backendListWatchedPaths,
  subscribeFsEvents,
  subscribeWatcherError,
} from "@/utils/backend";
import { useAppStore } from "@/store/appStore";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const setWatchedPaths = useAppStore((s) => s.setWatchedPaths);
  const setRules = useAppStore((s) => s.setRules);
  const setSettings = useAppStore((s) => s.setSettings);
  const pushLiveEvents = useAppStore((s) => s.pushLiveEvents);
  const setLastError = useAppStore((s) => s.setLastError);
  const settings = useAppStore((s) => s.settings);

  useEffect(() => {
    let mounted = true;
    Promise.all([backendListWatchedPaths(), backendListRules(), backendGetSettings()]).then(
      ([paths, rules, settings]) => {
        if (!mounted) return;
        setWatchedPaths(paths);
        setRules(rules);
        setSettings(settings);
      },
    );

    let offEvents: (() => void) | undefined;
    let offErr: (() => void) | undefined;

    subscribeFsEvents((items) => {
      pushLiveEvents(items);
      const s = settings ?? useAppStore.getState().settings;
      if (!s?.systemNotificationsEnabled) return;
      const important = items.filter((x) => x.important);
      if (important.length === 0) return;
      if (typeof Notification === "undefined") return;
      const show = () => {
        const top = important[0];
        new Notification("重要文件变动", {
          body: `${top.eventType.toUpperCase()} ${top.fullPath}`,
        });
      };
      if (Notification.permission === "granted") {
        show();
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then((p) => {
          if (p === "granted") show();
        });
      }
    }).then((off) => {
      offEvents = off;
    });

    subscribeWatcherError((msg) => {
      setLastError(msg);
    }).then((off) => {
      offErr = off;
    });

    return () => {
      mounted = false;
      offEvents?.();
      offErr?.();
    };
  }, [pushLiveEvents, setLastError, setRules, setSettings, setWatchedPaths, settings]);

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  );
}

