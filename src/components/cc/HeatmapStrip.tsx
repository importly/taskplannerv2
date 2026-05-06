import { useDailyFocusMinutes } from "../../db/gamificationHooks";
import { useMemo } from "react";

export const HeatmapStrip = () => {
  // Show a full year of data
  const days = 365;
  const { data: dailyFocus = [] } = useDailyFocusMinutes(days);

  const getIntensityTier = (mins: number) => {
    if (mins <= 0) return "bg-white/[0.02] border-white/[0.05]";
    if (mins < 30) return "bg-[#E1FF00]/20 border-[#E1FF00]/10";
    if (mins < 60) return "bg-[#E1FF00]/40 border-[#E1FF00]/20";
    if (mins < 90) return "bg-[#E1FF00]/60 border-[#E1FF00]/40";
    if (mins < 120) return "bg-[#E1FF00]/80 border-[#E1FF00]/60";
    return "bg-[#E1FF00] border-[#E1FF00]";
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
    <div className="w-full h-full flex items-center justify-end gap-[4px] overflow-hidden group">
      {cells.map((cell, i) => (
        <div
          key={i}
          className={`w-[12px] h-[12px] rounded-[3px] shrink-0 border transition-all duration-300 hover:scale-125 ${getIntensityTier(cell.mins)}`}
          title={`${cell.date}: ${Math.floor(cell.mins)} mins`}
        />
      ))}
      
      {/* Fade overlay on the left so it blends smoothly */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent pointer-events-none" />
    </div>
  );
};
