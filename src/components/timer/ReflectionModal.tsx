import { useTimerStore } from "../../stores/timerStore";
import { useSessionStore } from "../../stores/sessionStore";
import { useQuery } from "@tanstack/react-query";
import { getDb } from "../../db";
import { saveFocusSession } from "../../db/operations";
import { Button } from "../ui/button";

export const ReflectionModal = () => {
  const status = useTimerStore((state) => state.status);
  const commit = useTimerStore((state) => state.commit);
  const discardTimer = useTimerStore((state) => state.discard);

  const {
    selectedTagIds,
    linkedGoalId,
    journalContent,
    setTags,
    setGoal,
    setJournal,
    reset: resetSession,
  } = useSessionStore();

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const db = getDb();
      return await db.selectFrom("tags").selectAll().execute();
    },
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const db = getDb();
      return await db.selectFrom("goals").selectAll().execute();
    },
  });

  if (status !== "STOPPED") return null;

  const handleCommit = async () => {
    try {
      await saveFocusSession();
      commit();
      resetSession();
    } catch (error) {
      console.error("Failed to save session", error);
    }
  };

  const handleDiscard = () => {
    discardTimer();
    resetSession();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-accent">Session Complete</h2>
          <p className="text-muted text-sm mt-1">Reflect on your focus time.</p>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Journal Field */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-widest">Journal / Narrative</label>
            <textarea
              className="w-full h-32 bg-black/40 border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors resize-none"
              placeholder="What did you achieve? Any obstacles?"
              value={journalContent}
              onChange={(e) => setJournal(e.target.value)}
            />
          </div>

          {/* Tag selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-widest">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => {
                    if (selectedTagIds.includes(tag.id)) {
                      setTags(selectedTagIds.filter((id) => id !== tag.id));
                    } else {
                      setTags([...selectedTagIds, tag.id]);
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-[10px] font-black transition-all border ${
                    selectedTagIds.includes(tag.id)
                      ? "bg-accent border-accent text-black scale-105"
                      : "bg-transparent border-border text-muted hover:border-muted"
                  }`}
                >
                  {tag.rpg_attribute.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Goal linking */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-widest">Linked Goal</label>
            <select
              className="w-full bg-black/40 border border-border rounded-lg p-3 text-white focus:outline-none focus:border-accent transition-colors appearance-none"
              value={linkedGoalId || ""}
              onChange={(e) => setGoal(e.target.value || null)}
            >
              <option value="">No goal linked</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 bg-black/20 flex gap-4">
          <Button onClick={handleCommit} className="flex-1 bg-accent text-black hover:bg-accent/90 py-6 font-black tracking-tight">
            COMMIT SESSION
          </Button>
          <Button onClick={handleDiscard} variant="ghost" className="text-muted hover:text-danger font-bold">
            DISCARD
          </Button>
        </div>
      </div>
    </div>
  );
};
