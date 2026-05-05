import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initDb } from "./db";
import { useEnforcer } from "./hooks/useEnforcer";
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
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#0A0A0A",
        color: "#fff",
      }}
    >
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 16,
          borderRight: "1px solid #333",
          minWidth: 120,
        }}
      >
        <button
          onClick={() => setPage("command-center")}
          style={{ background: "none", border: "none", color: page === "command-center" ? "#E1FF00" : "#A1A1AA", cursor: "pointer", textAlign: "left" }}
        >
          Focus
        </button>
        <button
          onClick={() => setPage("goals")}
          style={{ background: "none", border: "none", color: page === "goals" ? "#E1FF00" : "#A1A1AA", cursor: "pointer", textAlign: "left" }}      
        >
          Goals
        </button>
        <button
          onClick={() => setPage("whirlwind")}
          style={{ background: "none", border: "none", color: page === "whirlwind" ? "#E1FF00" : "#A1A1AA", cursor: "pointer", textAlign: "left" }}  
        >
          Tasks
        </button>
      </nav>
      <main style={{ flex: 1, overflow: "auto" }}>
        {page === "command-center" && <CommandCenter />}
        {page === "goals" && <GoalsDashboard />}
        {page === "whirlwind" && <Whirlwind />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
