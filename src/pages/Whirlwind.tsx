import { useState, useEffect, useMemo, useRef } from "react";
import type { FocusEvent, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { acquireMsToken, startMsAuth, disconnectMs } from "../services/msalAuth";
import { fetchTodoLists } from "../services/msGraphService";
import {
  useCachedTasks,
  useSyncTasks,
  useCompleteTask,
  useCreateTask,
  useLinkTaskToGoal,
  useUpdateTask,
  useDeleteTask,
} from "../db/taskHooks";
import { useGoals } from "../db/goalHooks";
import { GoalPicker } from "../components/whirlwind/GoalPicker";
import { RefreshCcw, Plus, Target, Loader2, Pencil, Trash2, X, Check } from "lucide-react";
import type { CachedTask } from "../tasks/taskTypes";

type WhirlwindGoal = {
  id: string;
  title: string;
};

export default function Whirlwind() {
  const [isLinkingTaskId, setIsLinkingTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const editingTaskIdRef = useRef<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDue, setEditingDue] = useState("");
  const [taskError, setTaskError] = useState<string | null>(null);
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
  const { mutate: updateTask, isPending: isUpdatingTask } = useUpdateTask();
  const { mutate: deleteTask, isPending: isDeletingTask } = useDeleteTask();
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

  const setActiveEditingTaskId = (taskId: string | null) => {
    editingTaskIdRef.current = taskId;
    setEditingTaskId(taskId);
  };

  const startEditingTask = (task: CachedTask) => {
    setTaskError(null);
    setActiveEditingTaskId(task.ms_task_id);
    setEditingTitle(task.title);
    setEditingDue(toDateInputValue(task.due_date));
  };

  const cancelEditingTask = () => {
    setActiveEditingTaskId(null);
    setEditingTitle("");
    setEditingDue("");
  };

  const finishEditingTask = (taskId: string) => {
    if (editingTaskIdRef.current === taskId) cancelEditingTask();
  };

  const saveEditingTask = (taskId: string, listId: string) => {
    const title = editingTitle.trim();
    if (!title || isUpdatingTask) return;

    setTaskError(null);
    updateTask(
      {
        taskId,
        listId,
        fields: {
          title,
          dueDateTime: editingDue ? { dateTime: `${editingDue}T00:00:00.000Z`, timeZone: "UTC" } : null,
        },
      },
      {
        onSuccess: () => finishEditingTask(taskId),
        onError: (error) => setTaskError(errorMessage(error, "Task update failed")),
      },
    );
  };

  const deleteTaskRow = (taskId: string, listId: string) => {
    if (isDeletingTask) return;

    setTaskError(null);
    deleteTask(
      { taskId, listId },
      {
        onSuccess: () => finishEditingTask(taskId),
        onError: (error) => setTaskError(errorMessage(error, "Task delete failed")),
      },
    );
  };

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
      <div style={{ fontSize: 11, color: "#3A3A3C", marginBottom: 24 }}>
        <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: isSyncing ? "#FF9500" : "#30D158", marginRight: 6, verticalAlign: "middle" }} />
        {isSyncing ? "Syncing..." : "Microsoft To Do · synced"}
        {taskError && (
          <div style={{ color: "#FF3B30", marginTop: 6 }}>
            {taskError}
          </div>
        )}
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
                <span style={{ fontSize: 10, color: "#3A3A3C" }}>{tasks.length}</span>
              </div>

              {tasks.length === 0 && (
                <div style={{ fontSize: 12, color: "#3A3A3C", padding: "10px 8px" }}>No tasks</div>
              )}

              {tasks.map(task => (
                <TaskRow
                  key={task.ms_task_id}
                  task={task}
                  goals={goals}
                  isEditing={editingTaskId === task.ms_task_id}
                  editingTitle={editingTitle}
                  editingDue={editingDue}
                  onEditingTitleChange={setEditingTitle}
                  onEditingDueChange={setEditingDue}
                  isSaving={isUpdatingTask}
                  isDeleting={isDeletingTask}
                  onEdit={() => startEditingTask(task)}
                  onSave={() => saveEditingTask(task.ms_task_id, list.id!)}
                  onCancelEdit={cancelEditingTask}
                  onDelete={() => deleteTaskRow(task.ms_task_id, list.id!)}
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

type TaskRowProps = {
  task: CachedTask;
  goals: WhirlwindGoal[];
  isEditing: boolean;
  editingTitle: string;
  editingDue: string;
  onEditingTitleChange: (title: string) => void;
  onEditingDueChange: (due: string) => void;
  isSaving: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onLink: () => void;
};

function TaskRow({
  task,
  goals,
  isEditing,
  editingTitle,
  editingDue,
  onEditingTitleChange,
  onEditingDueChange,
  isSaving,
  isDeleting,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onComplete,
  onLink,
}: TaskRowProps) {
  const [hovered, setHovered] = useState(false);
  const [focusedWithin, setFocusedWithin] = useState(false);
  const linkedGoal = goals.find(g => g.id === task.linked_goal_id);
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const canSave = editingTitle.trim().length > 0 && !isSaving;
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocusedWithin(false);
    }
  };
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
  const isSoon = dueDayDiff === 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocusedWithin(true)}
      onBlur={handleBlur}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "10px 8px", borderRadius: 10,
        background: isEditing ? "rgba(255,255,255,0.05)" : hovered ? "rgba(255,255,255,0.04)" : "transparent",
        transition: "background 150ms",
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onComplete}
        disabled={isEditing || isSaving || isDeleting}
        style={{
          width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1,
          border: "1.5px solid rgba(255,255,255,0.18)", background: "transparent",
          cursor: isEditing || isSaving || isDeleting ? "default" : "pointer", transition: "border-color 150ms",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)")}
      />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <>
            <input
              type="text"
              value={editingTitle}
              onChange={e => onEditingTitleChange(e.target.value)}
              style={{ background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.15)", outline: "none", color: "#fff", fontSize: 13, lineHeight: 1.4, width: "100%", paddingBottom: 2, marginBottom: 6, fontFamily: "inherit" }}
            />
            <input
              type="date"
              value={editingDue}
              onChange={e => onEditingDueChange(e.target.value)}
              style={{ background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.1)", outline: "none", color: "#8E8E93", fontSize: 11, paddingBottom: 2, fontFamily: "inherit" }}
            />
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.4, fontWeight: 450, overflowWrap: "anywhere", wordBreak: "break-word" }}>
              {task.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap", minWidth: 0 }}>
              {dueDate && (
                <span style={{
                  fontSize: 10, padding: "2px 7px", borderRadius: 20,
                  background: isOverdue ? "rgba(255,59,48,0.12)" : isSoon ? "rgba(255,149,0,0.12)" : "rgba(255,255,255,0.06)",
                  color: isOverdue ? "#FF3B30" : isSoon ? "#FF9500" : "#8E8E93",
                  border: `1px solid ${isOverdue ? "rgba(255,59,48,0.2)" : isSoon ? "rgba(255,149,0,0.2)" : "rgba(255,255,255,0.08)"}`,
                }}>
                  {dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              )}
              {linkedGoal && (
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "rgba(10,132,255,0.1)", color: "#0A84FF", border: "1px solid rgba(10,132,255,0.2)", maxWidth: "100%", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                  {linkedGoal.title}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 4, opacity: hovered || focusedWithin || isEditing ? 1 : 0, transition: "opacity 150ms", flexShrink: 0 }}>
        {isEditing ? (
          <>
            <IconButton onClick={onSave} title="Save task" disabled={!canSave}>
              <Check size={12} />
            </IconButton>
            <IconButton onClick={onCancelEdit} title="Cancel edit" disabled={isSaving}>
              <X size={12} />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton onClick={onEdit} title="Edit task">
              <Pencil size={12} />
            </IconButton>
            <IconButton onClick={onDelete} title="Delete task" disabled={isDeleting}>
              <Trash2 size={12} />
            </IconButton>
          </>
        )}
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

function IconButton({ children, disabled, onClick, title }: { children: ReactNode; disabled?: boolean; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{ width: 26, height: 26, borderRadius: 7, border: "none", cursor: disabled ? "default" : "pointer", background: "rgba(255,255,255,0.06)", color: disabled ? "#3A3A3C" : "#8E8E93", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 150ms, color 150ms" }}
      onMouseEnter={e => {
        if (disabled) return;
        e.currentTarget.style.background = "rgba(255,255,255,0.1)";
        e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        e.currentTarget.style.color = disabled ? "#3A3A3C" : "#8E8E93";
      }}
    >
      {children}
    </button>
  );
}

function toDateInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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
