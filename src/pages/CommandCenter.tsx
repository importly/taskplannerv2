import { useEffect, useRef, useState } from "react";
import { useTimerStore } from "../stores/timerStore";
import { CalendarNextUp } from "../components/cc/CalendarNextUp";
import { GoalStatsPanel } from "../components/cc/GoalStatsPanel";
import { CompactWhirlwind } from "../components/cc/CompactWhirlwind";
import { CalendarFeed } from "../components/cc/CalendarFeed";
import { HeatmapStrip } from "../components/cc/HeatmapStrip";

const TARGET_SECONDS = 1500;

export default function CommandCenter() {
  const { status, startTime, focusElapsedSeconds, start, pause, resume, stop, penalized } = useTimerStore();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMini = windowWidth < 400;

  // Refs for 60fps animation without React re-renders
  const airDigRef = useRef<HTMLDivElement>(null);
  const waterDigRef = useRef<HTMLDivElement>(null);
  const waterRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  const reqRef = useRef<number | undefined>(undefined);
  const animPRef = useRef(0);
  const phaseRef = useRef(0);

  // Derive target configuration based on current status
  const getConfig = () => {
    if (penalized) {
      return {
        bg: "#FF3B30",
        targetP: 1,
        waveY: 72,
      };
    }
    switch (status) {
      case "ACTIVE":
        return {
          bg: "#E1FF00",
          targetP: 1, // Actually driven by time, not fixed 1
          waveY: 96,
        };
      case "PAUSED":
        return {
          bg: "#1C1C1E",
          targetP: 1, // Driven by frozen time
          waveY: 188,
        };
      case "IDLE":
      default:
        return {
          bg: "transparent",
          targetP: 0,
          waveY: 280, // Below the view
        };
    }
  };

  useEffect(() => {
    const tick = () => {
      const cfg = getConfig();
      phaseRef.current += 0.018;

      let currentSeconds = focusElapsedSeconds;
      if (status === "ACTIVE" && startTime) {
        currentSeconds += (Date.now() - startTime) / 1000;
      }
      
      const timeP = status === "IDLE" ? 0 : Math.min(currentSeconds / TARGET_SECONDS, 1);
      
      // Update digits directly
      const formatTime = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        if (h > 0) return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
      };
      
      const timeStr = formatTime(currentSeconds);
      if (airDigRef.current) airDigRef.current.textContent = timeStr;
      if (waterDigRef.current) waterDigRef.current.textContent = timeStr;

      // Animate progress smoothly towards target
      const targetAnimP = timeP;
      animPRef.current += (targetAnimP - animPRef.current) * 0.048;
      if (Math.abs(animPRef.current - targetAnimP) < 0.001) animPRef.current = targetAnimP;

      const p = animPRef.current;

      // Construct clip path
      if (waterRef.current && zoneRef.current) {
        if (!cfg.bg || p < 0.005) {
          waterRef.current.style.clipPath = "inset(0 0 0 100%)";
          waterRef.current.style.background = "transparent";
        } else {
          waterRef.current.style.background = cfg.bg;
          
          const W = zoneRef.current.clientWidth;
          const H = zoneRef.current.clientHeight;
          const floodX = W * p;
          
          const baseY = H + 20;
          const waveY = baseY + (cfg.waveY - baseY) * p;
          
          const osc = (p > 0.92 && status !== "IDLE") ? 7 * Math.sin(phaseRef.current) : 0;
          const ey = waveY + osc;
          const py = waveY - 28 + osc;
          
          const c1x = floodX * 0.25;
          const c2x = floodX * 0.75;
          
          if (floodX >= 1) {
            const d = [
              `M 0,${ey.toFixed(1)}`,
              `C ${c1x.toFixed(1)},${py.toFixed(1)} ${c2x.toFixed(1)},${py.toFixed(1)} ${floodX.toFixed(1)},${ey.toFixed(1)}`,
              `L ${floodX.toFixed(1)},${H}`,
              `L 0,${H}`,
              `Z`
            ].join(" ");
            waterRef.current.style.clipPath = `path('${d}')`;
          }
        }
      }

      reqRef.current = requestAnimationFrame(tick);
    };

    reqRef.current = requestAnimationFrame(tick);
    return () => {
      if (reqRef.current !== undefined) {
        cancelAnimationFrame(reqRef.current);
      }
    };
  }, [status, startTime, focusElapsedSeconds, penalized]);

  // Determine state labels and colors
  let stateLbl = "Idle";
  let airLblClass = "text-[#48484A]";
  let airDigClass = "text-white/30";
  let waterLblClass = "text-black/45";
  let waterDigClass = "text-black";
  let waterBtnClass = "bg-black/10 text-black/65 border-black/15";
  let botBg = "transparent";
  let topBorder = "bg-white/[0.06]";

  if (penalized) {
    stateLbl = "âš  Penalized â€” 0 XP";
    airLblClass = "text-[#FF3B30]";
    airDigClass = "text-[#FF3B30]";
    waterLblClass = "text-white/75";
    waterDigClass = "text-white";
    waterBtnClass = "bg-black/15 text-white border-white/15";
    botBg = "bg-[#FF3B30]/[0.06]";
    topBorder = "bg-[#FF3B30]";
  } else if (status === "ACTIVE") {
    stateLbl = "Active";
    airLblClass = "text-[#E1FF00]/65";
    airDigClass = "text-white";
    waterLblClass = "text-black/45";
    waterDigClass = "text-black";
    waterBtnClass = "bg-black/10 text-black/65 border-black/15";
    botBg = "bg-[#E1FF00]/[0.07]";
    topBorder = "bg-[#E1FF00]";
  } else if (status === "PAUSED") {
    stateLbl = "Paused";
    airLblClass = "text-[#555555]";
    airDigClass = "text-white/40";
    waterLblClass = "text-white/20";
    waterDigClass = "text-white/30";
    waterBtnClass = "bg-white/5 text-white/35 border-white/5";
    botBg = "bg-white/5";
    topBorder = "bg-[#3A3A3C]";
  }

  // Dual layer rendering helper
  const renderTimerContent = (isWater: boolean) => {
    const isIdle = status === "IDLE";
    
    return (
      <div className={`absolute inset-0 flex items-center justify-center ${isWater ? "z-10 pointer-events-none" : "z-0"}`}>
        <div className="flex flex-col items-center text-center" style={{ width: 380 }}>
          <div className={`font-mono text-[10px] font-bold tracking-[0.14em] uppercase mb-2 ${isWater ? waterLblClass : airLblClass}`}>
            {stateLbl}
          </div>
          <div
            ref={isWater ? waterDigRef : airDigRef}
            className={`font-mono font-bold leading-none ${isWater ? waterDigClass : airDigClass}`}
            style={{ fontSize: 96, letterSpacing: "-0.06em" }}
          >
            00:00
          </div>

          {/* Tags */}
          <div className="flex gap-1.5 justify-center mt-2.5" style={{ minHeight: 22 }}>
            {!isIdle && (
              <div className={`text-[10px] px-2 py-0.5 rounded-full border ${isWater ? (penalized ? "bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/20" : "bg-black/10 text-black border-black/20") : "bg-white/5 text-white/40 border-white/10"}`}>
                #focus
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-center mt-4" style={{ minHeight: 34, pointerEvents: isWater ? "none" : "auto" }}>
            {isIdle ? (
              <button
                onClick={start}
                style={{ padding: "7px 20px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                className={isWater ? waterBtnClass : "bg-[#E1FF00] text-black"}
              >
                Start Session
              </button>
            ) : status === "ACTIVE" ? (
              <>
                <button onClick={pause} style={{ padding: "7px 20px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }} className={`border ${isWater ? waterBtnClass : "bg-white/5 text-white/70 border-white/10"}`}>Pause</button>
                <button onClick={stop} style={{ padding: "7px 20px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }} className={`border ${isWater ? waterBtnClass : "bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/20"}`}>Stop</button>
              </>
            ) : (
              <>
                <button onClick={resume} style={{ padding: "7px 20px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }} className={`border ${isWater ? waterBtnClass : "bg-white/5 text-white/45 border-white/7"}`}>Resume</button>
                <button onClick={stop} style={{ padding: "7px 20px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }} className={`border ${isWater ? waterBtnClass : "bg-white/5 text-white/45 border-white/7"}`}>Stop</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isMini) {
    return (
      <div className="w-full h-full bg-black relative overflow-hidden" ref={zoneRef}>
        <div className="absolute inset-0 bg-black z-0">
          {renderTimerContent(false)}
        </div>
        <div className="absolute inset-0 z-10" ref={waterRef}>
          {renderTimerContent(true)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-white font-sans overflow-hidden">
      {/* TOP ZONE — full-width relative container; flood bar fills this entire band */}
      <div ref={zoneRef} className="relative overflow-hidden flex-none min-h-[300px] border-b border-white/[0.07]">
        {/* State indicator — 3px top edge */}
        <div className={`absolute top-0 left-0 right-0 h-[3px] z-40 transition-colors duration-[350ms] ${topBorder}`} />

        {/* Air layer — base colors, visible in unflooded zone */}
        <div className="absolute inset-0 z-10">
          {renderTimerContent(false)}
        </div>

        {/* Water layer — flood color + inverted text, clip-path driven by rAF */}
        <div ref={waterRef} className="absolute inset-0 z-20 pointer-events-none">
          {renderTimerContent(true)}
        </div>

        {/* Left flank — glass panel, absolutely overlaid on timer zone */}
        <div
          className="absolute z-30"
          style={{
            top: "50%",
            transform: "translateY(-50%)",
            left: 20,
            width: 160,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <CalendarNextUp />
        </div>

        {/* Right flank — glass panel, absolutely overlaid on timer zone */}
        <div
          className="absolute z-30"
          style={{
            top: "50%",
            transform: "translateY(-50%)",
            right: 20,
            width: 160,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <GoalStatsPanel />
        </div>
      </div>

      {/* BOTTOM ZONE — flat grid, divided by single hairline, no box wrappers */}
      <div className={`flex-1 grid grid-cols-2 transition-colors duration-500 min-h-0 ${botBg}`}>
        <div className="border-r border-white/[0.07] overflow-hidden" style={{ padding: "14px 20px" }}>
          <CompactWhirlwind />
        </div>
        <div className="overflow-hidden" style={{ padding: "14px 20px" }}>
          <CalendarFeed />
        </div>
      </div>

      {/* HEATMAP STRIP — 40px, flat, no box */}
      <div className="flex-none border-t border-white/[0.07]" style={{ padding: "10px 20px", height: 40 }}>
        <HeatmapStrip />
      </div>
    </div>
  );
}
