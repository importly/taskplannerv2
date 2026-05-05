import { useTimerStore } from "../../stores/timerStore";

const TARGET_SECONDS = 1500; // 25 mins

export const FloodBar = () => {
  const { status, focusElapsedSeconds } = useTimerStore();

  // Calculate progress percentage
  const progress = Math.min((focusElapsedSeconds / TARGET_SECONDS) * 100, 100);

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
