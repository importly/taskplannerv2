import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { acquireMsToken, startMsAuth, disconnectMs } from "../services/msalAuth";
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
import { RefreshCcw, Plus, Target, Loader2 } from "lucide-react";

export default function Whirlwind() {
  const [isLinkingTaskId, setIsLinkingTaskId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: msToken } = useQuery({
    queryKey: ["ms_token"],
    queryFn: acquireMsToken,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchInterval: (query) => (query.state.data ? false : 3000),
  });

  const isAuthenticated = !!msToken;

  const { data: cachedTasks = [] } = useCachedTasks();
  const { mutate: syncTasks, isPending: isSyncing } = useSyncTasks();
  const { mutate: complete } = useCompleteTask();
  const { mutate: createTask } = useCreateTask();
  const { mutate: linkToGoal } = useLinkTaskToGoal();
  const { data: goals = [] } = useGoals();

  const { data: lists = [], isLoading: isLoadingLists } = useQuery({
    queryKey: ["todoLists"],
    queryFn: fetchTodoLists,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isAuthenticated) {
      syncTasks();
      const interval = setInterval(() => syncTasks(), 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, syncTasks]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, typeof cachedTasks> = {};
    cachedTasks.forEach(task => {
      const lid = task.list_id || "default";
      if (!groups[lid]) groups[lid] = [];
      groups[lid].push(task);
    });
    return groups;
  }, [cachedTasks]);

  if (!isAuthenticated) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 32, gap: 20 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(225,255,0,0.06)", border: "1px solid rgba(225,255,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <RefreshCcw size={24} color="#E1FF00" />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 6 }}>Tasks Sync</div>
          <div style={{ fontSize: 12, color: "#48484A" }}>Connect Microsoft account to sync To Do tasks.</div>
        </div>
        <button
          onClick={startMsAuth}
          style={{ padding: "10px 24px", borderRadius: 10, background: "#E1FF00", color: "#000", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", letterSpacing: "0.04em" }}
        >
          CONNECT MICROSOFT ACCOUNT
        </button>
      </div>
    );
  }

  return (
    <div className="no-scrollbar" style={{ padding: "28px 32px", maxWidth: 760, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.025em" }}>Tasks</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => syncTasks()}
            disabled={isSyncing}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 7, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8E8E93", fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em" }}
          >
            <RefreshCcw size={11} style={{ animation: isSyncing ? "spin 1s linear infinite" : "none" }} />
            SYNC
          </button>
          <button
            onClick={async () => {
              await disconnectMs();
              queryClient.setQueryData(["ms_token"], null);
              queryClient.invalidateQueries({ queryKey: ["todoLists"] });
            }}
            style={{ padding: "5px 12px", borderRadius: 7, background: "transparent", border: "1px solid rgba(255,59,48,0.2)", color: "#FF3B30", fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em" }}
          >
            DISCONNECT
          </button>
        </div>
      </div>

      {/* Sync status */}
      <div className="font-mono" style={{ fontSize: 11, color: "#3A3A3C", marginBottom: 24 }}>
        <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: isSyncing ? "#FF9500" : "#30D158", marginRight: 6, verticalAlign: "middle" }} />
        {isSyncing ? "Syncing..." : "Microsoft To Do · synced"}
      </div>

      {/* Lists */}
      {isLoadingLists ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "40px 0", color: "#3A3A3C", fontSize: 12 }}>
          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
          Loading tasks...
        </div>
      ) : lists.length === 0 ? (
        <div style={{ padding: "40px 0", color: "#3A3A3C", fontSize: 12 }}>No task lists found.</div>
      ) : (
        [...lists]
          .sort((a, b) => {
            const aTasksCount = (groupedTasks[a.id!] || []).length;
            const bTasksCount = (groupedTasks[b.id!] || []).length;
            if (aTasksCount > 0 && bTasksCount === 0) return -1;
            if (bTasksCount > 0 && aTasksCount === 0) return 1;
            return 0;
          })
          .map(list => {
          const tasks = groupedTasks[list.id!] || [];
          return (
            <div key={list.id} style={{ marginBottom: 24 }}>
              {/* List header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#48484A", textTransform: "uppercase" }}>
                  {list.displayName}
                </span>
                <span className="font-mono" style={{ fontSize: 10, color: "#3A3A3C" }}>{tasks.length}</span>
              </div>

              {tasks.length === 0 && (
                <div style={{ fontSize: 12, color: "#3A3A3C", padding: "10px 8px" }}>No tasks</div>
              )}

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
          );
        })
      )}

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

function TaskRow({ task, goals, onComplete, onLink }: { task: any; goals: any[]; onComplete: () => void; onLink: () => void }) {
  const [hovered, setHovered] = useState(false);
  const linkedGoal = goals.find(g => g.id === task.linked_goal_id);
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  // Compare by calendar day. MS Graph stores date-only dues at UTC midnight; comparing
  // wall-clock instants flips a due-today task to overdue partway through the day.
  const dueDayDiff = dueDate
    ? Math.round(
        (Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()) -
          Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) /
          86400000,
      )
    : null;
  const isOverdue = dueDayDiff !== null && dueDayDiff < 0;
  const isSoon = dueDayDiff !== null && dueDayDiff >= 0 && dueDayDiff <= 1;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "10px 8px", borderRadius: 10,
        background: hovered ? "rgba(255,255,255,0.04)" : "transparent",
        transition: "background 150ms", cursor: "pointer",
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onComplete}
        style={{
          width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1,
          border: "1.5px solid rgba(255,255,255,0.18)", background: "transparent",
          cursor: "pointer", transition: "border-color 150ms",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)")}
      />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.4, fontWeight: 450 }}>
          {task.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
          {dueDate && (
            <span className="font-mono" style={{
              fontSize: 10, padding: "2px 7px", borderRadius: 20,
              background: isOverdue ? "rgba(255,59,48,0.12)" : isSoon ? "rgba(255,149,0,0.12)" : "rgba(255,255,255,0.06)",
              color: isOverdue ? "#FF3B30" : isSoon ? "#FF9500" : "#8E8E93",
              border: `1px solid ${isOverdue ? "rgba(255,59,48,0.2)" : isSoon ? "rgba(255,149,0,0.2)" : "rgba(255,255,255,0.08)"}`,
            }}>
              {dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
          {linkedGoal && (
            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "rgba(10,132,255,0.1)", color: "#0A84FF", border: "1px solid rgba(10,132,255,0.2)" }}>
              {linkedGoal.title}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 4, opacity: hovered ? 1 : 0, transition: "opacity 150ms", flexShrink: 0 }}>
        <button
          onClick={onLink}
          title="Link to goal"
          style={{ width: 26, height: 26, borderRadius: 7, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.06)", color: "#8E8E93", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 150ms" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#8E8E93"; }}
        >
          <Target size={12} />
        </button>
      </div>
    </div>
  );
}

function InlineAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title.trim());
      setTitle("");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 10, border: `1px dashed ${focused ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)"}`, marginTop: 4, background: focused ? "rgba(255,255,255,0.02)" : "transparent", transition: "border-color 150ms, background 150ms" }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px dashed rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Plus size={10} color="#3A3A3C" />
      </div>
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Add a task..."
        style={{ background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 12, flex: 1, fontFamily: "inherit" }}
      />
    </form>
  );
}
