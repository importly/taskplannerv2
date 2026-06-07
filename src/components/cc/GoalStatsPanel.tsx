import { useStreak, useTodayFocusMinutes } from "../../db/gamificationHooks";
import { useGoals } from "../../db/goalHooks";
import { useTimerStore } from "../../stores/timerStore";
import { useSessionStore } from "../../stores/sessionStore";
import { Target } from "lucide-react";

const GOAL_COLORS = ["#0A84FF", "#30D158", "#BF5AF2", "#FF9500", "#FF2D55"];

export const GoalStatsPanel = () => {
  const { data: todayMins = 0 } = useTodayFocusMinutes();
  const { data: streak } = useStreak();
  const { status } = useTimerStore();
  const linkedGoalId = useSessionStore((s) => s.linkedGoalId);
  const setGoal = useSessionStore((s) => s.setGoal);
  const { data: goals = [] } = useGoals();

  const isActive = status === "ACTIVE" || status === "PAUSED";

  return (
    <div className="flex flex-col" style={{ gap: 0 }}>
      {/* Today stats — always visible */}
      <div className="text-xs font-bold tracking-[0.12em] text-white/40 uppercase" style={{ marginBottom: 10 }}>
        Today
      </div>
      <div className="flex" style={{ gap: 16, marginBottom: 14 }}>
        <div>
          <div className="text-sm text-white/40">Focus</div>
          <div className="text-lg text-white" style={{ marginTop: 2 }}>{todayMins}m</div>
        </div>
        <div style={{ width: 1, background: "rgba(255,255,255,0.06)", alignSelf: "stretch" }} />
        <div>
          <div className="text-sm text-white/40">Streak</div>
          <div className={`text-lg ${streak && streak > 0 ? "text-[#30D158]" : "text-white/60"}`} style={{ marginTop: 2 }}>
            {streak || 0}d
          </div>
        </div>
      </div>

      {/* Goal selector */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
        <div className="text-xs font-bold tracking-[0.12em] text-white/40 uppercase" style={{ marginBottom: 8 }}>
          {isActive ? "Working On" : "Goal"}
        </div>

        {goals.length > 0 ? (
          <div className="flex flex-col" style={{ gap: 4 }}>
            {goals.map((goal, i) => {
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
                  }}
                >
                  <div
                    style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: isLinked ? color : "rgba(255,255,255,0.15)",
                      flexShrink: 0,
                      boxShadow: isLinked ? `0 0 6px ${color}60` : "none",
                      transition: "all 150ms",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[12px] truncate transition-colors duration-150"
                      style={{ color: isLinked ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)" }}
                    >
                      {goal.title}
                    </div>
                    {isLinked && (
                      <div style={{ marginTop: 4 }}>
                        <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "#1A1A1A" }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, goal.progress_percent))}%`, background: color }}
                          />
                        </div>
                        <div className="text-[10px]" style={{ color: "#48484A", marginTop: 3 }}>
                          {goal.progress_percent}%
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center" style={{ gap: 6, padding: "4px 0" }}>
            <Target size={11} style={{ color: "#3A3A3C" }} />
            <span className="text-[11px] text-white/25 italic">No goals yet</span>
          </div>
        )}
      </div>
    </div>
  );
};
