import React from "react";
import { useTimerStore } from "../../stores/timerStore";

export const FloodBar = () => {
  const { status, focusElapsedSeconds, sessionGoalSeconds } = useTimerStore();

  // Calculate progress percentage
  // For now, let's assume a default goal if sessionGoalSeconds is not available
  const goal = sessionGoalSeconds || 3600; // 1 hour default
  const progress = Math.min((focusElapsedSeconds / goal) * 100, 100);

  const getStatusColor = () => {
    switch (status) {
      case "ACTIVE":
        return "var(--color-accent)";
      case "PAUSED":
        return "var(--color-muted)";
      case "IDLE":
        return "transparent";
      default:
        return "var(--color-accent)";
    }
  };

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div
        className="absolute bottom-0 left-0 w-full transition-all duration-1000 ease-linear opacity-20"
        style={{
          height: `${progress}%`,
          backgroundColor: getStatusColor(),
          filter: "blur(40px)",
        }}
      />
    </div>
  );
};
