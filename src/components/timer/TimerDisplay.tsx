import { useEffect, useState } from "react";
import { useTimerStore } from "../../stores/timerStore";
import { Play, Pause, Square, Trash2 } from "lucide-react";
import { Button } from "../ui/button";

export const TimerDisplay = () => {
  const {
    status,
    startTime,
    focusElapsedSeconds,
    start,
    pause,
    resume,
    stop,
    discard,
  } = useTimerStore();

  const [displaySeconds, setDisplaySeconds] = useState(0);

  useEffect(() => {
    let interval: number | undefined;

    const updateDisplay = () => {
      let total = focusElapsedSeconds;
      if (status === "ACTIVE" && startTime) {
        total += (Date.now() - startTime) / 1000;
      }
      setDisplaySeconds(Math.floor(total));
    };

    updateDisplay();

    if (status === "ACTIVE") {
      interval = window.setInterval(updateDisplay, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, startTime, focusElapsedSeconds]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [
      hrs > 0 ? hrs.toString().padStart(2, "0") : null,
      mins.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].filter(Boolean);

    return parts.join(":");
  };

  const getStatusLabel = () => {
    if (status === "ACTIVE") return "FOCUSING";
    if (status === "PAUSED") return "PAUSED";
    return "READY";
  };

  const getStatusColorClass = () => {
    if (status === "ACTIVE") return "text-accent";
    if (status === "PAUSED") return "text-muted";
    return "text-muted";
  };

  return (
    <div className="flex flex-col items-center justify-center" style={{ gap: 16 }}>
      {/* State Label */}
      <div className={`text-xs font-black tracking-[0.3em] uppercase ${getStatusColorClass()}`}>
        {getStatusLabel()}
      </div>

      {/* Giant Digits */}
      <div
        className={`timer-digits font-black leading-none tracking-tighter transition-all duration-500 ${getStatusColorClass()}`}
        style={{ fontSize: 120, mixBlendMode: "difference" }}
      >
        {formatTime(displaySeconds)}
      </div>
      
      {/* Controls */}
      <div className="flex items-center" style={{ gap: 24, marginTop: 32 }}>
        {status === "IDLE" && (
          <Button
            onClick={start}
            className="bg-accent text-black hover:bg-accent/90 text-lg sm:text-xl font-black rounded-none transition-transform hover:scale-105"
            style={{ padding: "24px 32px" }}
          >
            <Play size={24} fill="currentColor" className="mr-2" /> START
          </Button>
        )}

        {(status === "ACTIVE" || status === "PAUSED") && (
          <div className="flex items-center" style={{ gap: 16 }}>
            {status === "ACTIVE" ? (
              <Button
                onClick={pause}
                variant="outline"
                className="border-white/10 text-white hover:bg-white/5 rounded-none"
                style={{ padding: "24px 32px" }}
              >
                <Pause size={24} fill="currentColor" />
              </Button>
            ) : (
              <Button
                onClick={resume}
                className="bg-accent text-black hover:bg-accent/90 rounded-none"
                style={{ padding: "24px 32px" }}
              >
                <Play size={24} fill="currentColor" />
              </Button>
            )}
            
            <Button
              onClick={stop}
              variant="destructive"
              className="bg-danger hover:bg-danger/90 rounded-none"
              style={{ padding: "24px 32px" }}
            >
              <Square size={24} fill="currentColor" />
            </Button>

            <Button
              onClick={discard}
              variant="ghost"
              className="text-muted hover:text-danger rounded-none"
              style={{ padding: "24px 16px", marginLeft: 16 }}
            >
              <Trash2 size={20} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
