import { useQuery } from "@tanstack/react-query";

export type MatchSummary = {
  matchId: string;
  otherProfileId: string;
  otherName: string;
  gamePref: string | null;
  timeSlot: string | null;
  language: string | null;
  playstyle: string | null;
  bio: string | null;
};

export type UnreadCountResponse = {
  unreadMatches: number;
  matches: MatchSummary[];
};

async function fetchUnreadCount(): Promise<UnreadCountResponse> {
  const response = await fetch("/api/matches/unread-count", { 
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch unread count");
  }
  
  return response.json();
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["unreadCount"],
    queryFn: fetchUnreadCount,
    staleTime: 1000 * 60 * 5, // 5 minutes - data is fresh for 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache for 10 minutes
    refetchInterval: false, // Disable automatic refetching
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount if data exists
    retry: 2, // Retry failed requests up to 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}
