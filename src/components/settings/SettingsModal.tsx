import { X, Settings, Calendar } from "lucide-react";
import { TagManager } from "./TagManager";
import { Button } from "../ui/button";
import { useGoogleCalendarAuth } from "../../db/calendarHooks";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const { isConnected, disconnect } = useGoogleCalendarAuth();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 md:p-8 animate-in fade-in duration-300">
      <div className="bg-[#050505] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-accent/10 text-accent">
              <Settings size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase">System Settings</h2>
              <p className="text-white/40 text-xs font-mono uppercase tracking-widest mt-1">Configure your Proxima environment</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-12">
           <section>
             <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-muted mb-6 flex items-center gap-2">
               <Calendar size={14} />
               Google Calendar
             </h3>
             <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-white/10'}`} />
                 <span className="text-sm font-medium text-white/80">
                   {isConnected ? 'Connected to Google' : 'Not connected'}
                 </span>
               </div>
               {isConnected && (
                 <button 
                   onClick={() => disconnect()}
                   className="text-[10px] font-black uppercase tracking-widest text-danger hover:text-danger/80 transition-colors"
                 >
                   Disconnect Account
                 </button>
               )}
             </div>
           </section>

           <TagManager />
        </div>

        <div className="p-6 bg-white/[0.01] border-t border-white/5 flex justify-end">
          <Button onClick={onClose} variant="outline" className="px-8 border-white/10 hover:bg-white/5 text-white/60 hover:text-white font-bold">
            CLOSE REGISTRY
          </Button>
        </div>
      </div>
    </div>
  );
};
