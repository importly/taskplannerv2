import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initDb } from "./db";
import { useEnforcer } from "./hooks/useEnforcer";
import { ReflectionModal } from "./components/timer/ReflectionModal";
import { SettingsModal } from "./components/settings/SettingsModal";
import { Settings, Minus, Square, X } from "lucide-react";
import CommandCenter from "./pages/CommandCenter";
import GoalsDashboard from "./pages/GoalsDashboard";
import Whirlwind from "./pages/Whirlwind";
import Stats from "./pages/Stats";

const queryClient = new QueryClient();
type Page = "command-center" | "goals" | "whirlwind" | "stats";

function AppShell() {
  useEnforcer();
  const [page, setPage] = useState<Page>("command-center");
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initDb()
      .then(() => setDbReady(true))
      .catch((e: unknown) => setDbError(String(e)));
  }, []);

  // Wire drag after nav mounts
  useEffect(() => {
    if (!dbReady) return;
    const el = dragRef.current;
    if (!el) return;
    const onMouseDown = (e: MouseEvent) => {
      if (e.buttons === 1) invoke("start_drag");
    };
    el.addEventListener("mousedown", onMouseDown);
    return () => el.removeEventListener("mousedown", onMouseDown);
  }, [dbReady]);

  if (dbError) {
    return (
      <div style={{ color: "#FF3B30", padding: 24, fontFamily: "monospace" }}>
        DB init failed: {dbError}
      </div>
    );
  }

  if (!dbReady) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#000", color: "#fff", overflow: "hidden", fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      {/* Titlebar */}
      <nav style={{ display: "flex", alignItems: "center", height: 44, padding: "0 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, gap: 6 }}>
        <div style={{ display: "flex", gap: 2 }}>
          {(["command-center", "goals", "stats", "whirlwind"] as Page[]).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                background: page === p ? "rgba(255,255,255,0.07)" : "transparent",
                color: page === p ? "#fff" : "rgba(255,255,255,0.4)",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color 200ms ease, background 200ms ease",
                transform: page === p ? "scale(1)" : "scale(0.97)",
              }}
            >
              {p === "command-center" ? "Focus" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Drag zone */}
        <div ref={dragRef} style={{ flex: 1, alignSelf: "stretch", cursor: "grab" }} />

        {/* Settings */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          style={{ padding: 6, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center" }}
        >
          <Settings size={15} />
        </button>

        {/* Window controls */}
        <div style={{ display: "flex", gap: 2, marginLeft: 4 }}>
          <WinBtn icon={<Minus size={11} />} title="Minimize" onClick={() => invoke("minimize_window")} />
          <WinBtn icon={<Square size={11} />} title="Maximize" onClick={() => invoke("toggle_maximize_window")} />
          <WinBtn icon={<X size={11} />} title="Close" onClick={() => invoke("close_window")} danger />
        </div>
      </nav>

      <main className="no-scrollbar" style={{ flex: 1, overflow: page === "command-center" ? "hidden" : "auto", background: "#000", padding: 0 }}>
        <div key={page} style={{ height: "100%", animation: "page-enter 220ms cubic-bezier(0.22, 1, 0.36, 1) forwards" }}>
          {page === "command-center" && <CommandCenter />}
          {page === "goals" && <GoalsDashboard />}
          {page === "whirlwind" && <Whirlwind />}
          {page === "stats" && <Stats />}
        </div>
      </main>

      <ReflectionModal />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

function WinBtn({ icon, onClick, danger, title }: { icon: React.ReactNode; onClick: () => void; danger?: boolean; title?: string }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 28, height: 28, borderRadius: 6,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: hov ? (danger ? "rgba(255,59,48,0.2)" : "rgba(255,255,255,0.08)") : "transparent",
        color: hov ? (danger ? "#FF3B30" : "#fff") : "rgba(255,255,255,0.25)",
        border: "none", cursor: "pointer",
      }}
    >
      {icon}
    </button>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
