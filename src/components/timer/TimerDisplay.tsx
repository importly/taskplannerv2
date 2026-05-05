import { useEffect, useState } from "react";
import { useTimerStore } from "../../stores/timerStore";
import { Play, Pause, Square, Trash2, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";

export const TimerDisplay = () => {
  const {
    status,
    startTime,
    focusElapsedSeconds,
    penaltyCountdown,
    penalized,
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
    if (penalized) return "PENALIZED";
    if (penaltyCountdown !== null) return "FOCUS LOST";
    if (status === "ACTIVE") return "FOCUSING";
    if (status === "PAUSED") return "PAUSED";
    return "READY";
  };

  const getStatusColorClass = () => {
    if (penalized || penaltyCountdown !== null) return "text-danger";
    if (status === "ACTIVE") return "text-accent";
    if (status === "PAUSED") return "text-muted";
    return "text-muted";
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* State Label */}
      <div className={`text-xs font-black tracking-[0.3em] uppercase ${getStatusColorClass()}`}>
        {getStatusLabel()}
      </div>

      {/* Giant Digits */}
      <div
        className={`text-[5rem] sm:text-[8rem] lg:text-[12rem] font-mono font-bold leading-none tracking-tighter transition-all duration-500 ${getStatusColorClass()}`}
        style={{ mixBlendMode: "difference" }}
      >
        {formatTime(displaySeconds)}
      </div>
      
      {/* Penalty Info */}
      <div className="h-8">
        {penaltyCountdown !== null && (
          <div className="flex items-center gap-2 text-danger animate-pulse">
            <AlertCircle size={16} />
            <span className="font-mono text-sm uppercase tracking-wider">Penalty in {penaltyCountdown}s</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 mt-8">
        {status === "IDLE" && (
          <Button
            onClick={start}
            className="bg-accent text-black hover:bg-accent/90 px-6 sm:px-10 py-6 sm:py-8 text-lg sm:text-xl font-black rounded-none transition-transform hover:scale-105"
          >
            <Play size={24} fill="currentColor" className="mr-2" /> START
          </Button>
        )}

        {(status === "ACTIVE" || status === "PAUSED") && (
          <div className="flex items-center gap-2 sm:gap-4">
            {status === "ACTIVE" ? (
              <Button
                onClick={pause}
                variant="outline"
                className="border-white/10 text-white hover:bg-white/5 px-6 sm:px-8 py-6 sm:py-8 rounded-none"
              >
                <Pause size={24} fill="currentColor" />
              </Button>
            ) : (
              <Button
                onClick={resume}
                className="bg-accent text-black hover:bg-accent/90 px-6 sm:px-8 py-6 sm:py-8 rounded-none"
              >
                <Play size={24} fill="currentColor" />
              </Button>
            )}
            
            <Button
              onClick={stop}
              variant="destructive"
              className="bg-danger hover:bg-danger/90 px-6 sm:px-8 py-6 sm:py-8 rounded-none"
            >
              <Square size={24} fill="currentColor" />
            </Button>

            <Button
              onClick={discard}
              variant="ghost"
              className="text-muted hover:text-danger px-3 sm:px-4 py-6 sm:py-8 rounded-none ml-2 sm:ml-4"
            >
              <Trash2 size={20} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
