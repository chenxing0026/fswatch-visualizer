import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import Dashboard from "@/pages/Dashboard";
import Events from "@/pages/Events";
import EventDetails from "@/pages/EventDetails";
import WatchConfig from "@/pages/WatchConfig";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <Router>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/watch" element={<WatchConfig />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </Router>
  );
}
