import { useEffect, useState } from "react";
import { useTimerStore } from "../../stores/timerStore";

export const FloodBar = () => {
  const { status, startTime, focusElapsedSeconds, targetMinutes } = useTimerStore();
  const TARGET_SECONDS = targetMinutes * 60;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: number | undefined;

    const updateProgress = () => {
      let total = focusElapsedSeconds;
      if (status === "ACTIVE" && startTime) {
        total += (Date.now() - startTime) / 1000;
      }
      setProgress(Math.min((total / TARGET_SECONDS) * 100, 100));
    };

    updateProgress();

    if (status === "ACTIVE") {
      interval = window.setInterval(updateProgress, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, startTime, focusElapsedSeconds]);

  const getStatusColor = () => {
    switch (status) {
      case "ACTIVE":
        return "var(--color-accent)";
      case "PAUSED":
        return "#1C1C1E";
      case "IDLE":
        return "transparent";
      default:
        return "var(--color-accent)";
    }
  };

  const getOpacity = () => {
    if (status === "IDLE") return 0;
    if (status === "PAUSED") return 0.4;
    return 0.25;
  };

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div
        className="absolute top-0 left-0 h-full transition-colors duration-800 ease-in-out"
        style={{
          width: `${progress}%`,
          backgroundColor: getStatusColor(),
          opacity: getOpacity(),
        }}
      />
      
      {/* Ambient Glow */}
      <div
        className="absolute top-0 left-0 h-full transition-all duration-800 ease-in-out"
        style={{
          width: `${progress}%`,
          boxShadow: status === "ACTIVE" ? `0 0 100px 20px var(--color-accent)` : "none",
          opacity: 0.1,
        }}
      />
    </div>
  );
};
