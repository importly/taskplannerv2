export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  description?: string;
}

export interface CalendarEventsResponse {
  items: GoogleCalendarEvent[];
}

const BASE_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

/**
 * Fetches events from Google Calendar API.
 */
async function fetchEvents(accessToken: string, timeMin: string, timeMax: string): Promise<GoogleCalendarEvent[]> {
  const url = new URL(BASE_URL);
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch calendar events");
  }

  const data: CalendarEventsResponse = await response.json();
  
  // Filter out all-day events (where start.dateTime is missing)
  return (data.items || []).filter((event) => event.start.dateTime);
}

/**
 * Gets events for today (from now until the end of the day).
 */
export async function getTodaysEvents(accessToken: string): Promise<GoogleCalendarEvent[]> {
  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return fetchEvents(accessToken, now.toISOString(), endOfDay.toISOString());
}

/**
 * Gets events for the next 12 hours.
 */
export async function getNext12hEvents(accessToken: string): Promise<GoogleCalendarEvent[]> {
  const now = new Date();
  const twelveHoursLater = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  return fetchEvents(accessToken, now.toISOString(), twelveHoursLater.toISOString());
}
