import { useGoogleCalendarAuth, useUpcomingEvents } from "../../db/calendarHooks";
import { Button } from "../ui/button";
import { Calendar } from "lucide-react";

export const CalendarNextUp = () => {
  const { isConnected, connect, isLoading: authLoading } = useGoogleCalendarAuth();
  const { data: events, isLoading: eventsLoading } = useUpcomingEvents(1);

  if (authLoading) {
    return (
      <div className="glass-surface p-4 rounded-xl flex flex-col gap-2 w-64 h-32 animate-pulse" />
    );
  }

  if (!isConnected) {
    return (
      <div className="glass-surface p-4 rounded-xl flex flex-col items-center justify-center gap-2 w-64 h-32 border border-white/5">
        <Calendar className="w-5 h-5 text-muted mb-1" />
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={connect}
          className="text-[10px] uppercase tracking-widest font-bold hover:bg-white/10"
        >
          Connect Google Calendar
        </Button>
      </div>
    );
  }

  const nextEvent = events?.[0];

  const formatTime = (dateTime?: string) => {
    if (!dateTime) return "";
    return new Date(dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getTimeRemaining = (dateTime?: string) => {
    if (!dateTime) return "";
    const diff = new Date(dateTime).getTime() - Date.now();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 0) return "Started";
    if (minutes < 60) return `In ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `In ${hours}h ${minutes % 60}m`;
  };

  return (
    <div className="glass-surface p-4 rounded-xl flex flex-col gap-2 w-64 h-32 border border-white/5 backdrop-blur-md">
      <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest">Next Up</h3>
      {eventsLoading ? (
        <div className="flex flex-col gap-1 animate-pulse">
          <div className="h-4 bg-white/5 rounded w-3/4" />
          <div className="h-3 bg-white/5 rounded w-1/2" />
        </div>
      ) : nextEvent ? (
        <div className="flex flex-col gap-1 overflow-hidden">
          <div className="text-sm font-medium text-white truncate font-mono">
            {formatTime(nextEvent.start.dateTime)} - {nextEvent.summary}
          </div>
          <div className="text-xs text-muted">
            {getTimeRemaining(nextEvent.start.dateTime)}
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted italic mt-2">No more events today</div>
      )}
    </div>
  );
};
