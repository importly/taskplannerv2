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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex-none pb-8 text-center">
          <h2 className="text-3xl font-bold text-[#E1FF00] tracking-tight">Link to Goal</h2>
          <p className="text-white/40 text-lg mt-2">Select a goal to associate with this task</p>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-4 px-4 min-h-0">
          <button
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className={`w-full text-left px-6 py-3 rounded-2xl transition-all border-2 ${
              !currentGoalId 
                ? "bg-[#E1FF00]/10 border-[#E1FF00] text-[#E1FF00]" 
                : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20"
            }`}
          >
            <div className="text-xl font-bold">No Goal</div>
            <div className="text-sm opacity-60 mt-0.5">Keep this task independent</div>
          </button>

          {goals.map((goal) => (
            <button
              key={goal.id}
              onClick={() => {
                onSelect(goal.id);
                onClose();
              }}
              className={`w-full text-left px-6 py-3 rounded-2xl transition-all border-2 ${
                currentGoalId === goal.id
                  ? "bg-[#E1FF00]/10 border-[#E1FF00] text-[#E1FF00]"
                  : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20"
              }`}
            >
              <div className="text-xl font-bold">{goal.title}</div>
              {goal.description && (
                <div className="text-sm opacity-60 mt-0.5 line-clamp-1">{goal.description}</div>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex-none pt-4 text-center">
          <button 
            onClick={onClose} 
            className="px-10 py-4 rounded-xl text-lg font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
};
