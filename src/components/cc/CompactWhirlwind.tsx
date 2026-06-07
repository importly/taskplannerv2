import { useCachedTasks, useCompleteTask } from "../../db/taskHooks";

export const CompactTasks = () => {
  const { data: tasks = [], isLoading } = useCachedTasks();
  const completeTaskMutation = useCompleteTask();

  // Sort: Overdue -> Due soon -> No date
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.due_date && b.due_date) return 1;
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && !b.due_date) return a.title.localeCompare(b.title);
    return new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime();
  }).slice(0, 6);

  const getDueStatus = (dueDate: string | null) => {
    if (!dueDate) return null;
    // MS Graph stores date-only due dates as UTC midnight. Compare by calendar day,
    // not by instant, so a task due today is not flagged late before EOD.
    const d = new Date(dueDate);
    const dueDay = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const now = new Date();
    const todayDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const dayDiff = Math.round((dueDay - todayDay) / 86400000);
    if (dayDiff < 0) return { label: "late", color: "text-danger bg-danger/10" };
    if (dayDiff === 0) return { label: "soon", color: "text-orange-400 bg-orange-400/10" };
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="text-sm font-bold tracking-[0.12em] text-white/60 uppercase" style={{ marginBottom: 16 }}>Tasks</div>
        <div className="flex flex-col gap-3 mt-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-6 w-full bg-white/5 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-sm font-bold tracking-[0.12em] text-white/60 uppercase" style={{ marginBottom: 16 }}>Tasks</div>
      <div className="flex flex-col">
        {sortedTasks.length > 0 ? (
          sortedTasks.map((task, i) => {
            const dueStatus = getDueStatus(task.due_date);

            return (
              <div
                key={task.ms_task_id}
                className="flex items-center border-b last:border-0 group"
                style={{
                  gap: 12,
                  padding: "8px 0",
                  borderColor: "rgba(255,255,255,0.03)",
                  animation: "stagger-up 280ms cubic-bezier(0.22, 1, 0.36, 1) both",
                  animationDelay: `${i * 40}ms`,
                }}
              >
                <button 
                  onClick={() => completeTaskMutation.mutate({ taskId: task.ms_task_id, listId: task.list_id || "" })}
                  className="w-5 h-5 rounded-full border-[2px] border-white/30 shrink-0 hover:bg-white/20 transition-colors"
                />
                <div className="text-sm text-white/80 truncate flex-1 min-w-0 group-hover:text-white transition-colors">
                  {task.title}
                </div>
                {dueStatus && (
                  <div className={`text-xs rounded-full shrink-0 ${dueStatus.color}`} style={{ padding: "2px 8px" }}>
                    {dueStatus.label}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-sm text-white/50 italic" style={{ padding: "4px 0" }}>No active tasks</div>
        )}
      </div>
    </div>
  );
};
