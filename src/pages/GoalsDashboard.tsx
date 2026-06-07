import React, { useState } from "react";
import {
  useGoalsWithStats,
  useArchivedGoalsWithStats,
  useGlobalStats,
  useCreateGoal,
} from "../db/goalHooks";
import { useStreak } from "../db/gamificationHooks";
import { GoalCard } from "../components/goals/GoalCard";
import { GoalDetail } from "./GoalDetail";

function formatWeeklyFocus(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export default function GoalsDashboard() {
  const { data: activeGoals, isLoading: activeLoading } = useGoalsWithStats();
  const { data: archivedGoals } = useArchivedGoalsWithStats();
  const { data: globalStats } = useGlobalStats();
  const { data: streak = 0 } = useStreak();
  const createGoalMutation = useCreateGoal();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDescription, setNewGoalDescription] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    await createGoalMutation.mutateAsync({
      title: newGoalTitle,
      description: newGoalDescription || null,
    });
    setNewGoalTitle("");
    setNewGoalDescription("");
    setIsModalOpen(false);
  };

  if (selectedGoalId) {
    return <GoalDetail goalId={selectedGoalId} onBack={() => setSelectedGoalId(null)} />;
  }

  const weeklyFocus = formatWeeklyFocus(globalStats?.focus_seconds_this_week || 0);
  const activeCount = activeGoals?.length || 0;

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Header zone ── */}
      <div
        className="flex justify-between items-end"
        style={{ padding: "36px 40px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div>
          <div className="text-[30px] font-bold tracking-[-0.025em] text-white">
            Goals
          </div>
          <div className="text-[14px]" style={{ marginTop: "4px", color: "#48484A" }}>
            Separate from the whirlwind. What actually moves the needle.
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="font-semibold text-[14px] text-white transition-opacity hover:opacity-80"
          style={{
            background: "#0A84FF",
            borderRadius: 20,
            padding: "8px 18px",
            border: "none",
            cursor: "pointer",
          }}
        >
          + New Goal
        </button>
      </div>

      {/* ── Stats strip zone ── */}
      <div
        className="flex items-center"
        style={{ padding: "28px 40px", borderBottom: "1px solid rgba(255,255,255,0.08)", gap: 40 }}
      >
        <StripStat value={weeklyFocus} label="Focus This Week" />
        <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />
        <StripStat value={String(streak)} label="Day Streak" />
        <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />
        <StripStat value={String(activeCount)} label="Active Goals" />
      </div>

      {/* ── Active goals grid zone ── */}
      <div style={{ padding: "36px 40px 40px" }}>
        <div
          className="text-[10px] font-semibold uppercase"
          style={{ letterSpacing: "0.1em", color: "#3A3A3C", marginBottom: 14 }}
        >
          Active
        </div>

        {activeLoading ? (
          <div className="grid grid-cols-2" style={{ gap: "12px" }}>
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{ height: 130, background: "rgba(255,255,255,0.02)" }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 items-start" style={{ gap: "12px" }}>
            {activeGoals?.map((goal, i) => (
              <div
                key={goal.id}
                style={{
                  animation: "stagger-up 300ms cubic-bezier(0.22, 1, 0.36, 1) both",
                  animationDelay: `${i * 55}ms`,
                }}
              >
                <GoalCard
                  title={goal.title}
                  progress={goal.progress_percent}
                  totalFocusTimeSeconds={goal.total_focus_seconds}
                  colorIndex={i}
                  onClick={() => setSelectedGoalId(goal.id)}
                />
              </div>
            ))}

            {/* New goal placeholder card */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center rounded-[16px] text-[14px] font-medium transition-all duration-200 border border-dashed border-white/10 bg-transparent text-[#48484A] cursor-pointer hover:border-white/20 hover:bg-white/5 hover:text-[#8E8E93] w-full"
              style={{ minHeight: 150, padding: "14px", gap: "8px" }}
            >
              <div className="flex items-center justify-center text-[12px] w-5 h-5 rounded-full border-[1.5px] border-dashed border-inherit text-inherit shrink-0">
                +
              </div>
              New Wildly Important Goal
            </button>
          </div>
        )}
      </div>

      {/* ── Archived section ── */}
      {(archivedGoals?.length || 0) > 0 && (
        <div style={{ padding: "0 40px 40px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center transition-colors"
            style={{
              marginTop: 28,
              marginBottom: 14,
              fontSize: 12,
              fontWeight: 500,
              color: "#48484A",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              gap: "8px",
            }}
          >
            {showArchived ? "Hide Archived" : `Show Archived (${archivedGoals?.length})`}
            <svg
              className={`transition-transform duration-200 ${showArchived ? "rotate-180" : ""}`}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {showArchived && (
            <div className="grid grid-cols-2" style={{ gap: "12px" }}>
              {archivedGoals?.map((goal, i) => (
                <GoalCard
                  key={goal.id}
                  title={goal.title}
                  progress={goal.progress_percent}
                  totalFocusTimeSeconds={goal.total_focus_seconds}
                  colorIndex={i}
                  onClick={() => setSelectedGoalId(goal.id)}
                  isArchived
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── New Goal Modal ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(8px)", padding: 16, animation: "fade-in 150ms ease forwards" }}
        >
          <div
            className="w-full"
            style={{
              maxWidth: 440,
              background: "#111",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 20,
              padding: 24,
              animation: "scale-in 200ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
            }}
          >
            <div className="text-[18px] font-bold text-white" style={{ marginBottom: "24px" }}>New Strategic Goal</div>
            <form onSubmit={handleCreateGoal} className="flex flex-col" style={{ gap: "16px" }}>
              <div className="flex flex-col" style={{ gap: "6px" }}>
                <label
                  className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                  style={{ color: "#3A3A3C" }}
                >
                  Title
                </label>
                <input
                  autoFocus
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g., Master Rust Systems Programming"
                  className="text-white text-[14px] transition-colors focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 10,
                    padding: "9px 14px",
                  }}
                />
              </div>
              <div className="flex flex-col" style={{ gap: "6px" }}>
                <label
                  className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                  style={{ color: "#3A3A3C" }}
                >
                  Description (Optional)
                </label>
                <textarea
                  value={newGoalDescription}
                  onChange={(e) => setNewGoalDescription(e.target.value)}
                  placeholder="Define the success criteria..."
                  rows={3}
                  className="text-white text-[14px] resize-none transition-colors focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 10,
                    padding: "9px 14px",
                  }}
                />
              </div>
              <div className="flex justify-end" style={{ gap: "12px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-[13px] font-medium transition-colors"
                  style={{
                    color: "#48484A",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px 14px",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGoalTitle.trim() || createGoalMutation.isPending}
                  className="text-[13px] font-semibold text-white transition-opacity disabled:opacity-40"
                  style={{
                    background: "#0A84FF",
                    borderRadius: 20,
                    padding: "8px 24px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {createGoalMutation.isPending ? "Creating..." : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StripStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div
        className="font-bold"
        style={{ fontSize: 34, letterSpacing: "-0.03em", color: "#fff" }}
      >
        {value}
      </div>
      <div
        className="font-semibold uppercase"
        style={{ fontSize: 12, letterSpacing: "0.08em", color: "#3A3A3C", marginTop: 4 }}
      >
        {label}
      </div>
    </div>
  );
}
