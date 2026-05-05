import { useEffect, useState } from "react";
import { useTimerStore } from "../../stores/timerStore";
import { Play, Pause, Square, Trash2, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";

export const TimerDisplay = () => {
  const {
    status,
    startTime,
    pausedAt,
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

  const getStatusColor = () => {
    if (penalized || penaltyCountdown !== null) return "var(--color-danger)";
    if (status === "ACTIVE") return "var(--color-accent)";
    return "var(--color-muted)";
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-8">
      <div className="flex flex-col items-center">
        <div
          className="text-8xl font-mono tracking-tighter"
          style={{ color: getStatusColor() }}
        >
          {formatTime(displaySeconds)}
        </div>
        
        {penaltyCountdown !== null && (
          <div className="flex items-center gap-2 text-danger animate-pulse mt-4">
            <AlertCircle size={20} />
            <span className="font-mono text-xl">FOCUS LOST: {penaltyCountdown}s</span>
          </div>
        )}

        {penalized && (
          <div className="flex items-center gap-2 text-danger mt-4">
            <AlertCircle size={20} />
            <span className="font-bold">SESSION PENALIZED</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {status === "IDLE" && (
          <Button
            onClick={start}
            className="bg-accent text-black hover:bg-accent/90 px-8 py-6 text-lg font-bold"
          >
            <Play className="mr-2" fill="currentColor" /> START FOCUS
          </Button>
        )}

        {status === "ACTIVE" && (
          <>
            <Button
              onClick={pause}
              variant="outline"
              className="border-muted text-muted hover:text-white px-6 py-6"
            >
              <Pause />
            </Button>
            <Button
              onClick={stop}
              variant="destructive"
              className="bg-danger hover:bg-danger/90 px-6 py-6"
            >
              <Square fill="currentColor" />
            </Button>
          </>
        )}

        {status === "PAUSED" && (
          <>
            <Button
              onClick={resume}
              className="bg-accent text-black hover:bg-accent/90 px-8 py-6 text-lg font-bold"
            >
              <Play className="mr-2" fill="currentColor" /> RESUME
            </Button>
            <Button
              onClick={stop}
              variant="destructive"
              className="bg-danger hover:bg-danger/90 px-6 py-6"
            >
              <Square fill="currentColor" />
            </Button>
          </>
        )}

        {(status === "ACTIVE" || status === "PAUSED") && (
          <Button
            onClick={discard}
            variant="ghost"
            className="text-muted hover:text-danger px-4 py-6"
          >
            <Trash2 size={20} />
          </Button>
        )}
      </div>
    </div>
  );
};
