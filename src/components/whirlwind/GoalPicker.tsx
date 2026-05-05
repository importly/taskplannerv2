import { useGoals } from "../../db/goalHooks";
import { Button } from "../ui/button";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-accent">Link to Goal</h2>
          <p className="text-muted text-sm mt-1">Select a goal to associate with this task.</p>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
          <button
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className={`w-full text-left p-4 rounded-xl transition-all border ${
              !currentGoalId 
                ? "bg-accent/10 border-accent text-accent" 
                : "bg-black/20 border-border text-white hover:border-muted"
            }`}
          >
            <div className="font-bold">No Goal</div>
            <div className="text-xs opacity-60">Keep this task independent</div>
          </button>

          {goals.map((goal) => (
            <button
              key={goal.id}
              onClick={() => {
                onSelect(goal.id);
                onClose();
              }}
              className={`w-full text-left p-4 rounded-xl transition-all border ${
                currentGoalId === goal.id
                  ? "bg-accent/10 border-accent text-accent"
                  : "bg-black/20 border-border text-white hover:border-muted"
              }`}
            >
              <div className="font-bold">{goal.title}</div>
              {goal.description && (
                <div className="text-xs opacity-60 line-clamp-1">{goal.description}</div>
              )}
            </button>
          ))}
        </div>

        <div className="p-6 bg-black/20">
          <Button 
            onClick={onClose} 
            variant="ghost" 
            className="w-full text-muted hover:text-white font-bold"
          >
            CANCEL
          </Button>
        </div>
      </div>
    </div>
  );
};
