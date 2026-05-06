import { useCachedTasks, useCompleteTask } from "../../db/taskHooks";

export const CompactWhirlwind = () => {
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
    const date = new Date(dueDate);
    const now = new Date();
    if (date < now) return { label: "late", color: "text-danger bg-danger/10" };
    
    const diff = date.getTime() - now.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days <= 1) return { label: "soon", color: "text-orange-400 bg-orange-400/10" };
    
    return null;
  };

  if (isLoading) {
    return <div className="h-full w-full animate-pulse" />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-[9px] font-bold tracking-[0.12em] text-[#3A3A3C] uppercase mb-2">Whirlwind</div>
      <div className="flex flex-col">
        {sortedTasks.length > 0 ? (
          sortedTasks.map((task) => {
            const dueStatus = getDueStatus(task.due_date);

            return (
              <div key={task.ms_task_id} className="flex items-center gap-2 py-1 border-b border-white/[0.03] last:border-0 group">
                <button 
                  onClick={() => completeTaskMutation.mutate({ taskId: task.ms_task_id, listId: task.list_id || "" })}
                  className="w-3 h-3 rounded-full border-[1.5px] border-white/15 shrink-0 hover:bg-white/10 transition-colors"
                />
                <div className="text-[11px] text-white/45 overflow-hidden text-ellipsis whitespace-nowrap flex-1 group-hover:text-white/70 transition-colors">
                  {task.title}
                </div>
                {dueStatus && (
                  <div className={`text-[9px] font-mono px-1.5 rounded-full shrink-0 ${dueStatus.color}`}>
                    {dueStatus.label}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-[10px] text-white/30 italic py-2">No active tasks</div>
        )}
      </div>
    </div>
  );
};
