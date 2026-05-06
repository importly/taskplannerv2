import { useGoogleCalendarAuth, useUpcomingEvents } from "../../db/calendarHooks";
import { Button } from "../ui/button";

export const CalendarNextUp = () => {
  const { isConnected, connect, isLoading: authLoading } = useGoogleCalendarAuth();
  // Fetch up to 3 events to match the spec
  const { data: events, isLoading: eventsLoading } = useUpcomingEvents(3);

  const formatTime = (dateTime?: string) => {
    if (!dateTime) return "";
    return new Date(dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div>
      <div className="text-[9px] font-bold tracking-[0.12em] text-[#3A3A3C] uppercase mb-2">Next Up</div>

      {authLoading || eventsLoading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          <div className="h-3 bg-white/5 rounded w-3/4" />
          <div className="h-3 bg-white/5 rounded w-full" />
        </div>
      ) : !isConnected ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={connect}
          className="text-[9px] uppercase tracking-widest font-bold hover:bg-white/10 w-full text-white/40 h-auto py-1.5 px-0 justify-start"
        >
          Connect Calendar →
        </Button>
      ) : events && events.length > 0 ? (
        <div className="flex flex-col">
          {events.slice(0, 3).map((event, i) => (
            <div key={event.id || i} className="py-[5px] border-b border-white/[0.04] last:border-0">
              <div className="text-[9px] font-mono text-[#48484A]">
                {formatTime(event.start.dateTime)}
              </div>
              <div className="text-[10px] text-white/45 mt-[1px] truncate">
                {event.summary}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[10px] text-white/30 italic">No more events today</div>
      )}
    </div>
  );
};
