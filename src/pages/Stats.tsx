import { useMemo } from "react";
import { useGlobalStats, useStreak, useXpByAttribute, useDailyFocusMinutes } from "../db/gamificationHooks";
import { getLevel, getLevelProgress, ATTRIBUTE_COLORS } from "../lib/xp";

const ATTRIBUTES = ["Research", "ML/Math", "Systems", "Algorithms", "Engineering", "Communication"];

export default function Stats() {
  const { data: globalStats } = useGlobalStats();
  const { data: streak = 0 } = useStreak();
  const { data: xpByAttr = [] } = useXpByAttribute();
  const { data: dailyFocus = [] } = useDailyFocusMinutes(182);

  const attrMap = useMemo(() => {
    const map: Record<string, number> = {};
    xpByAttr.forEach(a => { map[a.rpg_attribute] = a.total; });
    return map;
  }, [xpByAttr]);

  const totalXp = Math.floor(globalStats?.totalXp || 0);
  const focusMins = Math.floor(globalStats?.totalFocusMinutes || 0);
  const topAttr = globalStats?.topAttribute || "None";
  const topLevel = getLevel(attrMap[topAttr] || 0);

  return (
    <div className="flex flex-col min-h-full no-scrollbar" style={{ overflowY: "auto" }}>

      {/* ── Zone 1: Hero stats ── */}
      <div
        className="flex items-end"
        style={{ padding: "36px 40px", borderBottom: "1px solid rgba(255,255,255,0.08)", gap: 56 }}
      >
        <HeroStat value={totalXp.toLocaleString()} label="Total XP" primary />
        <Vdivider />
        <HeroStat value={focusMins.toLocaleString()} label="Focus Minutes" />
        <Vdivider />
        <HeroStat value={String(streak)} label="Day Streak" />
        <Vdivider />
        <HeroStat
          value={`${topAttr} · Lv.${topLevel}`}
          label="Top Attribute"
          small
        />
      </div>

      {/* ── Zone 2: Radar | Attribute bars ── */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "1fr 1fr",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Left: Radar */}
        <div
          className="flex flex-col items-center justify-center"
          style={{ padding: "44px 40px", borderRight: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="text-[10px] font-semibold uppercase self-start"
            style={{ letterSpacing: "0.12em", color: "#3A3A3C", marginBottom: 16 }}
          >
            Attribute Radar
          </div>
          <RadarChart attrMap={attrMap} />
        </div>

        {/* Right: Attribute progress bars */}
        <div
          className="flex flex-col justify-center"
          style={{ padding: "44px 40px", gap: 28 }}
        >
          {ATTRIBUTES.map(attr => (
            <AttributeBar key={attr} name={attr} xp={attrMap[attr] || 0} />
          ))}
        </div>
      </div>

      {/* ── Zone 3: Heatmap ── */}
      <div style={{ padding: "36px 40px 80px" }}>
        {/* Header row */}
        <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
          <div
            className="text-[10px] font-semibold uppercase"
            style={{ letterSpacing: "0.12em", color: "#3A3A3C" }}
          >
            Focus Heatmap · 26 Weeks
          </div>
          <div className="flex items-center" style={{ gap: 5 }}>
            <span className="font-mono text-[10px]" style={{ color: "#48484A" }}>Less</span>
            {(["#111", "rgba(10,132,255,0.2)", "rgba(10,132,255,0.48)", "rgba(10,132,255,0.75)", "#0A84FF"] as const).map((bg, i) => (
              <div
                key={i}
                style={{
                  width: 12, height: 12, borderRadius: 3,
                  background: bg,
                  border: i === 0 ? "1px solid rgba(255,255,255,0.06)" : undefined,
                }}
              />
            ))}
            <span className="font-mono text-[10px]" style={{ color: "#48484A" }}>More</span>
          </div>
        </div>

        {/* Grid */}
        <div className="no-scrollbar" style={{ overflowX: "auto" }}>
          <Heatmap data={dailyFocus} />
        </div>

        {/* Streak row */}
        <div className="flex" style={{ gap: 40, marginTop: 24 }}>
          <StreakStat value={String(streak)} label="Current Streak" primary />
          <StreakStat value="--" label="Best Streak" />
          <StreakStat value="60" label="Min / Day Threshold" />
        </div>
      </div>
    </div>
  );
}

function HeroStat({ value, label, primary, small }: { value: string; label: string; primary?: boolean; small?: boolean }) {
  return (
    <div>
      <div
        className="font-mono font-bold leading-none"
        style={{
          fontSize: small ? 40 : 60,
          letterSpacing: "-0.04em",
          color: primary ? "#fff" : small ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.45)",
        }}
      >
        {value}
      </div>
      <div
        className="font-semibold uppercase"
        style={{ fontSize: 10, letterSpacing: "0.1em", color: "#3A3A3C", marginTop: 7 }}
      >
        {label}
      </div>
    </div>
  );
}

function Vdivider() {
  return (
    <div style={{ width: 1, height: 52, background: "rgba(255,255,255,0.08)", flexShrink: 0, alignSelf: "center" }} />
  );
}

function AttributeBar({ name, xp }: { name: string; xp: number }) {
  const level = getLevel(xp);
  const progress = getLevelProgress(xp);
  const color = ATTRIBUTE_COLORS[name] || "#8E8E93";

  return (
    <div className="flex flex-col" style={{ gap: 7 }}>
      <div className="flex justify-between items-baseline">
        <span className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
          {name}
        </span>
        <span
          className="font-mono text-[11px] font-bold"
          style={{
            color,
            padding: "2px 10px",
            borderRadius: 20,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          Lv.{level}
        </span>
      </div>
      <div style={{ height: 6, background: "#1E1E1E", borderRadius: 10, overflow: "hidden" }}>
        <div
          style={{ height: "100%", width: `${progress}%`, background: color, borderRadius: 10, transition: "width 1s ease-out" }}
        />
      </div>
      <div className="flex justify-between font-mono text-[10px]" style={{ color: "#48484A" }}>
        <span>{Math.floor(xp).toLocaleString()} XP earned</span>
      </div>
    </div>
  );
}

function StreakStat({ value, label, primary }: { value: string; label: string; primary?: boolean }) {
  return (
    <div>
      <div
        className="font-mono font-bold"
        style={{ fontSize: 24, color: primary ? "#fff" : "rgba(255,255,255,0.3)" }}
      >
        {value}
      </div>
      <div
        className="font-semibold uppercase"
        style={{ fontSize: 10, letterSpacing: "0.08em", color: "#3A3A3C", marginTop: 4 }}
      >
        {label}
      </div>
    </div>
  );
}

function RadarChart({ attrMap }: { attrMap: Record<string, number> }) {
  const size = 280;
  const center = size / 2;
  const radius = size * 0.38;

  const points = ATTRIBUTES.map((attr, i) => {
    const angle = (Math.PI * 2 * i) / ATTRIBUTES.length - Math.PI / 2;
    const progress = getLevelProgress(attrMap[attr] || 0);
    const distance = radius * (0.08 + (progress / 100) * 0.92);
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
      lx: center + Math.cos(angle) * (radius + 26),
      ly: center + Math.sin(angle) * (radius + 22),
      label: attr,
      angle,
    };
  });

  const polygonPath = points.map(p => `${p.x},${p.y}`).join(" ");

  const webs = [0.25, 0.5, 0.75, 1.0].map(scale =>
    ATTRIBUTES.map((_, i) => {
      const angle = (Math.PI * 2 * i) / ATTRIBUTES.length - Math.PI / 2;
      return `${center + Math.cos(angle) * radius * scale},${center + Math.sin(angle) * radius * scale}`;
    }).join(" ")
  );

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="radarFill">
          <stop offset="0%" stopColor="rgba(225,255,0,0.08)" />
          <stop offset="100%" stopColor="rgba(225,255,0,0.32)" />
        </radialGradient>
      </defs>

      {webs.map((web, i) => (
        <polygon key={i} points={web} fill="none" stroke="white" strokeOpacity="0.05" strokeWidth="1" />
      ))}

      {ATTRIBUTES.map((_, i) => {
        const angle = (Math.PI * 2 * i) / ATTRIBUTES.length - Math.PI / 2;
        return (
          <line
            key={i}
            x1={center} y1={center}
            x2={center + Math.cos(angle) * radius}
            y2={center + Math.sin(angle) * radius}
            stroke="white" strokeOpacity="0.05" strokeWidth="1"
          />
        );
      })}

      <polygon points={polygonPath} fill="url(#radarFill)" stroke="#E1FF00" strokeWidth="1.5" />

      {points.map((p, i) => (
        <text
          key={i}
          x={p.lx} y={p.ly}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="9"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="600"
          fill="#3A3A3C"
          style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}

function Heatmap({ data }: { data: { day: string; mins: number }[] }) {
  const columns = 26;
  const rows = 7;

  const dataMap = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(d => { map[d.day] = d.mins; });
    return map;
  }, [data]);

  const now = new Date();
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - now.getDay());
  const startDate = new Date(lastSunday);
  startDate.setDate(lastSunday.getDate() - (columns - 1) * 7);

  const getCellBg = (mins: number) => {
    if (mins === 0) return "#111";
    if (mins < 30) return "rgba(10,132,255,0.2)";
    if (mins < 60) return "rgba(10,132,255,0.48)";
    if (mins < 120) return "rgba(10,132,255,0.75)";
    return "#0A84FF";
  };

  const cols = [];
  for (let c = 0; c < columns; c++) {
    const colCells = [];
    for (let r = 0; r < rows; r++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + c * 7 + r);
      const dateStr = date.toLocaleDateString("en-CA");
      const mins = dataMap[dateStr] || 0;
      colCells.push(
        <div
          key={dateStr}
          title={`${dateStr}: ${Math.floor(mins)} mins`}
          style={{
            width: 13, height: 13, borderRadius: 3,
            background: getCellBg(mins),
            border: mins === 0 ? "1px solid rgba(255,255,255,0.06)" : undefined,
            cursor: "pointer",
          }}
        />
      );
    }
    cols.push(
      <div key={c} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {colCells}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 3, width: "max-content" }}>
      {cols}
    </div>
  );
}
