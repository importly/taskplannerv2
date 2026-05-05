import React from "react";

interface GoalCardProps {
  title: string;
  progress: number;
  totalFocusTimeSeconds: number;
  onClick: () => void;
  isArchived?: boolean;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  title,
  progress,
  totalFocusTimeSeconds,
  onClick,
  isArchived = false,
}) => {
  const totalHours = (totalFocusTimeSeconds / 3600).toFixed(1);

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border p-5 transition-all cursor-pointer
        ${isArchived 
          ? "bg-white/2 border-white/5 opacity-60 grayscale-[0.5]" 
          : "bg-white/4 backdrop-blur-md border-white/8 hover:border-white/20 hover:bg-white/6"
        }`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-medium text-white group-hover:text-accent transition-colors">
            {title}
          </h3>
          <span className="font-mono text-xs text-muted">
            {totalHours}h
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-mono text-muted uppercase tracking-wider">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-accent transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Subtle bottom-right detail for "Pro" look */}
      {!isArchived && (
        <div className="absolute bottom-2 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent"
          >
            <path d="M5 12h14m-7-7 7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
};
