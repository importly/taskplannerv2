import { useDailyFocusMinutes } from "../../db/gamificationHooks";

export const HeatmapStrip = () => {
  const { data: dailyMinutes = [] } = useDailyFocusMinutes(74);

  const getIntensityTier = (mins: number) => {
    if (mins <= 0) return "bg-[#111]";
    if (mins < 30) return "bg-accent/20";
    if (mins < 60) return "bg-accent/48";
    if (mins < 90) return "bg-accent/75";
    if (mins < 120) return "bg-accent/88";
    return "bg-accent";
  };

  // Create a map for easy lookup
  const minutesMap = new Map(dailyMinutes.map(m => [m.day, m.mins]));

  // Generate last 74 days
  const cells = Array.from({ length: 74 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (73 - i)); // 73 down to 0 (today)
    const dateStr = d.toLocaleDateString('en-CA');
    const mins = minutesMap.get(dateStr) || 0;
    return { date: dateStr, mins };
  });

  return (
    <div className="w-full h-full flex items-end gap-[2px] overflow-hidden">
      {cells.map((cell, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm transition-colors ${getIntensityTier(cell.mins)}`}
          style={{ height: 9, borderRadius: 2 }}
          title={`${cell.date}: ${Math.floor(cell.mins)} mins`}
        />
      ))}
    </div>
  );
};
