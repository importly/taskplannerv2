export const CalendarNextUp = () => {
  return (
    <div className="glass-surface p-4 rounded-lg flex flex-col gap-2 w-64 h-32">
      <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Upcoming</h3>
      <div className="flex flex-col gap-1">
        <div className="text-sm font-mono text-white">14:00 - Sync Meeting</div>
        <div className="text-xs text-muted">In 25 minutes</div>
      </div>
    </div>
  );
};
