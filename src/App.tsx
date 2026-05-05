import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initDb } from "./db";
import { useEnforcer } from "./hooks/useEnforcer";
import { ReflectionModal } from "./components/timer/ReflectionModal";
import CommandCenter from "./pages/CommandCenter";
import GoalsDashboard from "./pages/GoalsDashboard";
import Whirlwind from "./pages/Whirlwind";

const queryClient = new QueryClient();

type Page = "command-center" | "goals" | "whirlwind";

function AppShell() {
  useEnforcer();
  const [page, setPage] = useState<Page>("command-center");
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initDb()
      .then(() => setDbReady(true))
      .catch((e: unknown) => setDbError(String(e)));
  }, []);

  if (dbError) {
    return (
      <div style={{ color: "#FF3B30", padding: 24, fontFamily: "monospace" }}>
        DB init failed: {dbError}
      </div>
    );
  }

  if (!dbReady) return null;

  return (
    <div className="flex h-screen bg-[#000000] text-white overflow-hidden font-sans">
      <nav className="flex flex-col gap-2 p-6 border-r border-white/5 min-w-[160px] bg-[#050505]">
        <div className="mb-8 px-2">
          <div className="text-accent font-bold tracking-tighter text-xl">PROXIMA</div>
          <div className="text-[10px] text-muted font-mono uppercase tracking-[0.2em]">v2.0.0-alpha</div>
        </div>

        <NavButton 
          active={page === "command-center"} 
          onClick={() => setPage("command-center")}
          label="Command"
        />
        <NavButton 
          active={page === "goals"} 
          onClick={() => setPage("goals")}
          label="Strategic Goals"
        />
        <NavButton 
          active={page === "whirlwind"} 
          onClick={() => setPage("whirlwind")}
          label="Whirlwind"
        />
      </nav>
      <main className="flex-1 overflow-auto bg-[#000000]">
        {page === "command-center" && <CommandCenter />}
        {page === "goals" && <GoalsDashboard />}
        {page === "whirlwind" && <Whirlwind />}
      </main>
      <ReflectionModal />
    </div>
  );
}

function NavButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-left rounded-lg transition-all duration-200 text-sm font-medium
        ${active 
          ? "bg-accent/10 text-accent border border-accent/20 shadow-[0_0_15px_rgba(225,255,0,0.1)]" 
          : "text-muted hover:text-white hover:bg-white/5 border border-transparent"
        }`}
    >
      {label}
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
