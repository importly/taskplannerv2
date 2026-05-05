
export const CalendarFeed = () => {
  return (
    <div className="glass-surface p-4 rounded-lg flex flex-col gap-2 w-full max-w-md">
      <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Calendar Feed</h3>
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <div className="w-1 bg-accent rounded" />
          <div>
            <div className="text-sm font-mono text-white">Daily Standup</div>
            <div className="text-[10px] text-muted">09:00 - 09:15</div>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="w-1 bg-border rounded" />
          <div>
            <div className="text-sm font-mono text-white opacity-50">Email Triage</div>
            <div className="text-[10px] text-muted">08:00 - 08:30 (Done)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
