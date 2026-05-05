import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getActiveAccount, login } from "../services/msalAuth";
import { fetchTodoLists } from "../services/msGraphService";
import { 
  useCachedTasks, 
  useSyncTasks, 
  useCompleteTask, 
  useCreateTask, 
  useLinkTaskToGoal 
} from "../db/taskHooks";
import { useGoals } from "../db/goalHooks";
import { GoalPicker } from "../components/whirlwind/GoalPicker";
import { Button } from "../components/ui/button";
import { RefreshCcw, Plus, Target, Calendar, CheckCircle2, Circle, Loader2 } from "lucide-react";

export default function Whirlwind() {
  const [account, setAccount] = useState<any>(null);
  const [isLinkingTaskId, setIsLinkingTaskId] = useState<string | null>(null);
  
  // Auth state
  useEffect(() => {
    getActiveAccount().then(setAccount);
  }, []);

  const handleLogin = async () => {
    const resp = await login();
    setAccount(resp.account);
  };

  // Queries & Mutations
  const { data: cachedTasks = [], isLoading: isLoadingTasks } = useCachedTasks();
  const { mutate: syncTasks, isPending: isSyncing } = useSyncTasks();
  const { mutate: complete } = useCompleteTask();
  const { mutate: createTask } = useCreateTask();
  const { mutate: linkToGoal } = useLinkTaskToGoal();
  const { data: goals = [] } = useGoals();

  const { data: lists = [], isLoading: isLoadingLists } = useQuery({
    queryKey: ["todoLists"],
    queryFn: fetchTodoLists,
    enabled: !!account,
  });

  // Auto-sync on load
  useEffect(() => {
    if (account) {
      syncTasks();
      const interval = setInterval(() => syncTasks(), 1000 * 60 * 5);
      return () => clearInterval(interval);
    }
  }, [account, syncTasks]);

  // Group tasks by list
  const groupedTasks = useMemo(() => {
    const groups: Record<string, typeof cachedTasks> = {};
    cachedTasks.forEach(task => {
      const lid = task.list_id || "default";
      if (!groups[lid]) groups[lid] = [];
      groups[lid].push(task);
    });
    return groups;
  }, [cachedTasks]);

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center border border-accent/20">
          <RefreshCcw className="w-10 h-10 text-accent" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tighter uppercase">Whirlwind Sync</h1>
          <p className="text-muted max-w-xs mx-auto">Connect your Microsoft account to synchronize your Microsoft To Do tasks.</p>
        </div>
        <Button onClick={handleLogin} className="bg-accent text-black font-black py-6 px-8 rounded-2xl hover:bg-accent/90 transition-all scale-110">
          CONNECT MICROSOFT ACCOUNT
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <header className="flex items-end justify-between border-b border-white/5 pb-8">
        <div>
          <h1 className="text-5xl font-black tracking-tighter uppercase">The Whirlwind</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-muted uppercase tracking-wider">
              {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <div className="w-2 h-2 rounded-full bg-green-500" />}
              {isSyncing ? "Syncing..." : "Synced"}
            </span>
            <span className="text-[10px] font-mono text-muted/50 uppercase tracking-widest">
              Microsoft To Do Integration Active
            </span>
          </div>
        </div>
        <Button 
          onClick={() => syncTasks()} 
          disabled={isSyncing}
          variant="outline" 
          className="border-white/10 hover:bg-white/5 font-bold"
        >
          <RefreshCcw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          FORCE SYNC
        </Button>
      </header>

      {/* Task Lists */}
      <div className="space-y-12">
        {(isLoadingLists || isLoadingTasks) && lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-accent/50" />
            <p className="text-muted font-mono text-[10px] uppercase tracking-widest">Loading Tasks...</p>
          </div>
        ) : lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-50">
            <Calendar className="w-8 h-8 text-muted/20" />
            <p className="text-muted font-mono text-[10px] uppercase tracking-widest">No tasks found</p>
          </div>
        ) : (
          lists.map(list => {
            const tasks = groupedTasks[list.id!] || [];
            return (
              <section key={list.id} className="space-y-4">
                <h2 className="text-sm font-black text-muted uppercase tracking-[0.3em] flex items-center gap-3">
                  {list.displayName}
                  <span className="h-px flex-1 bg-white/5" />
                  <span className="font-mono text-[10px] opacity-40">{tasks.length} tasks</span>
                </h2>

                <div className="grid gap-2">
                  {tasks.map(task => (
                    <TaskRow 
                      key={task.ms_task_id} 
                      task={task} 
                      goals={goals}
                      onComplete={() => complete({ taskId: task.ms_task_id, listId: list.id! })}
                      onLink={() => setIsLinkingTaskId(task.ms_task_id)}
                    />
                  ))}
                  <InlineAdd onAdd={(title) => createTask({ listId: list.id!, title })} />
                </div>
              </section>
            );
          })
        )}
      </div>

      <GoalPicker 
        isOpen={!!isLinkingTaskId} 
        onClose={() => setIsLinkingTaskId(null)}
        currentGoalId={cachedTasks.find(t => t.ms_task_id === isLinkingTaskId)?.linked_goal_id}
        onSelect={(goalId) => {
          if (isLinkingTaskId) {
            linkToGoal({ taskId: isLinkingTaskId, goalId });
          }
        }}
      />
    </div>
  );
}

function TaskRow({ task, goals, onComplete, onLink }: { task: any, goals: any[], onComplete: () => void, onLink: () => void }) {
  const linkedGoal = goals.find(g => g.id === task.linked_goal_id);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  return (
    <div className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 backdrop-blur-sm">
      <button 
        onClick={onComplete}
        className="text-muted/40 hover:text-accent transition-colors"
      >
        <Circle className="w-6 h-6 group-hover:hidden" />
        <CheckCircle2 className="w-6 h-6 hidden group-hover:block" />
      </button>

      <div className="flex-1">
        <div className="font-medium text-white/90 group-hover:text-white transition-colors">{task.title}</div>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {task.due_date && (
            <span className={`flex items-center gap-1 font-mono text-[10px] uppercase font-bold ${isOverdue ? 'text-danger/80' : 'text-muted/60'}`}>
              <Calendar className="w-3 h-3" />
              {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
          {linkedGoal && (
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase font-bold text-accent/60">
              <Target className="w-3 h-3" />
              {linkedGoal.title}
            </span>
          )}
        </div>
      </div>

      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onLink}
        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-accent/10 hover:text-accent"
      >
        <Target className="w-4 h-4" />
      </Button>
    </div>
  );
}

function InlineAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title.trim());
      setTitle("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative mt-2">
      <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
      <input 
        type="text" 
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task..."
        className="w-full bg-transparent border border-dashed border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:border-accent/40 focus:bg-white/[0.02] transition-all"
      />
    </form>
  );
}
