import { useMemo } from "react";
import { useGlobalStats, useStreak, useXpByAttribute, useDailyFocusMinutes } from "../db/gamificationHooks";
import { getLevel, getLevelProgress, ATTRIBUTE_COLORS } from "../lib/xp";

const ATTRIBUTES = ["Systems", "Algorithms", "Logic", "Communication", "Knowledge", "Craft"];

export default function Stats() {
  const { data: globalStats } = useGlobalStats();
  const { data: streak = 0 } = useStreak();
  const { data: xpByAttr = [] } = useXpByAttribute();
  const { data: dailyFocus = [] } = useDailyFocusMinutes(182); // 26 weeks * 7 days

  const attrMap = useMemo(() => {
    const map: Record<string, number> = {};
    xpByAttr.forEach(a => {
      map[a.rpg_attribute] = a.total;
    });
    return map;
  }, [xpByAttr]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">
      {/* Zone 1: Hero Stats */}
      <section className="grid grid-cols-4 border border-white/10 rounded-2xl bg-white/[0.02] backdrop-blur-xl divide-x divide-white/10 overflow-hidden glass-surface">
        <StatItem 
          label="Total XP" 
          value={Math.floor(globalStats?.totalXp || 0).toLocaleString()} 
          sublabel={`Level ${getLevel(globalStats?.totalXp || 0)}`}
        />
        <StatItem 
          label="Focus Minutes" 
          value={Math.floor(globalStats?.totalFocusMinutes || 0).toLocaleString()} 
          sublabel="Lifetime"
        />
        <StatItem 
          label="Day Streak" 
          value={`${streak} Days`} 
          sublabel="Current"
        />
        <StatItem 
          label="Top Attribute" 
          value={globalStats?.topAttribute || "None"} 
          sublabel="Mastery"
        />
      </section>

      {/* Zone 2: Radar + Progress Bars */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left: Radar Chart */}
        <div className="relative aspect-square flex items-center justify-center bg-white/[0.01] rounded-3xl border border-white/5 p-8">
          <RadarChart attrMap={attrMap} />
        </div>

        {/* Right: Attribute Progress */}
        <div className="space-y-6">
          {ATTRIBUTES.map(attr => (
            <AttributeProgress 
              key={attr} 
              name={attr} 
              xp={attrMap[attr] || 0} 
            />
          ))}
        </div>
      </section>

      {/* Zone 3: Heatmap */}
      <section className="space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-muted">Activity Heatmap (Last 26 Weeks)</h3>
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 overflow-x-auto glass-surface">
          <Heatmap data={dailyFocus} />
          <div className="mt-6 flex justify-between items-center text-[10px] font-mono text-muted uppercase tracking-wider">
            <span>{streak} day current streak</span>
            <div className="flex items-center gap-2">
              <span>Less</span>
              {[5, 20, 40, 70, 100].map(opacity => (
                <div 
                  key={opacity} 
                  className="w-3 h-3 rounded-sm" 
                  style={{ 
                    backgroundColor: opacity === 5 ? 'rgba(255,255,255,0.05)' : `rgba(225, 255, 0, ${opacity/100})` 
                  }} 
                />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatItem({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div className="p-6 flex flex-col items-center justify-center text-center space-y-1">
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">{label}</span>
      <span className="text-3xl font-bold tracking-tight font-mono">{value}</span>
      <span className="text-[10px] font-mono text-accent/60 uppercase">{sublabel}</span>
    </div>
  );
}

function AttributeProgress({ name, xp }: { name: string; xp: number }) {
  const level = getLevel(xp);
  const progress = getLevelProgress(xp);
  const color = ATTRIBUTE_COLORS[name] || "#8E8E93";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-3">
          <div 
            className="px-2 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] font-mono font-bold"
            style={{ color }}
          >
            Lv.{level}
          </div>
          <span className="text-sm font-medium">{name}</span>
        </div>
        <span className="text-[10px] font-mono text-muted">{Math.floor(xp).toLocaleString()} XP</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div 
          className="h-full transition-all duration-1000 ease-out"
          style={{ 
            width: `${progress}%`, 
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}40`
          }}
        />
      </div>
    </div>
  );
}

function RadarChart({ attrMap }: { attrMap: Record<string, number> }) {
  const size = 300;
  const center = size / 2;
  const radius = size * 0.4;
  
  const points = ATTRIBUTES.map((attr, i) => {
    const angle = (Math.PI * 2 * i) / ATTRIBUTES.length - Math.PI / 2;
    const progress = getLevelProgress(attrMap[attr] || 0);
    // Use at least 10% distance for visibility
    const distance = radius * (0.1 + (progress / 100) * 0.9);
    const x = center + Math.cos(angle) * distance;
    const y = center + Math.sin(angle) * distance;
    return { x, y, label: attr, angle };
  });

  const polygonPath = points.map(p => `${p.x},${p.y}`).join(" ");
  
  // Background webs
  const webs = [0.2, 0.4, 0.6, 0.8, 1.0].map(scale => {
    return ATTRIBUTES.map((_, i) => {
      const angle = (Math.PI * 2 * i) / ATTRIBUTES.length - Math.PI / 2;
      const x = center + Math.cos(angle) * radius * scale;
      const y = center + Math.sin(angle) * radius * scale;
      return `${x},${y}`;
    }).join(" ");
  });

  return (
    <svg width={size} height={size} className="overflow-visible drop-shadow-[0_0_20px_rgba(225,255,0,0.1)]">
      <defs>
        <radialGradient id="radarGrad">
          <stop offset="0%" stopColor="rgba(225, 255, 0, 0.1)" />
          <stop offset="100%" stopColor="rgba(225, 255, 0, 0.4)" />
        </radialGradient>
      </defs>

      {/* Webs */}
      {webs.map((web, i) => (
        <polygon 
          key={i} 
          points={web} 
          fill="none" 
          stroke="white" 
          strokeOpacity="0.05" 
          strokeWidth="1" 
        />
      ))}

      {/* Axes */}
      {ATTRIBUTES.map((_, i) => {
        const angle = (Math.PI * 2 * i) / ATTRIBUTES.length - Math.PI / 2;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        return (
          <line 
            key={i} 
            x1={center} y1={center} x2={x} y2={y} 
            stroke="white" strokeOpacity="0.05" strokeWidth="1" 
          />
        );
      })}

      {/* Main Polygon */}
      <polygon 
        points={polygonPath} 
        fill="url(#radarGrad)" 
        stroke="#E1FF00" 
        strokeWidth="2" 
        className="transition-all duration-1000 ease-out"
      />

      {/* Labels */}
      {points.map((p, i) => {
        const lx = center + Math.cos(p.angle) * (radius + 25);
        const ly = center + Math.sin(p.angle) * (radius + 20);
        return (
          <text 
            key={i} 
            x={lx} y={ly} 
            textAnchor="middle" 
            className="fill-muted text-[9px] font-mono uppercase tracking-tighter"
          >
            {p.label}
          </text>
        );
      })}
    </svg>
  );
}

function Heatmap({ data }: { data: { day: string, mins: number }[] }) {
  const columns = 26;
  const rows = 7;
  
  const dataMap = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(d => {
      map[d.day] = d.mins;
    });
    return map;
  }, [data]);

  const cells = [];
  const now = new Date();
  
  // Find the last Sunday to align the grid
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - now.getDay());
  
  // Start date is 25 weeks before last Sunday
  const startDate = new Date(lastSunday);
  startDate.setDate(lastSunday.getDate() - (columns - 1) * 7);

  for (let c = 0; c < columns; c++) {
    const column = [];
    for (let r = 0; r < rows; r++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + c * 7 + r);
      const dateStr = date.toLocaleDateString('en-CA');
      const mins = dataMap[dateStr] || 0;
      
      let bg = "bg-white/5";
      if (mins > 0) bg = "bg-accent/20";
      if (mins >= 30) bg = "bg-accent/40";
      if (mins >= 60) bg = "bg-accent/70";
      if (mins >= 120) bg = "bg-accent";

      column.push(
        <div 
          key={dateStr}
          className={`w-3 h-3 rounded-sm ${bg} transition-colors duration-500`}
          title={`${dateStr}: ${Math.floor(mins)} mins`}
        />
      );
    }
    cells.push(<div key={c} className="flex flex-col gap-1.5">{column}</div>);
  }

  return (
    <div className="flex gap-1.5">
      {cells}
    </div>
  );
}
