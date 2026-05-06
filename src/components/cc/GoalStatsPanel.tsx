import { useStreak, useGlobalStats } from "../../db/gamificationHooks";
import { useTimerStore } from "../../stores/timerStore";

export const GoalStatsPanel = () => {
  const { data: globalStats } = useGlobalStats();
  const { data: streak } = useStreak();
  const { status } = useTimerStore();

  const totalMins = Math.floor(globalStats?.totalFocusMinutes || 0);

  return (
    <div>
      <div className="text-xs font-bold tracking-[0.12em] text-white/40 uppercase mb-3">
        {status === "IDLE" ? "Today" : "Linked Goal"}
      </div>

      {status === "IDLE" ? (
        <div className="flex flex-col">
          <div className="py-2 border-b border-white/[0.04]">
            <div className="text-sm font-mono text-white/40">Focus</div>
            <div className="text-xl font-mono text-white mt-1">{totalMins}m</div>
          </div>
          <div className="py-2">
            <div className="text-sm font-mono text-white/40">Streak</div>
            <div className={`text-xl font-mono mt-1 ${streak && streak > 0 ? "text-[#30D158]" : "text-white/60"}`}>
              {streak || 0}d
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="text-base text-white/70 mb-2">Current Goal</div>
          <div className="h-[4px] bg-[#1A1A1A] rounded-full overflow-hidden">
            <div className="h-full bg-[#0A84FF] rounded-full" style={{ width: "42%" }} />
          </div>
          <div className="text-sm font-mono text-[#48484A] mt-2">42%</div>
        </div>
      )}
    </div>
  );
};
