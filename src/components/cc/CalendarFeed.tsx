import { useGoogleCalendarAuth, useNext12hEvents } from "../../db/calendarHooks";
import { Button } from "../ui/button";
import { Calendar } from "lucide-react";

export const CalendarFeed = () => {
  const { isConnected, connect, isLoading: authLoading } = useGoogleCalendarAuth();
  const { data: events, isLoading: eventsLoading } = useNext12hEvents();

  if (authLoading) {
    return <div className="h-full w-full animate-pulse" />;
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col h-full">
        <div className="text-xs font-bold tracking-[0.12em] text-[#3A3A3C] uppercase mb-3">Calendar · Next 12h</div>
        <div className="flex flex-col items-start gap-3 pt-1">
          <Calendar className="w-5 h-5 text-[#3A3A3C]" />
          <div>
            <div className="text-sm text-white/30 mb-2">No calendar connected</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={connect}
              className="text-xs uppercase tracking-widest font-bold border border-white/10 hover:bg-white/5 text-white/40 px-3 py-1.5 h-auto"
            >
              Connect →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isCurrent = (start?: string, end?: string) => {
    if (!start || !end) return false;
    const now = Date.now();
    return now >= new Date(start).getTime() && now <= new Date(end).getTime();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs font-bold tracking-[0.12em] text-[#3A3A3C] uppercase mb-3">Calendar · Next 12h</div>
      <div className="flex flex-col">
        {eventsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse py-1">
              <div className="w-1 bg-white/5 rounded" />
              <div className="flex-1">
                <div className="h-3 bg-white/5 rounded w-3/4 mb-1" />
              </div>
            </div>
          ))
        ) : events && events.length > 0 ? (
          events.map((event) => {
            const current = isCurrent(event.start.dateTime, event.end.dateTime);
            return (
              <div key={event.id} className="py-2 border-b border-white/[0.04] last:border-0 flex items-start gap-3">
                <div className={`text-sm font-mono mt-0.5 ${current ? 'text-[#0A84FF]' : 'text-[#48484A]'}`}>
                  {new Date(event.start.dateTime || "").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
                <div className="text-base text-white/45 overflow-hidden text-ellipsis whitespace-nowrap">
                  {event.summary}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-sm text-white/30 italic py-2">No upcoming events in the next 12h</div>
        )}
      </div>
    </div>
  );
};
