export const CompactWhirlwind = () => {
  const tasks = [
    { id: 1, title: "Review PR #123", category: "Code" },
    { id: 2, title: "Update documentation", category: "Docs" },
    { id: 3, title: "Prepare weekly report", category: "Admin" },
    { id: 4, title: "Client call follow-up", category: "Sales" },
    { id: 5, title: "Fix bug in auth flow", category: "Code" },
  ];

  return (
    <div className="glass-surface p-4 rounded-lg flex flex-col gap-2 w-full max-w-md">
      <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Whirlwind</h3>
      <div className="flex flex-col gap-2">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-3 p-2 rounded bg-white/5 border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-sm font-mono text-white truncate">{task.title}</span>
            <span className="text-[10px] text-muted ml-auto uppercase">{task.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
