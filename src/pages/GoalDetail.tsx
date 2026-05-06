import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  useGoal,
  useGoalStats,
  useNarrativeLogs,
  useGoalTasks,
  useUpdateGoalProgress,
  useArchiveGoal,
  useDeleteGoal,
  useAddManualNarrativeLog,
} from "../db/goalHooks";
import { useSessionStore } from "../stores/sessionStore";
import { useTimerStore } from "../stores/timerStore";
import { Play, Archive, Trash2, ChevronLeft, Send, Calendar, MoreHorizontal } from "lucide-react";

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "#E1FF00" }} />
      </div>
    );
  }

  const handleStartFocus = () => {
    setSessionGoal(goal.id);
    startTimer();
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateProgress.mutate({ id: goal.id, progressPercent: parseInt(e.target.value) });
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 44px)",
        background: "#000",
        color: "#fff",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: 56,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer", color: "#8E8E93",
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <div
              className="font-mono"
              style={{ fontSize: 10, color: "#48484A", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              Goals /
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
              {goal.title}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={handleStartFocus}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#E1FF00", color: "#000",
              borderRadius: 20, padding: "7px 18px",
              border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700,
            }}
          >
            <Play size={14} fill="currentColor" />
            Start Focus
          </button>

          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowActions(!showActions)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer", color: "#8E8E93",
              }}
            >
              <MoreHorizontal size={16} />
            </button>
            {showActions && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowActions(false)} />
                <div
                  className="z-30"
                  style={{
                    position: "absolute", right: 0, top: 40, width: 176,
                    background: "#111", border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 12, overflow: "hidden", padding: "4px 0",
                  }}
                >
                  <button
                    onClick={handleArchive}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "9px 16px",
                      background: "transparent", border: "none", cursor: "pointer",
                      fontSize: 13, color: "#8E8E93", textAlign: "left",
                    }}
                  >
                    <Archive size={14} /> Archive Goal
                  </button>
                  <button
                    onClick={handleDelete}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "9px 16px",
                      background: "transparent", border: "none", cursor: "pointer",
                      fontSize: 13, color: "#FF3B30", textAlign: "left",
                    }}
                  >
                    <Trash2 size={14} /> Delete Goal
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Body: split panes ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left pane: Narrative + logs */}
        <div
          className="no-scrollbar"
          style={{
            width: "60%",
            overflowY: "auto",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: 1, padding: "36px 40px", display: "flex", flexDirection: "column", gap: 40 }}>

            {/* Strategic Narrative */}
            <section>
              <div
                className="font-mono"
                style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E8E93", marginBottom: 16 }}
              >
                Strategic Narrative
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.75)" }}>
                <ReactMarkdown>{goal.description || "_No description provided._"}</ReactMarkdown>
              </div>
            </section>

            {/* Execution Logs */}
            <section>
              <div
                className="font-mono"
                style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E8E93", marginBottom: 16 }}
              >
                Execution Logs
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {logs?.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      paddingLeft: 20,
                      borderLeft: "1px solid rgba(255,255,255,0.10)",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute", left: -5, top: 6,
                        width: 8, height: 8, borderRadius: "50%",
                        background: "rgba(255,255,255,0.18)",
                      }}
                    />
                    <div
                      className="font-mono"
                      style={{ fontSize: 10, color: "#48484A", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}
                    >
                      {new Date(log.timestamp).toLocaleDateString()} · {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {log.session_id && <span style={{ color: "rgba(225,255,0,0.5)", marginLeft: 8 }}>Focus Session</span>}
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.80)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {log.content}
                    </p>
                  </div>
                ))}
                {(!logs || logs.length === 0) && (
                  <p style={{ fontSize: 13, color: "#48484A", fontStyle: "italic" }}>No logs recorded yet.</p>
                )}
              </div>
            </section>
          </div>

          {/* Manual log entry — pinned bottom */}
          <div
            style={{
              padding: "20px 40px 28px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.5)",
              flexShrink: 0,
            }}
          >
            <form onSubmit={handleSubmitLog} style={{ position: "relative" }}>
              <textarea
                value={manualLog}
                onChange={(e) => setManualLog(e.target.value)}
                placeholder="Log progress or reflections..."
                rows={3}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.20)",
                  borderRadius: 14,
                  padding: "14px 52px 14px 16px",
                  fontSize: 13,
                  color: "#fff",
                  resize: "none",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <button
                type="submit"
                disabled={!manualLog.trim()}
                style={{
                  position: "absolute", right: 12, bottom: 12,
                  width: 32, height: 32, borderRadius: 10,
                  background: manualLog.trim() ? "#E1FF00" : "rgba(255,255,255,0.08)",
                  color: manualLog.trim() ? "#000" : "#3A3A3C",
                  border: "none", cursor: manualLog.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 150ms",
                }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* Right pane: Metrics */}
        <div
          className="no-scrollbar"
          style={{ width: "40%", overflowY: "auto", padding: "36px 32px 80px" }}
        >

          {/* Progress */}
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div
                className="font-mono"
                style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E8E93" }}
              >
                Progress
              </div>
              <span className="font-mono" style={{ fontSize: 24, fontWeight: 700, color: "#E1FF00" }}>
                {goal.progress_percent}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={goal.progress_percent}
              onChange={handleProgressChange}
              style={{
                width: "100%", height: 6, borderRadius: 10,
                appearance: "none", cursor: "pointer",
                background: `linear-gradient(to right, #E1FF00 ${goal.progress_percent}%, #1E1E1E ${goal.progress_percent}%)`,
                outline: "none",
              }}
            />
            <p
              className="font-mono"
              style={{ fontSize: 10, color: "#3A3A3C", textAlign: "center", marginTop: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              Slide to adjust completion
            </p>
          </section>

          {/* Execution Velocity chart */}
          <section style={{ marginBottom: 40 }}>
            <div
              className="font-mono"
              style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E8E93", marginBottom: 16 }}
            >
              Execution Velocity
            </div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#3A3A3C"
                    tickFormatter={(val) => val.split("-").slice(1).join("/")}
                    fontSize={9}
                    fontFamily="JetBrains Mono, monospace"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#48484A" }}
                  />
                  <YAxis
                    stroke="#3A3A3C"
                    fontSize={9}
                    fontFamily="JetBrains Mono, monospace"
                    tickLine={false}
                    axisLine={false}
                    unit="m"
                    tick={{ fill: "#48484A" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111", border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 10, fontSize: 11, fontFamily: "JetBrains Mono, monospace",
                      color: "#fff",
                    }}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar dataKey="total_minutes" fill="#E1FF00" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div
              className="flex justify-between font-mono"
              style={{ fontSize: 10, color: "#3A3A3C", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 10 }}
            >
              <span>Past 14 Days</span>
              <span>Daily Focus Minutes</span>
            </div>
          </section>

          {/* Linked Tasks */}
          <section>
            <div
              className="font-mono"
              style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E8E93", marginBottom: 16 }}
            >
              Linked Tasks
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tasks?.map((task) => (
                <div
                  key={task.ms_task_id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 14px", borderRadius: 12,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: task.status === "completed" ? "#30D158" : "rgba(225,255,0,0.4)",
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: 13,
                      color: task.status === "completed" ? "#48484A" : "rgba(255,255,255,0.85)",
                      textDecoration: task.status === "completed" ? "line-through" : "none",
                    }}>
                      {task.title}
                    </span>
                  </div>
                  {task.due_date && (
                    <div className="font-mono" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#48484A" }}>
                      <Calendar size={9} />
                      {new Date(task.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
              {(!tasks || tasks.length === 0) && (
                <div
                  style={{
                    padding: 24, borderRadius: 12,
                    border: "1px dashed rgba(255,255,255,0.07)",
                    textAlign: "center", fontSize: 12, color: "#3A3A3C",
                  }}
                >
                  No tasks linked to this goal.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
