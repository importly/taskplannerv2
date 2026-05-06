import { useStreak, useGlobalStats } from "../../db/gamificationHooks";
import { useTimerStore } from "../../stores/timerStore";

export const GoalStatsPanel = () => {
  const { data: globalStats } = useGlobalStats();
  const { data: streak } = useStreak();
  const { status } = useTimerStore();

  const totalMins = Math.floor(globalStats?.totalFocusMinutes || 0);

  return (
    <div>
      <div className="text-[9px] font-bold tracking-[0.12em] text-[#3A3A3C] uppercase mb-2">
        {status === "IDLE" ? "Today" : "Linked Goal"}
      </div>

      {status === "IDLE" ? (
        <div className="flex flex-col">
          <div className="py-[5px] border-b border-white/[0.04]">
            <div className="text-[9px] font-mono text-[#48484A]">Focus</div>
            <div className="text-[11px] font-mono text-white/45 mt-[1px]">{totalMins}m</div>
          </div>
          <div className="py-[5px]">
            <div className="text-[9px] font-mono text-[#48484A]">Streak</div>
            <div className={`text-[11px] font-mono mt-[1px] ${streak && streak > 0 ? "text-[#30D158]" : "text-white/40"}`}>
              {streak || 0}d
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="text-[11px] text-white/70 mb-1.5">Current Goal</div>
          <div className="h-[3px] bg-[#1A1A1A] rounded-full overflow-hidden">
            <div className="h-full bg-[#0A84FF] rounded-full" style={{ width: "42%" }} />
          </div>
          <div className="text-[9px] font-mono text-[#48484A] mt-1">42%</div>
        </div>
      )}
    </div>
  );
};
