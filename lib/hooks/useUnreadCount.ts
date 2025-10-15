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
  requiresInvite?: boolean;
};

async function fetchUnreadCount(): Promise<UnreadCountResponse> {
  const response = await fetch("/api/matches/unread-count", { 
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  if (response.status === 403) {
    return { unreadMatches: 0, matches: [], requiresInvite: true };
  }

  if (!response.ok) {
    throw new Error("Failed to fetch unread count");
  }
  
  return response.json();
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["unreadCount"],
    queryFn: fetchUnreadCount,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes cache retention
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2, // Retry failed requests up to 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}
