import { useGoogleCalendarAuth, useNext12hEvents } from "../../db/calendarHooks";

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
        <div className="text-xs font-bold tracking-[0.12em] text-[#3A3A3C] uppercase" style={{ marginBottom: 12 }}>Calendar · Next 12h</div>
        <div className="flex flex-col items-start" style={{ gap: 12, paddingTop: 4 }}>
          <Calendar className="w-5 h-5 text-[#3A3A3C]" />
          <div>
            <div className="text-sm text-white/30" style={{ marginBottom: 8 }}>No calendar connected</div>
            <button
              onClick={connect}
              className="text-xs uppercase tracking-widest font-bold border border-white/10 hover:bg-white/5 text-white/40 bg-transparent cursor-pointer rounded-md"
              style={{ padding: "6px 12px" }}
            >
              Connect →
            </button>
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
      <div className="text-xs font-bold tracking-[0.12em] text-[#3A3A3C] uppercase" style={{ marginBottom: 12 }}>Calendar · Next 12h</div>
      <div className="flex flex-col">
        {eventsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex animate-pulse" style={{ gap: 12, padding: "4px 0" }}>
              <div className="w-1 bg-white/5 rounded" />
              <div className="flex-1">
                <div className="h-3 bg-white/5 rounded w-3/4" style={{ marginBottom: 4 }} />
              </div>
            </div>
          ))
        ) : events && events.length > 0 ? (
          events.map((event) => {
            const current = isCurrent(event.start.dateTime, event.end.dateTime);
            return (
              <div key={event.id} className="border-b last:border-0 flex items-start" style={{ padding: "8px 0", borderColor: "rgba(255,255,255,0.04)", gap: 12 }}>
                <div className={`text-sm font-mono ${current ? 'text-[#0A84FF]' : 'text-[#48484A]'}`} style={{ marginTop: 2 }}>
                  {new Date(event.start.dateTime || "").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
                <div className="text-base text-white/45 overflow-hidden text-ellipsis whitespace-nowrap">
                  {event.summary}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-sm text-white/30 italic" style={{ padding: "8px 0" }}>No upcoming events in the next 12h</div>
        )}
      </div>
    </div>
  );
};
