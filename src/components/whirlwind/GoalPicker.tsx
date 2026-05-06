import { useGoals } from "../../db/goalHooks";


interface GoalPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (goalId: string | null) => void;
  currentGoalId?: string | null;
}

export const GoalPicker = ({ isOpen, onClose, onSelect, currentGoalId }: GoalPickerProps) => {
  const { data: goals = [] } = useGoals();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-200" style={{ padding: 16 }}>
      <div className="w-full max-w-4xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex-none text-center" style={{ paddingBottom: 32 }}>
          <h2 className="text-3xl font-bold text-[#E1FF00] tracking-tight">Link to Goal</h2>
          <p className="text-white/40 text-lg" style={{ marginTop: 8 }}>Select a goal to associate with this task</p>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col min-h-0" style={{ gap: 12, paddingBottom: 16, paddingLeft: 16, paddingRight: 16 }}>
          <button
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className={`w-full text-left rounded-2xl transition-all border-2 ${
              !currentGoalId 
                ? "bg-[#E1FF00]/10 border-[#E1FF00] text-[#E1FF00]" 
                : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20"
            }`}
            style={{ padding: "12px 24px" }}
          >
            <div className="text-xl font-bold">No Goal</div>
            <div className="text-sm opacity-60" style={{ marginTop: 2 }}>Keep this task independent</div>
          </button>

          {goals.map((goal) => (
            <button
              key={goal.id}
              onClick={() => {
                onSelect(goal.id);
                onClose();
              }}
              className={`w-full text-left rounded-2xl transition-all border-2 ${
                currentGoalId === goal.id
                  ? "bg-[#E1FF00]/10 border-[#E1FF00] text-[#E1FF00]"
                  : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20"
              }`}
              style={{ padding: "12px 24px" }}
            >
              <div className="text-xl font-bold">{goal.title}</div>
              {goal.description && (
                <div className="text-sm opacity-60 line-clamp-1" style={{ marginTop: 2 }}>{goal.description}</div>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex-none text-center" style={{ paddingTop: 16 }}>
          <button 
            onClick={onClose} 
            className="rounded-xl text-lg font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            style={{ padding: "16px 40px" }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
};
