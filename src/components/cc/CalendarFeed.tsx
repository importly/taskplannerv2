import { useGoogleCalendarAuth, useNext12hEvents } from "../../db/calendarHooks";
import { Button } from "../ui/button";
import { Calendar } from "lucide-react";

export const CalendarFeed = () => {
  const { isConnected, connect, isLoading: authLoading } = useGoogleCalendarAuth();
  const { data: events, isLoading: eventsLoading } = useNext12hEvents();

  if (authLoading) {
    return (
      <div className="glass-surface p-4 rounded-xl flex flex-col gap-2 w-full max-w-md h-64 animate-pulse" />
    );
  }

  if (!isConnected) {
    return (
      <div className="glass-surface p-4 rounded-xl flex flex-col items-center justify-center gap-4 w-full max-w-md h-64 border border-white/5 backdrop-blur-md">
        <Calendar className="w-8 h-8 text-muted" />
        <div className="text-center">
          <h3 className="text-sm font-bold text-white mb-1">Calendar Disconnected</h3>
          <p className="text-xs text-muted mb-4">Connect your Google Calendar to see your schedule</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={connect}
            className="text-[10px] uppercase tracking-widest font-bold border-white/10 hover:bg-white/5"
          >
            Connect Account
          </Button>
        </div>
      </div>
    );
  }

  const formatTimeRange = (start?: string, end?: string) => {
    if (!start || !end) return "";
    const s = new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const e = new Date(end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${s} - ${e}`;
  };

  const isCurrent = (start?: string, end?: string) => {
    if (!start || !end) return false;
    const now = Date.now();
    return now >= new Date(start).getTime() && now <= new Date(end).getTime();
  };

  return (
    <div className="glass-surface p-4 rounded-xl flex flex-col gap-2 w-full max-w-md min-h-64 border border-white/5 backdrop-blur-md">
      <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Calendar Feed</h3>
      <div className="flex flex-col gap-3">
        {eventsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-1 bg-white/5 rounded" />
              <div className="flex-1">
                <div className="h-4 bg-white/5 rounded w-3/4 mb-1" />
                <div className="h-3 bg-white/5 rounded w-1/4" />
              </div>
            </div>
          ))
        ) : events && events.length > 0 ? (
          events.map((event) => (
            <div key={event.id} className="flex gap-3 group">
              <div className={`w-1 rounded transition-colors ${isCurrent(event.start.dateTime, event.end.dateTime) ? 'bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]' : 'bg-white/10'}`} />
              <div className="flex-1">
                <div className={`text-sm font-mono transition-opacity ${isCurrent(event.start.dateTime, event.end.dateTime) ? 'text-white font-medium' : 'text-white/70'}`}>
                  {event.summary}
                </div>
                <div className="text-[10px] text-muted font-mono uppercase tracking-tighter">
                  {formatTimeRange(event.start.dateTime, event.end.dateTime)}
                  {isCurrent(event.start.dateTime, event.end.dateTime) && (
                    <span className="ml-2 text-accent animate-pulse">● NOW</span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-xs text-muted italic py-8 text-center">No upcoming events in the next 12h</div>
        )}
      </div>
    </div>
  );
};
