export const GoalStatsPanel = () => {
  return (
    <div className="glass-surface p-4 rounded-lg flex flex-col gap-2 w-64 h-32">
      <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Goal Stats</h3>
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div>
          <div className="text-2xl font-mono text-accent">140</div>
          <div className="text-[10px] text-muted uppercase">Focus Mins</div>
        </div>
        <div>
          <div className="text-2xl font-mono text-accent">12</div>
          <div className="text-[10px] text-muted uppercase">Day Streak</div>
        </div>
      </div>
    </div>
  );
};
