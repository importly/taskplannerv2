import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sql } from "kysely";
import { Save } from "lucide-react";
import { gamificationKeys, useTodayFocusMinutes } from "../../db/gamificationHooks";
import { getDb } from "../../db";
import { useProjects, useTodayPlan, useUpsertTodayPlan } from "../../db/projectHooks";
import { useTimerStore } from "../../stores/timerStore";

export function TodayPanel() {
  const { data: todayMins = 0 } = useTodayFocusMinutes();
  const { data: sessionCount = 0 } = useTodaySessionCount();
  const { data: projects = [] } = useProjects();
  const { data: plan } = useTodayPlan();
  const upsertPlan = useUpsertTodayPlan();
  const timerStatus = useTimerStore((state) => state.status);

  const [primaryProjectId, setPrimaryProjectId] = useState("");
  const [primaryAction, setPrimaryAction] = useState("");
  const [successEvidence, setSuccessEvidence] = useState("");
  const [secondaryItemsText, setSecondaryItemsText] = useState("");

  useEffect(() => {
    if (!plan) return;
    setPrimaryProjectId(plan.primary_project_id ?? "");
    setPrimaryAction(plan.primary_action ?? "");
    setSuccessEvidence(plan.success_evidence ?? "");
    setSecondaryItemsText(plan.secondary_items.join("\n"));
  }, [plan]);

  const visibleProjects = projects.filter((project) => project.status !== "done");
  const selectedProject = projects.find((project) => project.id === primaryProjectId);
  const isWorking = timerStatus === "ACTIVE" || timerStatus === "PAUSED";

  const handleProjectChange = (id: string) => {
    setPrimaryProjectId(id);
  };

  const handleSave = () => {
    upsertPlan.mutate({
      planDate: plan?.plan_date,
      primary_project_id: primaryProjectId || null,
      primary_action: primaryAction,
      success_evidence: successEvidence,
      secondary_items: secondaryItemsText.split(/\r?\n/),
    });
  };

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <div>
        <div className="text-xs font-bold tracking-[0.12em] text-white/40 uppercase" style={{ marginBottom: 10 }}>
          Today
        </div>
        <div className="flex" style={{ gap: 16 }}>
          <Stat value={`${todayMins}m`} label="Focus" />
          <div style={{ width: 1, background: "rgba(255,255,255,0.06)", alignSelf: "stretch" }} />
          <Stat value={String(sessionCount)} label="Sessions" />
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
        <div className="text-xs font-bold tracking-[0.12em] text-white/40 uppercase" style={{ marginBottom: 8 }}>
          {isWorking ? "Working On" : "Primary"}
        </div>
        <select
          value={primaryProjectId}
          onChange={(event) => handleProjectChange(event.target.value)}
          style={fieldStyle}
        >
          <option value="" style={{ background: "#000" }}>No project</option>
          {visibleProjects.map((project) => (
            <option key={project.id} value={project.id} style={{ background: "#000" }}>
              {project.name}
            </option>
          ))}
        </select>
        {selectedProject?.current_milestone && (
          <div className="truncate" style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, marginTop: 7 }}>
            {selectedProject.current_milestone}
          </div>
        )}
      </div>

      <div className="flex flex-col" style={{ gap: 8 }}>
        <input
          value={primaryAction}
          onChange={(event) => setPrimaryAction(event.target.value)}
          placeholder="Next concrete action"
          style={fieldStyle}
        />
        <input
          value={successEvidence}
          onChange={(event) => setSuccessEvidence(event.target.value)}
          placeholder="Success evidence"
          style={fieldStyle}
        />
        <textarea
          value={secondaryItemsText}
          onChange={(event) => setSecondaryItemsText(event.target.value)}
          placeholder={"Secondary\n1 Neetcode problem\n30 min CUDA reading"}
          style={{ ...fieldStyle, minHeight: 74, resize: "none" }}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={upsertPlan.isPending}
        className="flex items-center justify-center"
        style={{
          gap: 6,
          width: "100%",
          border: "1px solid rgba(225,255,0,0.22)",
          background: "rgba(225,255,0,0.1)",
          color: "#E1FF00",
          borderRadius: 8,
          padding: "8px 10px",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        <Save size={12} />
        {upsertPlan.isPending ? "Saving" : "Save Today"}
      </button>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-sm text-white/40">{label}</div>
      <div className="text-lg text-white" style={{ marginTop: 2 }}>{value}</div>
    </div>
  );
}

function useTodaySessionCount() {
  return useQuery({
    queryKey: [...gamificationKeys.all, "today-session-count"] as const,
    queryFn: async () => {
      const db = getDb();
      const row = await db
        .selectFrom("focus_sessions")
        .select(sql<number>`COUNT(*)`.as("count"))
        .where(sql`DATE(start_time, 'localtime')`, "=", sql`DATE('now', 'localtime')`)
        .executeTakeFirst();
      return Number(row?.count || 0);
    },
  });
}

const fieldStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 7,
  padding: "9px 10px",
  color: "#ffffff",
  fontSize: 12,
  fontFamily: "var(--font-sans), sans-serif",
  outline: "none",
} as const;
