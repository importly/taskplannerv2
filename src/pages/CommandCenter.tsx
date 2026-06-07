import { useEffect, useRef, useState, useCallback } from "react";
import { useTimerStore } from "../stores/timerStore";
import { useSessionStore } from "../stores/sessionStore";
import { GoalSelector } from "../components/cc/GoalSelector";
import { CompactTasks } from "../components/cc/CompactWhirlwind";
import { HeatmapStrip } from "../components/cc/HeatmapStrip";
import { RollingDigits } from "../components/timer/RollingDigits";
import { Clock, TimerReset } from "lucide-react";

export default function CommandCenter() {
  const { status, timerMode, startTime, focusElapsedSeconds, start, pause, resume, stop, penalized, targetMinutes, setTargetMinutes, setTimerMode } = useTimerStore();
  const openManualSession = useSessionStore((state) => state.openManualSession);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [displayTime, setDisplayTime] = useState(() => {
    if (timerMode === "stopwatch") return "00:00";
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

  const formatElapsedTime = useCallback((currentSeconds: number) => {
    const totalSeconds = Math.max(0, Math.floor(currentSeconds));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (h > 0) return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  const formatCountdownTime = useCallback((currentSeconds: number, targetSecs: number) => {
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

  const formatIdleCountdown = useCallback((minutes: number) => {
    if (minutes >= 60) {
      return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
    }
    return `${String(minutes).padStart(2, "0")}:00`;
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
        ? timerMode === "stopwatch"
          ? "00:00"
          : formatIdleCountdown(useTimerStore.getState().targetMinutes)
        : timerMode === "stopwatch"
          ? formatElapsedTime(currentSeconds)
          : formatCountdownTime(currentSeconds, targetSeconds);

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
  }, [status, timerMode, startTime, focusElapsedSeconds, penalized, targetMinutes, getConfig, formatElapsedTime, formatCountdownTime, formatIdleCountdown]);

  // Scroll-to-select handler (IDLE only)
  const scrollAccum = useRef(0);
  const scrollDirRef = useRef<number | undefined>(undefined);
  const wheelDivRef = useRef<HTMLDivElement>(null);
  const handleWheel = useCallback((e: WheelEvent) => {
    if (status !== "IDLE" || timerMode !== "countdown") return;
    e.preventDefault();

    scrollAccum.current += e.deltaY;
    const threshold = 40;

    if (Math.abs(scrollAccum.current) >= threshold) {
      const steps = Math.sign(scrollAccum.current); // +1 = scroll down, -1 = scroll up
      scrollAccum.current = 0;

      // reversed: scroll down (+1) = increase, scroll up (-1) = decrease
      scrollDirRef.current = steps;

      const current = useTimerStore.getState().targetMinutes;
      const next = Math.max(1, Math.min(180, current + steps));
      if (next !== current) {
        setTargetMinutes(next);
      }
    }
  }, [status, timerMode, setTargetMinutes]);

  useEffect(() => {
    const el = wheelDivRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Per-state colors (state label removed — see phone view for tasks list).
  let airDigColor = "rgba(255,255,255,0.5)";
  let waterDigColor = "rgba(0,0,0,1)";
  let waterBtnClass = "bg-black/10 text-black/65 border-black/15";
  let botBg = "transparent";
  let topBorder = "rgba(255,255,255,0.06)";

  if (penalized) {
    airDigColor = "#FF3B30";
    waterDigColor = "rgba(255,255,255,1)";
    waterBtnClass = "bg-black/15 text-white border-white/15";
    botBg = "rgba(255,59,48,0.06)";
    topBorder = "#FF3B30";
  } else if (status === "ACTIVE") {
    airDigColor = "rgba(255,255,255,1)";
    waterDigColor = "rgba(0,0,0,1)";
    waterBtnClass = "bg-black/10 text-black/65 border-black/15";
    botBg = "transparent";
    topBorder = "#E1FF00";
  } else if (status === "PAUSED") {
    airDigColor = "rgba(255,255,255,0.4)";
    waterDigColor = "rgba(255,255,255,0.3)";
    waterBtnClass = "bg-white/5 text-white/50 border-white/10";
    botBg = "rgba(255,255,255,0.05)";
    topBorder = "#555555";
  }

  const hasHours = displayTime.split(":").length > 2;
  const fontSize = hasHours ? "clamp(72px, 11vw, 180px)" : "clamp(96px, 15vw, 240px)";

  const renderModeSwitcher = () => {
    const locked = status !== "IDLE";
    const compact = windowWidth < 760;
    const modes = [
      { mode: "countdown" as const, label: "Countdown", icon: TimerReset },
      { mode: "stopwatch" as const, label: "Stopwatch", icon: Clock },
    ];

    return (
      <div
        className="absolute z-40 transition-all duration-500 ease-in-out"
        style={{
          top: compact ? 14 : "50%",
          left: compact ? 12 : "2vw",
          transform: compact ? undefined : "translateY(-50%)",
          width: compact ? 44 : 136,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: 6,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          pointerEvents: "auto",
        }}
        aria-label="Timer mode"
      >
        {modes.map(({ mode, label, icon: Icon }) => {
          const active = timerMode === mode;
          return (
            <button
              key={mode}
              onClick={() => setTimerMode(mode)}
              disabled={locked}
              aria-pressed={active}
              title={locked ? "Mode locks while a session is running" : label}
              style={{
                height: compact ? 32 : 38,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: compact ? "center" : "flex-start",
                gap: compact ? 0 : 8,
                padding: compact ? 0 : "0 10px",
                borderRadius: 7,
                border: active ? "1px solid rgba(225,255,0,0.28)" : "1px solid transparent",
                background: active ? "rgba(225,255,0,0.12)" : "transparent",
                color: active ? "#E1FF00" : "rgba(255,255,255,0.45)",
                cursor: locked ? "not-allowed" : "pointer",
                opacity: locked && !active ? 0.35 : 1,
                transition: "background 180ms ease, color 180ms ease, border-color 180ms ease, opacity 180ms ease",
              }}
            >
              <Icon size={15} strokeWidth={2} />
              {!compact && (
                <span
                  className="uppercase"
                  style={{ fontSize: 10, letterSpacing: "0.08em", fontWeight: 700, lineHeight: 1 }}
                >
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const renderTimerContent = (isWater: boolean) => {
    const isIdle = status === "IDLE";
    const isCountdownIdle = isIdle && timerMode === "countdown";
    const digColor = isWater ? waterDigColor : airDigColor;
    // 3 ghost rows above (n-3 … n-1, top→bottom) and below (n+1 … n+3, top→bottom)
    const ghostsAbove = isCountdownIdle && !isWater
      ? [3, 2, 1].map(off => { const v = targetMinutes - off; return v >= 1 ? formatIdleCountdown(v) : null; })
      : [];
    const ghostsBelow = isCountdownIdle && !isWater
      ? [1, 2, 3].map(off => { const v = targetMinutes + off; return v <= 180 ? formatIdleCountdown(v) : null; })
      : [];
    const aboveOpacity = [0.05, 0.11, 0.19]; // farthest → closest
    const belowOpacity = [0.19, 0.11, 0.05]; // closest → farthest
    const timerDirection = isCountdownIdle ? scrollDirRef.current : -1;

    return (
      <div className={`absolute inset-0 flex items-center justify-center ${isWater ? "z-10 pointer-events-none" : "z-0"}`}>
        <div className="flex flex-col items-center text-center relative z-10"
          style={{ transform: isIdle ? "scale(0.9)" : "scale(1)", transition: "transform 0.5s ease" }}
        >

          {/* Rolling digits — scroll to select in IDLE */}
          <div
            ref={!isWater ? wheelDivRef : undefined}
            style={{
              cursor: isCountdownIdle && !isWater ? "ns-resize" : undefined,
              position: "relative",
              overflow: "visible",
            }}
          >
            {/* Ghost stacks — 3 rows above and below */}
            {isCountdownIdle && !isWater && (
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
                      className="timer-digits font-bold"
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
                      className="timer-digits font-bold"
                      style={{ fontSize, letterSpacing: "-0.04em", color: `rgba(255,255,255,${belowOpacity[i]})`, whiteSpace: "nowrap" }}
                    />
                  ) : <div key={i} style={{ height: "1em", fontSize }} />)}
                </div>
              </>
            )}

            <RollingDigits
              value={displayTime}
              direction={timerDirection}
              className="timer-digits font-bold"
              style={{
                fontSize,
                letterSpacing: "-0.04em",
                color: digColor,
                transition: "font-size 0.5s ease, color 0.35s ease",
              }}
            />
          </div>

          {/* Scroll hint in IDLE */}
          {isCountdownIdle && !isWater && (
            <div className="text-[10px] uppercase tracking-[0.12em]"
              style={{ color: "#3A3A3C", marginTop: 14 }}
            >
              scroll to set · min
            </div>
          )}

          {/* Buttons */}
          {(() => {
            // Wraps a button with a blurred dark halo that actually obscures content behind it
            const H = ({ children }: { children: React.ReactNode }) => !isWater ? (
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{
                  position: "absolute",
                  inset: "-28px -40px",
                  borderRadius: "9999px",
                  background: "radial-gradient(ellipse at center, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.35) 50%, transparent 100%)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  maskImage: "radial-gradient(ellipse at center, black 30%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 100%)",
                  pointerEvents: "none",
                }} />
                <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
              </div>
            ) : <>{children}</>;

            return (
              <div className="flex justify-center" style={{ gap: 16, marginTop: isIdle ? 24 : 32, minHeight: 48, pointerEvents: isWater ? "none" : "auto" }}>
                {isIdle ? (
                  <>
                    <H>
                      <button
                        onClick={start}
                        style={{ padding: "12px 32px" }}
                        className={`rounded-full text-base font-semibold transition-all hover:scale-105 active:scale-95 ${isWater ? waterBtnClass : "bg-[#E1FF00] text-black"}`}
                      >
                        {timerMode === "stopwatch" ? "Start Stopwatch" : "Start Session"}
                      </button>
                    </H>
                    {!isWater && (
                      <H>
                        <button
                          onClick={openManualSession}
                          style={{ padding: "12px 22px" }}
                          className="rounded-full text-base font-semibold border border-white/15 bg-white/5 text-white/75 transition-all hover:bg-white/10 hover:text-white active:scale-95"
                        >
                          Log Missed Session
                        </button>
                      </H>
                    )}
                  </>
                ) : status === "ACTIVE" ? (
                  <>
                    <H><button onClick={pause} style={{ padding: "10px 24px" }} className={`rounded-full text-sm font-semibold border transition-colors hover:bg-white/10 ${isWater ? waterBtnClass : "bg-white/5 text-white/90 border-white/20"}`}>Pause</button></H>
                    <H><button onClick={stop} style={{ padding: "10px 24px" }} className={`rounded-full text-sm font-semibold border transition-colors hover:bg-[#FF3B30]/20 ${isWater ? waterBtnClass : "bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30"}`}>Stop</button></H>
                  </>
                ) : (
                  <>
                    <H><button onClick={resume} style={{ padding: "10px 24px" }} className={`rounded-full text-sm font-semibold border transition-colors hover:bg-white/10 ${isWater ? waterBtnClass : "bg-white/5 text-white/90 border-white/20"}`}>Resume</button></H>
                    <H><button onClick={stop} style={{ padding: "10px 24px" }} className={`rounded-full text-sm font-semibold border transition-colors hover:bg-white/10 ${isWater ? waterBtnClass : "bg-white/5 text-white/70 border-white/20"}`}>Stop</button></H>
                  </>
                )}
              </div>
            );
          })()}
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

        {renderModeSwitcher()}

        {/* Air layer */}
        <div className="absolute inset-0 z-10">
          {renderTimerContent(false)}
        </div>

        {/* Water layer — clip-path driven */}
        <div ref={waterRef} className="absolute inset-0 z-20 pointer-events-none">
          {renderTimerContent(true)}
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
          <GoalSelector />
        </div>
      </div>

      {/* BOTTOM ZONE */}
      {!isMini && (
        <div
          className="flex-1 flex flex-col transition-colors duration-500"
          style={{ minHeight: 150, background: botBg === "transparent" ? undefined : botBg }}
        >
          <div className="flex-1 flex overflow-hidden" style={{ padding: "20px 30px", gap: 0 }}>
            {/* Goal selector hidden when the floating goal panel is visible in the timer zone */}
            {windowWidth < 1150 && (
              <div
                className="flex-none flex flex-col overflow-hidden"
                style={{ width: 200, paddingRight: 24, borderRight: "1px solid rgba(255,255,255,0.06)" }}
              >
                <GoalSelector />
              </div>
            )}
            {/* Whirlwind tasks */}
            <div className="flex-1 flex flex-col overflow-hidden" style={{ paddingLeft: windowWidth < 1150 ? 24 : 0 }}>
              <CompactTasks />
            </div>
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
