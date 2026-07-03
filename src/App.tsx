import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { invoke } from "@tauri-apps/api/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initDb } from "./db";
import { ReflectionModal } from "./components/timer/ReflectionModal";
import { SettingsModal } from "./components/settings/SettingsModal";
import { Settings, Minus, Square, X } from "lucide-react";
import { useCachedTasks } from "./db/taskHooks";
import { setPhoneTasks } from "./stores/timerStore";

// Lazy load pages for better performance
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const GoalsDashboard = lazy(() => import("./pages/GoalsDashboard"));
const Whirlwind = lazy(() => import("./pages/Whirlwind"));
const Stats = lazy(() => import("./pages/Stats"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});
type Page = "command-center" | "goals" | "whirlwind" | "stats";

function AppShell() {
  const [page, setPage] = useState<Page>("command-center");
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Detect mini-player via window width (700px threshold) — source of truth is actual size, not store state
  const [isMini, setIsMini] = useState(() => typeof window !== "undefined" && window.innerWidth <= 700);
  const [navHover, setNavHover] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const miniDragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initDb()
      .then(() => setDbReady(true))
      .catch((e: unknown) => setDbError(String(e)));
  }, []);

  // Track window size to toggle mini-player chrome fade
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 700px)");
    const onChange = (e: MediaQueryListEvent) => setIsMini(e.matches);
    setIsMini(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // When window shrinks below the mini threshold, snap to the timer page —
  // the other pages aren't usable at small widths.
  useEffect(() => {
    if (isMini) setPage("command-center");
  }, [isMini]);

  // Wire drag after nav mounts (covers both the main drag zone and the mini overlay strip)
  useEffect(() => {
    if (!dbReady) return;
    const onMouseDown = (e: MouseEvent) => {
      if (e.buttons === 1) invoke("start_drag");
    };
    const el = dragRef.current;
    const miniEl = miniDragRef.current;
    el?.addEventListener("mousedown", onMouseDown);
    miniEl?.addEventListener("mousedown", onMouseDown);
    return () => {
      el?.removeEventListener("mousedown", onMouseDown);
      miniEl?.removeEventListener("mousedown", onMouseDown);
    };
  }, [dbReady, isMini]);

  if (dbError) {
    return (
      <div style={{ color: "#FF3B30", padding: 24, fontFamily: "var(--font-sans)" }}>
        DB init failed: {dbError}
      </div>
    );
  }

  if (!dbReady) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#000", color: "#fff", overflow: "hidden", fontFamily: "var(--font-sans)", position: "relative" }}>
      {/* Always-on transparent drag strip — keeps window draggable even when nav is faded */}
      {isMini && (
        <div
          ref={miniDragRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 32,
            zIndex: 1,
            pointerEvents: "auto",
            background: "transparent",
            cursor: "grab",
          }}
          onMouseEnter={() => setNavHover(true)}
          onMouseLeave={() => setNavHover(false)}
        />
      )}
      {/* Titlebar — overlays main content when mini, so the black strip fully vanishes on fade */}
      <nav
        onMouseEnter={() => setNavHover(true)}
        onMouseLeave={() => setNavHover(false)}
        style={{
          display: "flex",
          alignItems: "center",
          height: 44,
          padding: "0 12px",
          borderBottom: isMini && !navHover ? "1px solid transparent" : "1px solid rgba(255,255,255,0.06)",
          background: isMini && !navHover ? "transparent" : "#000",
          flexShrink: 0,
          gap: 6,
          opacity: isMini && !navHover ? 0 : 1,
          transition: "opacity 200ms ease, background 200ms ease, border-color 200ms ease",
          position: isMini ? "absolute" : "relative",
          top: isMini ? 0 : undefined,
          left: isMini ? 0 : undefined,
          right: isMini ? 0 : undefined,
          zIndex: 2,
          pointerEvents: isMini && !navHover ? "none" : "auto",
        }}
      >
        {!isMini && (
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
                {p === "command-center" ? "Focus" : p === "whirlwind" ? "Tasks" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Drag zone — expands to fill freed space when tabs/settings are hidden */}
        <div ref={dragRef} style={{ flex: 1, alignSelf: "stretch", cursor: "grab" }} />

        {/* Settings */}
        {!isMini && (
          <button
            onClick={() => setIsSettingsOpen(true)}
            style={{ padding: 6, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center" }}
          >
            <Settings size={15} />
          </button>
        )}

        {/* Window controls */}
        <div style={{ display: "flex", gap: 2, marginLeft: 4 }}>
          <WinBtn icon={<Minus size={11} />} title="Minimize" onClick={() => invoke("minimize_window")} />
          <WinBtn icon={<Square size={11} />} title="Maximize" onClick={() => invoke("toggle_maximize_window")} />
          <WinBtn icon={<X size={11} />} title="Close" onClick={() => invoke("close_window")} danger />
        </div>
      </nav>

      <main className="no-scrollbar" style={{ flex: 1, overflow: page === "command-center" ? "hidden" : "auto", background: "#000", padding: 0 }}>
        <div key={page} style={{ height: "100%", animation: "page-enter 220ms cubic-bezier(0.22, 1, 0.36, 1) forwards" }}>
          <Suspense fallback={<div style={{ height: "100%", background: "#000" }} />}>
            {page === "command-center" && <CommandCenter />}
            {page === "goals" && <GoalsDashboard onStartFocus={() => setPage("command-center")} />}
            {page === "whirlwind" && <Whirlwind />}
            {page === "stats" && <Stats />}
          </Suspense>
        </div>
      </main>

      <PhoneTasksSync />
      <ReflectionModal />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

// Feeds the phone-view WebSocket with the current task list. Mounted only
// after dbReady so the underlying useCachedTasks query has a live DB.
function PhoneTasksSync() {
  const { data: tasks = [] } = useCachedTasks();
  useEffect(() => {
    setPhoneTasks(tasks.slice(0, 5).map(t => t.title));
  }, [tasks]);
  return null;
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
