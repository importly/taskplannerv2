import { useEffect, useRef } from "react";
import { useTimerStore } from "../../stores/timerStore";

const MAX_MINUTES = 180;
const ITEM_HEIGHT = 48; // px

export function TimePicker() {
  const targetMinutes = useTimerStore((s) => s.targetMinutes);
  const setTargetMinutes = useTimerStore((s) => s.setTargetMinutes);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Create array from 1 to 180
  const minutes = Array.from({ length: MAX_MINUTES }, (_, i) => i + 1);

  // Scroll to current selected on mount
  useEffect(() => {
    if (containerRef.current) {
      const idx = minutes.indexOf(targetMinutes);
      if (idx !== -1) {
        containerRef.current.scrollTop = idx * ITEM_HEIGHT;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount so we don't fight the user's scrolling

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const idx = Math.round(scrollTop / ITEM_HEIGHT);
    const newTarget = minutes[idx];
    if (newTarget && newTarget !== targetMinutes) {
      setTargetMinutes(newTarget);
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Duration</div>
      <div 
        className="relative h-[40vh] w-[140px] overflow-hidden bg-white/[0.03] border border-white/10 rounded-3xl group transition-colors hover:bg-white/[0.05] hover:border-white/20" 
        style={{ 
          maskImage: "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)"
        }}
      >
        <div 
          ref={containerRef}
          className="h-full w-full overflow-y-auto no-scrollbar snap-y snap-mandatory"
          onScroll={handleScroll}
        >
        <div style={{ height: `calc(20vh - ${ITEM_HEIGHT / 2}px)` }} /> {/* Top padding */}
        {minutes.map((m) => {
          const isSelected = m === targetMinutes;
          return (
            <div 
              key={m} 
              className={`h-[48px] flex items-center justify-center snap-center cursor-pointer transition-all duration-200 font-sans tabular-nums ${isSelected ? 'text-[56px] font-bold text-white' : 'text-[32px] font-medium text-white/40 hover:text-white/60'}`}
              onClick={() => {
                if (containerRef.current) {
                  containerRef.current.scrollTo({ top: (m - 1) * ITEM_HEIGHT, behavior: 'smooth' });
                }
              }}
            >
              {m}
            </div>
          );
        })}
        <div style={{ height: `calc(20vh - ${ITEM_HEIGHT / 2}px)` }} /> {/* Bottom padding */}
      </div>
      
      {/* Scroll affordance dots */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-1 h-1 rounded-full bg-white/20" />
        <div className="w-1 h-1 rounded-full bg-white/40" />
        <div className="w-1 h-1 rounded-full bg-white/20" />
      </div>
    </div>
    </div>
  );
}
