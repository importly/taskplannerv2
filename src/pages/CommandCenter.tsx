import { useEffect, useRef, useState, useCallback } from "react";
import { useTimerStore } from "../stores/timerStore";
import { CalendarNextUp } from "../components/cc/CalendarNextUp";
import { GoalStatsPanel } from "../components/cc/GoalStatsPanel";
import { CompactWhirlwind } from "../components/cc/CompactWhirlwind";
import { HeatmapStrip } from "../components/cc/HeatmapStrip";
import { RollingDigits } from "../components/timer/RollingDigits";

export default function CommandCenter() {
  const { status, startTime, focusElapsedSeconds, start, pause, resume, stop, penalized, targetMinutes, setTargetMinutes } = useTimerStore();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [displayTime, setDisplayTime] = useState(() => {
    const m = String(targetMinutes).padStart(2, "0");
    return targetMinutes >= 60
      ? `${String(Math.floor(targetMinutes / 60)).padStart(2, "0")}:${String(targetMinutes % 60).padStart(2, "0")}:00`
      : `${m}:00`;
  });

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMini = windowWidth < 400;

  // Refs for 60fps flood-bar animation
  const waterRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const reqRef = useRef<number | undefined>(undefined);
  const animPRef = useRef(0);
  const lastTimeStrRef = useRef("");

  // Format countdown time
  const formatTime = useCallback((currentSeconds: number, targetSecs: number) => {
    let remaining = targetSecs - currentSeconds;
    const isNeg = remaining < 0;
    remaining = Math.abs(remaining);

    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = Math.floor(remaining % 60);
    const sign = isNeg ? "-" : "";
    if (h > 0) return `${sign}${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${sign}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  // Derive target configuration
  const getConfig = useCallback(() => {
    if (penalized) return { bg: "#FF3B30" };
    switch (status) {
      case "ACTIVE": return { bg: "#E1FF00" };
      case "PAUSED": return { bg: "#1C1C1E" };
      default: return { bg: "transparent" };
    }
  }, [status, penalized]);

  // rAF loop — drives flood bar at 60fps, updates digit state ~1/sec
  useEffect(() => {
    const tick = () => {
      const cfg = getConfig();

      let currentSeconds = focusElapsedSeconds;
      if (status === "ACTIVE" && startTime) {
        currentSeconds += (Date.now() - startTime) / 1000;
      }

      const targetSeconds = useTimerStore.getState().targetMinutes * 60;
      const timeP = status === "IDLE" ? 0 : Math.min(currentSeconds / targetSeconds, 1);

      // Update digit state only when the string actually changes (~1/sec)
      const timeStr = status === "IDLE"
        ? (() => {
            const tm = useTimerStore.getState().targetMinutes;
            if (tm >= 60) {
              return `${String(Math.floor(tm / 60)).padStart(2, "0")}:${String(tm % 60).padStart(2, "0")}:00`;
            }
            return `${String(tm).padStart(2, "0")}:00`;
          })()
        : formatTime(currentSeconds, targetSeconds);

      if (timeStr !== lastTimeStrRef.current) {
        lastTimeStrRef.current = timeStr;
        setDisplayTime(timeStr);
      }

      // Flood bar animation
      const targetAnimP = timeP;
      animPRef.current += (targetAnimP - animPRef.current) * 0.048;
      if (Math.abs(animPRef.current - targetAnimP) < 0.001) animPRef.current = targetAnimP;
      const p = animPRef.current;

      if (waterRef.current && zoneRef.current) {
        if (!cfg.bg || p < 0.005) {
          waterRef.current.style.clipPath = "inset(0 100% 0 0)";
          waterRef.current.style.background = "transparent";
        } else {
          waterRef.current.style.background = cfg.bg;
          waterRef.current.style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
        }
      }

      reqRef.current = requestAnimationFrame(tick);
    };

    reqRef.current = requestAnimationFrame(tick);
    return () => {
      if (reqRef.current !== undefined) cancelAnimationFrame(reqRef.current);
    };
  }, [status, startTime, focusElapsedSeconds, penalized, targetMinutes, getConfig, formatTime]);

  // Scroll-to-select handler (IDLE only)
  const scrollAccum = useRef(0);
  const scrollDirRef = useRef<number | undefined>(undefined);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (status !== "IDLE") return;
    e.preventDefault();

    scrollAccum.current += e.deltaY;
    const threshold = 40;

    if (Math.abs(scrollAccum.current) >= threshold) {
      const steps = Math.sign(scrollAccum.current); // +1 = scroll down, -1 = scroll up
      scrollAccum.current = 0;

      // scroll up (+1 after negation) = increase, scroll down (-1) = decrease
      scrollDirRef.current = -steps;

      const current = useTimerStore.getState().targetMinutes;
      const next = Math.max(1, Math.min(180, current - steps));
      if (next !== current) {
        setTargetMinutes(next);
      }
    }
  }, [status, setTargetMinutes]);

  // State labels and colors
  let stateLbl = "Idle";
  let airLblClass = "text-white/60";
  let airDigColor = "rgba(255,255,255,0.5)";
  let waterLblClass = "text-black/45";
  let waterDigColor = "rgba(0,0,0,1)";
  let waterBtnClass = "bg-black/10 text-black/65 border-black/15";
  let botBg = "transparent";
  let topBorder = "rgba(255,255,255,0.06)";

  if (penalized) {
    stateLbl = "PENALIZED - 0 XP";
    airLblClass = "text-[#FF3B30]";
    airDigColor = "#FF3B30";
    waterLblClass = "text-white/75";
    waterDigColor = "rgba(255,255,255,1)";
    waterBtnClass = "bg-black/15 text-white border-white/15";
    botBg = "rgba(255,59,48,0.06)";
    topBorder = "#FF3B30";
  } else if (status === "ACTIVE") {
    stateLbl = "Active";
    airLblClass = "text-[#E1FF00]/65";
    airDigColor = "rgba(255,255,255,1)";
    waterLblClass = "text-black/45";
    waterDigColor = "rgba(0,0,0,1)";
    waterBtnClass = "bg-black/10 text-black/65 border-black/15";
    botBg = "transparent";
    topBorder = "#E1FF00";
  } else if (status === "PAUSED") {
    stateLbl = "Paused";
    airLblClass = "text-white/50";
    airDigColor = "rgba(255,255,255,0.4)";
    waterLblClass = "text-white/20";
    waterDigColor = "rgba(255,255,255,0.3)";
    waterBtnClass = "bg-white/5 text-white/50 border-white/10";
    botBg = "rgba(255,255,255,0.05)";
    topBorder = "#555555";
  }

  const hasHours = displayTime.split(":").length > 2;
  const fontSize = hasHours ? "clamp(72px, 11vw, 180px)" : "clamp(96px, 15vw, 240px)";

  // Dual layer rendering
  const fmtIdleMinutes = (n: number) => {
    if (n >= 60) return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}:00`;
    return `${String(n).padStart(2, "0")}:00`;
  };

  const renderTimerContent = (isWater: boolean) => {
    const isIdle = status === "IDLE";
    const digColor = isWater ? waterDigColor : airDigColor;
    // 3 ghost rows above (n-3 … n-1, top→bottom) and below (n+1 … n+3, top→bottom)
    const ghostsAbove = isIdle && !isWater
      ? [3, 2, 1].map(off => { const v = targetMinutes - off; return v >= 1 ? fmtIdleMinutes(v) : null; })
      : [];
    const ghostsBelow = isIdle && !isWater
      ? [1, 2, 3].map(off => { const v = targetMinutes + off; return v <= 180 ? fmtIdleMinutes(v) : null; })
      : [];
    const aboveOpacity = [0.05, 0.11, 0.19]; // farthest → closest
    const belowOpacity = [0.19, 0.11, 0.05]; // closest → farthest
    const timerDirection = isIdle ? scrollDirRef.current : -1;

    return (
      <div className={`absolute inset-0 flex items-center justify-center ${isWater ? "z-10 pointer-events-none" : "z-0"}`}>
        <div className="flex flex-col items-center text-center relative z-10"
          style={{ transform: isIdle ? "scale(0.9)" : "scale(1)", transition: "transform 0.5s ease" }}
        >
          <div className={`text-xs font-bold tracking-[0.14em] uppercase ${isWater ? waterLblClass : airLblClass}`} style={{ marginBottom: 16 }}>
            {stateLbl}
          </div>

          {/* Rolling digits — scroll to select in IDLE */}
          <div
            onWheel={!isWater ? handleWheel : undefined}
            style={{
              cursor: isIdle && !isWater ? "ns-resize" : undefined,
              position: "relative",
              overflow: "visible",
            }}
          >
            {/* Ghost stacks — 3 rows above and below */}
            {isIdle && !isWater && (
              <>
                {/* Above: translateY(-100%) shifts the whole stack up by its own height */}
                <div style={{
                  position: "absolute", top: 0, left: "50%",
                  transform: "translate(-50%, -100%)",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  pointerEvents: "none", userSelect: "none",
                }}>
                  {ghostsAbove.map((val, i) => val ? (
                    <RollingDigits
                      key={i}
                      value={val}
                      direction={timerDirection}
                      className="font-mono font-bold"
                      style={{ fontSize, letterSpacing: "-0.04em", color: `rgba(255,255,255,${aboveOpacity[i]})`, whiteSpace: "nowrap" }}
                    />
                  ) : <div key={i} style={{ height: "1em", fontSize }} />)}
                </div>

                {/* Below: translateY(100%) shifts the whole stack down by its own height */}
                <div style={{
                  position: "absolute", bottom: 0, left: "50%",
                  transform: "translate(-50%, 100%)",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  pointerEvents: "none", userSelect: "none",
                }}>
                  {ghostsBelow.map((val, i) => val ? (
                    <RollingDigits
                      key={i}
                      value={val}
                      direction={timerDirection}
                      className="font-mono font-bold"
                      style={{ fontSize, letterSpacing: "-0.04em", color: `rgba(255,255,255,${belowOpacity[i]})`, whiteSpace: "nowrap" }}
                    />
                  ) : <div key={i} style={{ height: "1em", fontSize }} />)}
                </div>
              </>
            )}

            <RollingDigits
              value={displayTime}
              direction={timerDirection}
              className="font-mono font-bold"
              style={{
                fontSize,
                letterSpacing: "-0.04em",
                color: digColor,
                transition: "font-size 0.5s ease, color 0.35s ease",
              }}
            />
          </div>

          {/* Scroll hint in IDLE */}
          {isIdle && !isWater && (
            <div className="font-mono text-[10px] uppercase tracking-[0.12em]"
              style={{ color: "#3A3A3C", marginTop: 14 }}
            >
              scroll to set · min
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-center" style={{ gap: 16, marginTop: isIdle ? 24 : 32, minHeight: 48, pointerEvents: isWater ? "none" : "auto" }}>
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
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-black text-white font-sans overflow-hidden">
      {/* TOP ZONE — flood bar fills this band */}
      <div ref={zoneRef} className="relative overflow-hidden" style={{ flex: isMini ? "1" : "0 0 62%", borderBottom: isMini ? "none" : "1px solid rgba(255,255,255,0.07)" }}>
        {/* State indicator — 3px top edge */}
        <div className="absolute top-0 left-0 right-0 z-40 transition-colors duration-[350ms]" style={{ height: 3, background: topBorder }} />

        {/* Air layer */}
        <div className="absolute inset-0 z-10">
          {renderTimerContent(false)}
        </div>

        {/* Water layer — clip-path driven */}
        <div ref={waterRef} className="absolute inset-0 z-20 pointer-events-none">
          {renderTimerContent(true)}
        </div>

        {/* Left flank */}
        <div
          className="absolute z-30 transition-all duration-700 ease-in-out"
          style={{
            top: "50%", transform: "translateY(-50%)", left: "2vw", width: 260,
            opacity: windowWidth < 1150 || isMini ? 0 : 1,
            pointerEvents: windowWidth < 1150 || isMini ? "none" : "auto",
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "16px 20px",
          }}
        >
          <CalendarNextUp />
        </div>

        {/* Right flank */}
        <div
          className="absolute z-30 transition-all duration-700 ease-in-out"
          style={{
            top: "50%", transform: "translateY(-50%)", right: "2vw", width: 260,
            opacity: windowWidth < 1150 || isMini ? 0 : 1,
            pointerEvents: windowWidth < 1150 || isMini ? "none" : "auto",
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "16px 20px",
          }}
        >
          <GoalStatsPanel />
        </div>
      </div>

      {/* BOTTOM ZONE */}
      {!isMini && (
        <div
          className="flex-1 flex flex-col transition-colors duration-500"
          style={{ minHeight: 150, background: botBg === "transparent" ? undefined : botBg }}
        >
          <div className="flex-1 flex flex-col overflow-hidden" style={{ padding: "20px 30px" }}>
            <CompactWhirlwind />
          </div>
        </div>
      )}

      {/* HEATMAP STRIP */}
      {!isMini && (
        <div className="relative flex-none border-t border-white/[0.05] bg-black/40 backdrop-blur-md" style={{ padding: "14px 24px", height: 44 }}>
          <HeatmapStrip />
        </div>
      )}
    </div>
  );
}
