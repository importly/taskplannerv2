import { useGoogleCalendarAuth, useUpcomingEvents } from "../../db/calendarHooks";


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
      <div className="text-xs font-bold tracking-[0.12em] text-[#9A9A9C] uppercase" style={{ marginBottom: 12 }}>Next Up</div>

      {authLoading || eventsLoading ? (
        <div className="flex flex-col animate-pulse" style={{ gap: 8 }}>
          <div className="h-3 bg-white/10 rounded w-3/4" />
          <div className="h-3 bg-white/10 rounded w-full" />
        </div>
      ) : !isConnected ? (
        <button
          onClick={connect}
          className="text-xs uppercase tracking-widest font-bold hover:bg-white/10 w-full text-white/40 justify-start border-none bg-transparent cursor-pointer"
          style={{ padding: "8px 0" }}
        >
          Connect Calendar →
        </button>
      ) : events && events.length > 0 ? (
        <div className="flex flex-col">
          {events.slice(0, 3).map((event, i) => (
            <div key={event.id || i} className="border-b last:border-0" style={{ padding: "8px 0", borderColor: "rgba(255,255,255,0.04)" }}>
              <div className="text-sm font-mono text-[#48484A]">
                {formatTime(event.start.dateTime)}
              </div>
              <div className="text-base text-white/45 truncate" style={{ marginTop: 4 }}>
                {event.summary}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-white/30 italic">No more events today</div>
      )}
    </div>
  );
};
