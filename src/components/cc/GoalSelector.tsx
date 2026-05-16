import { useGoals } from "../../db/goalHooks";
import { useSessionStore } from "../../stores/sessionStore";
import { useTimerStore } from "../../stores/timerStore";
import { Target } from "lucide-react";

const GOAL_COLORS = ["#0A84FF", "#30D158", "#BF5AF2", "#FF9500", "#FF2D55"];

export const GoalSelector = () => {
  const { data: goals = [] } = useGoals();
  const linkedGoalId = useSessionStore((s) => s.linkedGoalId);
  const setGoal = useSessionStore((s) => s.setGoal);
  const status = useTimerStore((s) => s.status);

  const isActive = status === "ACTIVE" || status === "PAUSED";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="text-sm font-bold tracking-[0.12em] text-white/60 uppercase"
        style={{ marginBottom: 16, flexShrink: 0 }}
      >
        {isActive ? "Working On" : "Goal"}
      </div>

      <div className="flex flex-col overflow-y-auto no-scrollbar" style={{ gap: 2 }}>
        {goals.length > 0 ? (
          goals.map((goal, i) => {
            const isLinked = linkedGoalId === goal.id;
            const color = GOAL_COLORS[i % GOAL_COLORS.length];
            return (
              <button
                key={goal.id}
                onClick={() => setGoal(isLinked ? null : goal.id)}
                className="flex items-center text-left w-full transition-all duration-150"
                style={{
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 8,
                  background: isLinked ? "rgba(255,255,255,0.08)" : "transparent",
                  border: isLinked ? `1px solid ${color}40` : "1px solid transparent",
                  cursor: "pointer",
                  color: "inherit",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: isLinked ? color : "rgba(255,255,255,0.15)",
                    flexShrink: 0,
                    boxShadow: isLinked ? `0 0 6px ${color}60` : "none",
                    transition: "all 150ms",
                  }}
                />
                <span
                  className="text-sm truncate flex-1 min-w-0 transition-colors duration-150"
                  style={{ color: isLinked ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)" }}
                >
                  {goal.title}
                </span>
              </button>
            );
          })
        ) : (
          <div className="flex items-center" style={{ gap: 6, padding: "4px 0" }}>
            <Target size={11} style={{ color: "#3A3A3C" }} />
            <span className="text-sm text-white/25 italic">No goals yet</span>
          </div>
        )}
      </div>
    </div>
  );
};
