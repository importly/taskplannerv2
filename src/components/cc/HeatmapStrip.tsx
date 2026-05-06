import { useDailyFocusMinutes } from "../../db/gamificationHooks";
import { useMemo } from "react";

export const HeatmapStrip = () => {
  // Show a full year of data
  const days = 365;
  const { data: dailyFocus = [] } = useDailyFocusMinutes(days);

  const getIntensityTier = (mins: number) => {
    if (mins <= 0) return { background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" };
    if (mins < 30) return { background: "rgba(10,132,255,0.2)", borderColor: "rgba(10,132,255,0.1)" };
    if (mins < 60) return { background: "rgba(10,132,255,0.4)", borderColor: "rgba(10,132,255,0.2)" };
    if (mins < 90) return { background: "rgba(10,132,255,0.6)", borderColor: "rgba(10,132,255,0.4)" };
    if (mins < 120) return { background: "rgba(10,132,255,0.8)", borderColor: "rgba(10,132,255,0.6)" };
    return { background: "#0A84FF", borderColor: "#0A84FF" };
  };

  const minutesMap = useMemo(() => {
    const map: Record<string, number> = {};
    dailyFocus.forEach(d => { map[d.day] = d.mins; });
    return map;
  }, [dailyFocus]);

  const cells = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const dateStr = d.toLocaleDateString('en-CA');
    const mins = minutesMap[dateStr] || 0;
    return { date: dateStr, mins };
  });

  return (
    <div className="w-full h-full flex items-center justify-end overflow-hidden group" style={{ gap: 4 }}>
      {cells.map((cell, i) => (
        <div
          key={i}
          className="shrink-0 border transition-all duration-300 hover:scale-125"
          style={{ width: 12, height: 12, borderRadius: 3, ...getIntensityTier(cell.mins) }}
          title={`${cell.date}: ${Math.floor(cell.mins)} mins`}
        />
      ))}
      
      {/* Fade overlay on the left so it blends smoothly */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent pointer-events-none" />
    </div>
  );
};
