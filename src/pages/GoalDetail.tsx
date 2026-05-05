import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  useGoal, 
  useGoalStats, 
  useNarrativeLogs, 
  useGoalTasks,
  useUpdateGoalProgress,
  useArchiveGoal,
  useDeleteGoal,
  useAddManualNarrativeLog
} from "../db/goalHooks";
import { useSessionStore } from "../stores/sessionStore";
import { useTimerStore } from "../stores/timerStore";
import { Button } from "../components/ui/button";
import { 
  MoreHorizontal, 
  Play, 
  Archive, 
  Trash2, 
  ChevronLeft,
  Send,
  Calendar
} from "lucide-react";

interface GoalDetailProps {
  goalId: string;
  onBack: () => void;
}

export function GoalDetail({ goalId, onBack }: GoalDetailProps) {
  const { data: goal, isLoading: goalLoading } = useGoal(goalId);
  const { data: stats } = useGoalStats(goalId);
  const { data: logs } = useNarrativeLogs(goalId);
  const { data: tasks } = useGoalTasks(goalId);

  const updateProgress = useUpdateGoalProgress();
  const archiveGoal = useArchiveGoal();
  const deleteGoal = useDeleteGoal();
  const addLog = useAddManualNarrativeLog();

  const setSessionGoal = useSessionStore((state) => state.setGoal);
  const startTimer = useTimerStore((state) => state.start);

  const [manualLog, setManualLog] = useState("");
  const [showActions, setShowActions] = useState(false);

  if (goalLoading || !goal) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  const handleStartFocus = () => {
    setSessionGoal(goal.id);
    startTimer();
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    updateProgress.mutate({ id: goal.id, progressPercent: value });
  };

  const handleSubmitLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLog.trim()) return;
    addLog.mutate({ goalId: goal.id, content: manualLog });
    setManualLog("");
  };

  const handleArchive = async () => {
    if (confirm("Archive this goal?")) {
      await archiveGoal.mutateAsync(goal.id);
      onBack();
    }
  };

  const handleDelete = async () => {
    if (confirm("Permanently delete this goal? This cannot be undone.")) {
      await deleteGoal.mutateAsync(goal.id);
      onBack();
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg text-white font-sans selection:bg-accent/30">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted hover:text-white"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col">
            <nav className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted">
              <span className="cursor-pointer hover:text-white" onClick={onBack}>Goals</span>
              <span>/</span>
              <span className="text-white/40">{goal.title}</span>
            </nav>
            <h1 className="text-xl font-bold tracking-tight">{goal.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={handleStartFocus}
            className="bg-accent text-black hover:bg-accent/90 flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all hover:scale-105 active:scale-95"
          >
            <Play size={16} fill="currentColor" />
            Start Focus Session
          </Button>

          <div className="relative">
            <button 
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted hover:text-white"
            >
              <MoreHorizontal size={20} />
            </button>
            
            {showActions && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setShowActions(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-surface border border-white/10 rounded-xl shadow-2xl z-30 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150">
                  <button 
                    onClick={handleArchive}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-muted hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Archive size={16} />
                    Archive Goal
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-danger/80 hover:text-danger hover:bg-danger/5 transition-colors"
                  >
                    <Trash2 size={16} />
                    Delete Goal
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane (Narrative) */}
        <div className="w-[60%] flex flex-col border-r border-white/5 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-12 py-8 space-y-12 scrollbar-thin">
            {/* Description */}
            <section className="space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-muted">Strategic Narrative</h2>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>
                  {goal.description || "_No description provided._"}
                </ReactMarkdown>
              </div>
            </section>

            {/* Logs */}
            <section className="space-y-6">
              <h2 className="text-xs font-mono uppercase tracking-widest text-muted">Execution Logs</h2>
              <div className="space-y-6 pb-12">
                {logs?.map((log) => (
                  <div key={log.id} className="group relative pl-6 border-l border-white/10 space-y-2">
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-white/20 group-hover:bg-accent transition-colors" />
                    <div className="flex items-center gap-3 text-[10px] font-mono text-muted uppercase tracking-wider">
                      <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {log.session_id && (
                        <>
                          <span>•</span>
                          <span className="text-accent/60">Focus Session</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                      {log.content}
                    </p>
                  </div>
                ))}
                {(!logs || logs.length === 0) && (
                  <p className="text-sm text-muted italic">No logs recorded yet.</p>
                )}
              </div>
            </section>
          </div>

          {/* Manual Entry */}
          <div className="p-8 border-t border-white/5 bg-black/40 backdrop-blur-sm">
            <form onSubmit={handleSubmitLog} className="relative">
              <textarea 
                value={manualLog}
                onChange={(e) => setManualLog(e.target.value)}
                placeholder="Log progress or reflections..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-accent/50 transition-all resize-none min-h-[100px] pr-12"
              />
              <button 
                type="submit"
                disabled={!manualLog.trim()}
                className="absolute right-4 bottom-4 p-2 bg-accent text-black rounded-xl disabled:opacity-30 disabled:grayscale transition-all hover:scale-105 active:scale-95"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>

        {/* Right Pane (Metrics) */}
        <div className="w-[40%] overflow-y-auto bg-black/20 px-8 py-10 space-y-12 scrollbar-thin">
          {/* Progress Slider */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-widest text-muted">Progress</h2>
              <span className="text-2xl font-bold font-mono text-accent">{goal.progress_percent}%</span>
            </div>
            
            <div className="relative h-12 flex items-center">
              <input 
                type="range"
                min="0"
                max="100"
                value={goal.progress_percent}
                onChange={handleProgressChange}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-accent hover:accent-accent/80 transition-all"
                style={{
                  background: `linear-gradient(to right, var(--color-accent) ${goal.progress_percent}%, #333 ${goal.progress_percent}%)`
                }}
              />
            </div>
            <p className="text-[10px] text-muted text-center uppercase tracking-tighter">
              Slide to manually adjust objective completion
            </p>
          </section>

          {/* Execution Velocity */}
          <section className="space-y-6">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted">Execution Velocity</h2>
            <div className="h-48 w-full font-mono text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#666" 
                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#666" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    unit="m"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '10px' }}
                    cursor={{ fill: '#ffffff05' }}
                  />
                  <Bar dataKey="total_minutes" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-muted uppercase">
              <span>Past 14 Days</span>
              <span>Daily Focus Minutes</span>
            </div>
          </section>

          {/* Linked Tasks */}
          <section className="space-y-6">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted">Linked Tasks</h2>
            <div className="space-y-3">
              {tasks?.map((task) => (
                <div key={task.ms_task_id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-green-500' : 'bg-accent/40'}`} />
                    <span className={`text-sm ${task.status === 'completed' ? 'text-muted line-through' : 'text-white/90'}`}>
                      {task.title}
                    </span>
                  </div>
                  {task.due_date && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted">
                      <Calendar size={10} />
                      {new Date(task.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
              {(!tasks || tasks.length === 0) && (
                <div className="p-8 rounded-xl border border-dashed border-white/5 text-center">
                  <p className="text-xs text-muted">No tasks linked to this goal.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
