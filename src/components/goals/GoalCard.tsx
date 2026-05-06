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
      className="bg-white/[0.03] backdrop-blur-md border border-white/[0.07] rounded-[16px] p-5 cursor-pointer transition-all duration-200 hover:bg-white/[0.07] hover:border-white/[0.14] flex flex-col justify-between min-h-[130px]"
    >
      <div>
        {/* Top Row: Title & Badge */}
        <div className="flex justify-between items-start gap-2.5 mb-3">
          <div className="text-[14px] font-semibold text-white/90 tracking-[-0.01em] leading-snug line-clamp-2">
            {title}
          </div>
          <div className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/[0.07] text-white/45 border border-white/[0.09] whitespace-nowrap shrink-0">
            GOAL
          </div>
        </div>

        {/* Stats Row */}
        <div className="font-mono text-[11px] text-[#8E8E93] mb-3.5">
          <span className="text-white/65 font-medium">{h}h {m}m</span> total
        </div>
      </div>

      {/* Progress Section */}
      <div className="mt-auto">
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-[10px] text-[#3A3A3C] font-semibold tracking-[0.06em] uppercase">
            Progress
          </span>
          <span className="font-mono text-[10px] font-bold" style={{ color: accentColor }}>
            {progress}%
          </span>
        </div>
        <div className="h-[3px] bg-[#1E1E1E] rounded-full overflow-hidden w-full">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: accentColor }}
          />
        </div>
      </div>
    </div>
  );
}
