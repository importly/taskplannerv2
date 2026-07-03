import { useTimerStore } from "../../stores/timerStore";
import { useSessionStore } from "../../stores/sessionStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDb } from "../../db";
import { saveFocusSession } from "../../db/operations";
import { gamificationKeys } from "../../db/gamificationHooks";
import { goalKeys } from "../../db/goalHooks";

export const ReflectionModal = () => {
  const status = useTimerStore((state) => state.status);
  const commit = useTimerStore((state) => state.commit);
  const discardTimer = useTimerStore((state) => state.discard);
  const queryClient = useQueryClient();

  const {
    selectedTagIds,
    linkedGoalId,
    journalContent,
    isManualSessionOpen,
    manualDurationMinutes,
    setTags,
    setGoal,
    setJournal,
    setManualDurationMinutes,
    reset: resetSession,
  } = useSessionStore();

  const { data: tags = [] } = useQuery({
    queryKey: gamificationKeys.tags(),
    queryFn: async () => {
      const db = getDb();
      return await db.selectFrom("tags").selectAll().execute();
    },
  });

  const { data: goals = [] } = useQuery({
    queryKey: [...goalKeys.lists(), "reflection"],
    queryFn: async () => {
      const db = getDb();
      return await db.selectFrom("goals").selectAll().where("archived_at", "is", null).execute();
    },
  });

  const isTimerReflection = status === "STOPPED";
  const isManualReflection = !isTimerReflection && isManualSessionOpen;

  if (!isTimerReflection && !isManualReflection) return null;

  const handleCommit = async () => {
    try {
      if (isManualReflection) {
        await saveFocusSession({
          focusDurationSeconds: manualDurationMinutes * 60,
          breakDurationSeconds: 0,
          endTimestamp: Date.now(),
        });
      } else {
        await saveFocusSession();
        commit();
      }
      resetSession();
      // Invalidate all caches that depend on session/XP/gamification data
      queryClient.invalidateQueries({ queryKey: gamificationKeys.all });
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
    } catch (error) {
      console.error("Failed to save session", error);
    }
  };

  const handleDiscard = () => {
    if (isTimerReflection) {
      discardTimer();
    }
    resetSession();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md" style={{ padding: "16px" }}>
      <div className="flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" style={{ background: "#000000", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", width: "100%", maxWidth: "672px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
        <div style={{ padding: "32px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#ffffff", fontFamily: "var(--font-sans), sans-serif" }}>
            {isManualReflection ? "Log Missed Session" : "Session Complete"}
          </h2>
          <p style={{ color: "#8E8E93", fontSize: "14px", marginTop: "8px", fontFamily: "var(--font-sans), sans-serif" }}>
            {isManualReflection ? "Add focus time you already completed." : "Reflect on your focus time."}
          </p>
        </div>

        <div className="overflow-y-auto no-scrollbar flex flex-col" style={{ padding: "32px", gap: "24px", maxHeight: "60vh" }}>
          {isManualReflection && (
            <div className="flex flex-col" style={{ gap: "10px" }}>
              <label style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E8E93" }}>Duration</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="number"
                  min={1}
                  max={600}
                  step={5}
                  value={manualDurationMinutes}
                  onChange={(e) => setManualDurationMinutes(Number(e.target.value))}
                  className="w-full focus:outline-none transition-colors"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "12px 14px", color: "#ffffff", fontSize: "14px", fontFamily: "var(--font-sans), sans-serif" }}
                />
                <span style={{ color: "#8E8E93", fontSize: "13px", fontWeight: 600 }}>min</span>
              </div>
            </div>
          )}

          {/* Journal Field */}
          <div className="flex flex-col" style={{ gap: "10px" }}>
            <label style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E8E93" }}>Journal / Narrative</label>
            <textarea
              className="w-full h-32 focus:outline-none transition-colors resize-none"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "14px", color: "#ffffff", fontSize: "14px", fontFamily: "var(--font-sans), sans-serif" }}
              placeholder="What did you achieve? Any obstacles?"
              value={journalContent}
              onChange={(e) => setJournal(e.target.value)}
            />
          </div>

          {/* Tag selection */}
          <div className="flex flex-col" style={{ gap: "10px" }}>
            <label style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E8E93" }}>Tags</label>
            <div className="flex flex-wrap" style={{ gap: "8px" }}>
              {tags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => {
                      if (isSelected) {
                        setTags(selectedTagIds.filter((id) => id !== tag.id));
                      } else {
                        setTags([...selectedTagIds, tag.id]);
                      }
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "20px",
                      border: isSelected ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.1)",
                      background: isSelected ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
                      color: isSelected ? "#ffffff" : "#8E8E93",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "var(--font-sans), sans-serif",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goal linking */}
          <div className="flex flex-col" style={{ gap: "10px" }}>
            <label style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E8E93" }}>Linked Goal</label>
            <select
              className="w-full focus:outline-none transition-colors appearance-none"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "14px", color: "#ffffff", fontSize: "14px", fontFamily: "var(--font-sans), sans-serif" }}
              value={linkedGoalId || ""}
              onChange={(e) => setGoal(e.target.value || null)}
            >
              <option value="" style={{ background: "#000" }}>No goal linked</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id} style={{ background: "#000" }}>
                  {goal.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center" style={{ padding: "24px 32px", gap: "16px", borderTop: "1px solid rgba(255,255,255,0.08)", background: "#000000" }}>
          <button 
            onClick={handleCommit} 
            disabled={isManualReflection && manualDurationMinutes < 1}
            style={{ flex: 1, background: "#E1FF00", color: "#000000", padding: "12px 24px", borderRadius: "8px", fontSize: "14px", fontWeight: 600, fontFamily: "var(--font-sans), sans-serif", border: "none", cursor: isManualReflection && manualDurationMinutes < 1 ? "not-allowed" : "pointer", transition: "all 0.2s ease", opacity: isManualReflection && manualDurationMinutes < 1 ? 0.5 : 1 }}
          >
            {isManualReflection ? "Save Manual Session" : "Commit Session"}
          </button>
          <button 
            onClick={handleDiscard} 
            style={{ background: "transparent", color: "rgba(255,255,255,0.5)", padding: "12px 16px", borderRadius: "8px", fontSize: "14px", fontWeight: 600, fontFamily: "var(--font-sans), sans-serif", border: "none", cursor: "pointer", transition: "color 0.2s ease" }}
            onMouseOver={(e) => e.currentTarget.style.color = "#FF3B30"}
            onMouseOut={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
};
