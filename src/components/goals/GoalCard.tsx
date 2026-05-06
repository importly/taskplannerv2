interface GoalCardProps {
  title: string;
  progress: number;
  totalFocusTimeSeconds: number;
  colorIndex: number;
  onClick: () => void;
  isArchived?: boolean;
}

const COLORS = ["#0A84FF", "#30D158", "#BF5AF2", "#FF9500", "#FF2D55"];

export function GoalCard({ title, progress, totalFocusTimeSeconds, colorIndex, onClick, isArchived }: GoalCardProps) {
  const h = Math.floor(totalFocusTimeSeconds / 3600);
  const m = Math.floor((totalFocusTimeSeconds % 3600) / 60);
  const accentColor = isArchived ? "#8E8E93" : COLORS[colorIndex % COLORS.length];

  return (
    <div
      onClick={onClick}
      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[16px] cursor-pointer flex flex-col justify-between w-full"
      style={{
        padding: "14px",
        minHeight: 150,
        transition: "background 200ms ease, border-color 200ms ease, transform 200ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms ease",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget;
        el.style.background = "rgba(255,255,255,0.09)";
        el.style.borderColor = "rgba(255,255,255,0.18)";
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = `0 12px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}22`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.background = "";
        el.style.borderColor = "";
        el.style.transform = "";
        el.style.boxShadow = "";
      }}
      onMouseDown={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "translateY(-3px)"; }}
    >
      {/* Top: Title */}
      <div style={{ gap: 12 }}>
        <div className="text-[16px] font-semibold text-white/90 tracking-[-0.01em] leading-snug line-clamp-2">
          {title}
        </div>
      </div>

      {/* Stats Row */}
      <div className="font-mono text-[13px] text-[#8E8E93]">
        <span className="text-white/70 font-medium">{h}h {m}m</span> total
      </div>

      {/* Progress Section */}
      <div style={{ marginTop: "auto" }}>
        <div className="flex justify-between items-end" style={{ marginBottom: 6 }}>
          <span className="text-[11px] text-[#3A3A3C] font-bold tracking-[0.08em] uppercase">
            Progress
          </span>
          <span className="font-mono text-[11px] font-bold" style={{ color: accentColor }}>
            {progress}%
          </span>
        </div>
        <div className="bg-[#1E1E1E] rounded-full overflow-hidden w-full" style={{ height: "6px" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: accentColor }}
          />
        </div>
      </div>
    </div>
  );
}
