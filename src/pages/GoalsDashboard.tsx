import React, { useState } from "react";
import { 
  useGoalsWithStats, 
  useArchivedGoalsWithStats, 
  useGlobalStats, 
  useCreateGoal 
} from "../db/goalHooks";
import { GoalCard } from "../components/goals/GoalCard";
import { Button } from "../components/ui/button";

export default function GoalsDashboard() {
  const { data: activeGoals, isLoading: activeLoading } = useGoalsWithStats();
  const { data: archivedGoals } = useArchivedGoalsWithStats();
  const { data: globalStats } = useGlobalStats();
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

  const focusHoursThisWeek = ((globalStats?.focus_seconds_this_week || 0) / 3600).toFixed(1);

  if (selectedGoalId) {
    // This is a placeholder for Phase 3: Detail View
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <button 
          onClick={() => setSelectedGoalId(null)}
          className="text-muted hover:text-white transition-colors flex items-center gap-2 mb-4"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to Goals
        </button>
        <h1 className="text-4xl font-bold">Goal Detail</h1>
        <p className="text-muted italic">Goal Detail View is coming in Phase 3.</p>
        <p className="text-xs font-mono text-muted/50">ID: {selectedGoalId}</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12 min-h-screen pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight text-white">Goals</h1>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-accent text-black hover:bg-accent/90"
        >
          + New Goal
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatItem 
          label="Focus this week" 
          value={`${focusHoursThisWeek}h`} 
          subValue="Current streak: --" 
        />
        <StatItem 
          label="Active Goals" 
          value={activeGoals?.length.toString() || "0"} 
          subValue="Focused priorities" 
        />
        <StatItem 
          label="Total XP" 
          value="--" 
          subValue="Coming in Sub-project 5" 
        />
      </div>

      {/* Active Goals Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white/90">Active Focus</h2>
        </div>

        {activeLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => <div key={i} className="h-32 rounded-xl bg-white/2 animate-pulse" />)}
          </div>
        ) : (activeGoals?.length || 0) > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeGoals?.map((goal) => (
              <GoalCard
                key={goal.id}
                title={goal.title}
                progress={goal.progress_percent}
                totalFocusTimeSeconds={goal.total_focus_seconds}
                onClick={() => setSelectedGoalId(goal.id)}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-xl border border-dashed border-white/10 text-center space-y-4">
            <p className="text-muted">No active goals found. Start by creating your first objective.</p>
            <Button variant="outline" onClick={() => setIsModalOpen(true)}>Create Goal</Button>
          </div>
        )}
      </section>

      {/* Archived Section */}
      {(archivedGoals?.length || 0) > 0 && (
        <section className="pt-8 border-t border-white/5 space-y-6">
          <button 
            onClick={() => setShowArchived(!showArchived)}
            className="text-sm font-medium text-muted hover:text-white transition-colors flex items-center gap-2"
          >
            {showArchived ? "Hide Archived" : `Show Archived (${archivedGoals?.length})`}
            <svg 
              className={`transition-transform duration-200 ${showArchived ? "rotate-180" : ""}`}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>

          {showArchived && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60">
              {archivedGoals?.map((goal) => (
                <GoalCard
                  key={goal.id}
                  title={goal.title}
                  progress={goal.progress_percent}
                  totalFocusTimeSeconds={goal.total_focus_seconds}
                  onClick={() => {}}
                  isArchived
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* New Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-6">New Strategic Goal</h3>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted">Title</label>
                <input
                  autoFocus
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g., Master Rust Systems Programming"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted">Description (Optional)</label>
                <textarea
                  value={newGoalDescription}
                  onChange={(e) => setNewGoalDescription(e.target.value)}
                  placeholder="Define the success criteria..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent/50 transition-colors resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button"
                  variant="ghost" 
                  onClick={() => setIsModalOpen(false)}
                  className="text-muted hover:text-white"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={!newGoalTitle.trim() || createGoalMutation.isPending}
                  className="bg-accent text-black hover:bg-accent/90 px-8"
                >
                  {createGoalMutation.isPending ? "Creating..." : "Create Goal"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value, subValue }: { label: string; value: string; subValue: string }) {
  return (
    <div className="p-6 rounded-xl bg-white/4 border border-white/8 space-y-1">
      <p className="text-xs font-mono uppercase tracking-widest text-muted">{label}</p>
      <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
      <p className="text-[10px] text-muted/60">{subValue}</p>
    </div>
  );
}
