import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  acquireGoogleToken, 
  startGoogleAuth, 
  disconnect as disconnectGoogle 
} from "../services/googleAuth";
import { 
  getTodaysEvents, 
  getNext12hEvents 
} from "../services/googleCalendarService";

/**
 * Hook for Google Calendar authentication state and actions.
 */
export function useGoogleCalendarAuth() {
  const queryClient = useQueryClient();

  const { data: accessToken, isLoading } = useQuery({
    queryKey: ["google_token"],
    queryFn: async () => {
      return await acquireGoogleToken();
    },
    // Don't retry if token is missing
    retry: false,
    staleTime: 60000, // 1 minute
  });

  const isConnected = !!accessToken;

  const connect = async () => {
    await startGoogleAuth();
  };

  const disconnectMutation = useMutation({
    mutationFn: disconnectGoogle,
    onSuccess: () => {
      queryClient.setQueryData(["google_token"], null);
      queryClient.invalidateQueries({ queryKey: ["google_calendar_events"] });
    },
  });

  return {
    isConnected,
    isLoading,
    connect,
    disconnect: disconnectMutation.mutate,
  };
}

/**
 * Hook for today's upcoming events.
 */
export function useUpcomingEvents(count?: number) {
  return useQuery({
    queryKey: ["google_calendar_events", "upcoming", count],
    queryFn: async () => {
      const token = await acquireGoogleToken();
      if (!token) return [];
      
      const events = await getTodaysEvents(token);
      return count ? events.slice(0, count) : events;
    },
    enabled: true, // Always run, service handles null token
    refetchInterval: 300000, // 5 minutes
  });
}

/**
 * Hook for events in the next 12 hours.
 */
export function useNext12hEvents() {
  return useQuery({
    queryKey: ["google_calendar_events", "next12h"],
    queryFn: async () => {
      const token = await acquireGoogleToken();
      if (!token) return [];
      
      return await getNext12hEvents(token);
    },
    enabled: true,
    refetchInterval: 300000, // 5 minutes
  });
}
