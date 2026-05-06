import { useEffect, useRef, useState } from "react";
import { useTimerStore } from "../stores/timerStore";
import { CalendarNextUp } from "../components/cc/CalendarNextUp";
import { GoalStatsPanel } from "../components/cc/GoalStatsPanel";
import { CompactWhirlwind } from "../components/cc/CompactWhirlwind";
import { HeatmapStrip } from "../components/cc/HeatmapStrip";
import { TimePicker } from "../components/timer/TimePicker";

export default function CommandCenter() {
  const { status, startTime, focusElapsedSeconds, start, pause, resume, stop, penalized, targetMinutes } = useTimerStore();
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
      };
    }
    switch (status) {
      case "ACTIVE":
        return {
          bg: "#E1FF00",
          targetP: 1, // Actually driven by time, not fixed 1
        };
      case "PAUSED":
        return {
          bg: "#1C1C1E",
          targetP: 1, // Driven by frozen time
        };
      case "IDLE":
      default:
        return {
          bg: "transparent",
          targetP: 0,
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
      
      const targetSeconds = useTimerStore.getState().targetMinutes * 60;
      const timeP = status === "IDLE" ? 0 : Math.min(currentSeconds / targetSeconds, 1);
      
      // Update digits directly (Countdown format)
      const formatTime = (secs: number) => {
        let remaining = targetSeconds - secs;
        const isNeg = remaining < 0;
        remaining = Math.abs(remaining);
        
        const h = Math.floor(remaining / 3600);
        const m = Math.floor((remaining % 3600) / 60);
        const s = Math.floor(remaining % 60);
        const sign = isNeg ? "-" : "";
        if (h > 0) return `${sign}${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        return `${sign}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
          waterRef.current.style.clipPath = "inset(0 100% 0 0)";
          waterRef.current.style.background = "transparent";
        } else {
          waterRef.current.style.background = cfg.bg;
          // Simple left-to-right fill using inset(top right bottom left)
          // 100% right inset means 0 width. 0% right inset means full width.
          waterRef.current.style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
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
  }, [status, startTime, focusElapsedSeconds, penalized, targetMinutes]);

  // Determine state labels and colors
  let stateLbl = "Idle";
  let airLblClass = "text-white/60";
  let airDigClass = "text-white/50";
  let waterLblClass = "text-black/45";
  let waterDigClass = "text-black";
  let waterBtnClass = "bg-black/10 text-black/65 border-black/15";
  let botBg = "transparent";
  let topBorder = "bg-white/[0.06]";

  if (penalized) {
    stateLbl = "PENALIZED - 0 XP";
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
    botBg = "transparent";
    topBorder = "bg-[#E1FF00]";
  } else if (status === "PAUSED") {
    stateLbl = "Paused";
    airLblClass = "text-white/50";
    airDigClass = "text-white/40";
    waterLblClass = "text-white/20";
    waterDigClass = "text-white/30";
    waterBtnClass = "bg-white/5 text-white/50 border-white/10";
    botBg = "bg-white/5";
    topBorder = "bg-[#555555]";
  }

  // Dual layer rendering helper
  const renderTimerContent = (isWater: boolean) => {
    const isIdle = status === "IDLE";
    const hasHours = targetMinutes >= 60;
    
    return (
      <div className={`absolute inset-0 flex items-center justify-center ${isWater ? "z-10 pointer-events-none" : "z-0"}`}>
        <div className={`relative flex items-center transition-transform duration-500 ease-in-out ${isIdle ? "-translate-x-[70px]" : "translate-x-0"}`}>
          
          <div className="flex flex-col items-center text-center transition-transform duration-500 origin-center relative z-10" style={{ transform: isIdle ? "scale(0.85)" : "scale(1)" }}>
            <div className={`text-xs font-bold tracking-[0.14em] uppercase mb-4 ${isWater ? waterLblClass : airLblClass}`}>
              {stateLbl}
            </div>
            <div
              ref={isWater ? waterDigRef : airDigRef}
              className={`font-sans tabular-nums font-bold leading-none ${isWater ? waterDigClass : airDigClass}`}
              style={{ fontSize: hasHours ? "clamp(72px, 11vw, 180px)" : "clamp(96px, 15vw, 240px)", letterSpacing: "-0.04em", lineHeight: "0.85", transition: "font-size 0.5s ease" }}
            >
              {String(targetMinutes).padStart(2, "0")}:00
            </div>

            {/* Tags (removed to prevent overlap & confusion) */}
          <div className="flex gap-1.5 justify-center mt-2">
          </div>

            {/* Buttons */}
          <div className="flex gap-4 justify-center mt-8" style={{ minHeight: 48, pointerEvents: isWater ? "none" : "auto" }}>
            {isIdle ? (
              <button
                onClick={start}
                style={{ padding: "12px 32px" }}
                className={`rounded-full text-base font-semibold transition-all hover:scale-105 active:scale-95 ${isWater ? waterBtnClass : "bg-[#E1FF00] text-black"}`}
              >
                Start Session
              </button>
            ) : status === "ACTIVE" ? (
              <>
                <button onClick={pause} style={{ padding: "10px 24px" }} className={`rounded-full text-sm font-semibold border transition-colors hover:bg-white/10 ${isWater ? waterBtnClass : "bg-white/5 text-white/90 border-white/20"}`}>Pause</button>
                <button onClick={stop} style={{ padding: "10px 24px" }} className={`rounded-full text-sm font-semibold border transition-colors hover:bg-[#FF3B30]/20 ${isWater ? waterBtnClass : "bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30"}`}>Stop</button>
              </>
            ) : (
              <>
                <button onClick={resume} style={{ padding: "10px 24px" }} className={`rounded-full text-sm font-semibold border transition-colors hover:bg-white/10 ${isWater ? waterBtnClass : "bg-white/5 text-white/90 border-white/20"}`}>Resume</button>
                <button onClick={stop} style={{ padding: "10px 24px" }} className={`rounded-full text-sm font-semibold border transition-colors hover:bg-white/10 ${isWater ? waterBtnClass : "bg-white/5 text-white/70 border-white/20"}`}>Stop</button>
              </>
            )}
          </div>
          
          {/* Picker Side Panel - Only in Air layer */}
          {!isWater && (
            <div 
              className={`absolute left-full top-1/2 -translate-y-1/2 transition-all duration-500 ease-in-out ${isIdle ? "opacity-100 translate-x-0 delay-100" : "opacity-0 translate-x-8 pointer-events-none"}`}
              style={{ marginLeft: 60 }}
            >
              <TimePicker />
            </div>
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
    <div className="h-screen w-screen flex flex-col bg-black text-white font-sans overflow-hidden">
      {/* TOP ZONE — full-width relative container; flood bar fills this entire band */}
      <div ref={zoneRef} className="relative overflow-hidden border-b border-white/[0.07]" style={{ flex: "0 0 62%" }}>
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
          className="absolute z-30 transition-all duration-700 ease-in-out"
          style={{
            top: "50%",
            transform: "translateY(-50%)",
            left: "2vw",
            width: 260,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            padding: "16px 20px",
          }}
        >
          <CalendarNextUp />
        </div>

        {/* Right flank — glass panel, absolutely overlaid on timer zone */}
        <div
          className="absolute z-30 transition-all duration-700 ease-in-out"
          style={{
            top: "50%",
            transform: "translateY(-50%)",
            right: "2vw",
            width: 260,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            padding: "16px 20px",
          }}
        >
          <GoalStatsPanel />
        </div>
      </div>

      {/* BOTTOM ZONE — span width cleanly */}
      <div className={`flex-1 flex transition-colors duration-500 min-h-0 ${botBg}`}>
        <div className="flex-1 overflow-hidden" style={{ padding: "20px 30px" }}>
          <CompactWhirlwind />
        </div>
      </div>

      {/* HEATMAP STRIP — 44px, full width, sleek ribbon */}
      <div className="relative flex-none border-t border-white/[0.05] bg-black/40 backdrop-blur-md" style={{ padding: "14px 24px", height: 44 }}>
        <HeatmapStrip />
      </div>
    </div>
  );
}
