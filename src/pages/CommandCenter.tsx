import { TimerDisplay } from "../components/timer/TimerDisplay";
import { FloodBar } from "../components/timer/FloodBar";
import { CalendarNextUp } from "../components/cc/CalendarNextUp";
import { GoalStatsPanel } from "../components/cc/GoalStatsPanel";
import { CompactWhirlwind } from "../components/cc/CompactWhirlwind";
import { CalendarFeed } from "../components/cc/CalendarFeed";
import { HeatmapStrip } from "../components/cc/HeatmapStrip";

export default function CommandCenter() {
  return (
    <div className="h-full flex flex-col bg-bg text-text font-sans overflow-hidden">
      {/* cc-top: Timer and Flanking Panels */}
      <div className="flex-1 relative flex flex-col items-center justify-center px-4 sm:px-8 min-h-0">
        <FloodBar />
        
        <div className="z-10 w-full flex items-center justify-between gap-8 max-w-7xl">
          {/* Left Flank */}
          <div className="hidden xl:block">
            <CalendarNextUp />
          </div>

          {/* Center: Timer */}
          <div className="flex-1 flex justify-center">
            <TimerDisplay />
          </div>

          {/* Right Flank */}
          <div className="hidden xl:block">
            <GoalStatsPanel />
          </div>
        </div>
      </div>

      {/* cc-bottom: Strips - Hidden on very small screens (mini-player) */}
      <div className="hidden sm:flex flex-none p-4 sm:p-8 justify-center gap-8 bg-surface/30 backdrop-blur-sm border-t border-border">
        <div className="w-full max-w-7xl flex flex-col md:flex-row gap-8">
          <div className="flex-1 flex justify-center md:justify-end">
            <CompactWhirlwind />
          </div>
          <div className="flex-1 flex justify-center md:justify-start">
            <CalendarFeed />
          </div>
        </div>
      </div>

      {/* cc-heatmap-strip - Hidden on very small screens */}
      <div className="hidden sm:block flex-none border-t border-border bg-black py-2">
        <HeatmapStrip />
      </div>
    </div>
  );
}
