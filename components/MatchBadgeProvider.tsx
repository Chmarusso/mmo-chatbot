"use client";

import { createContext, useContext, ReactNode } from "react";
import { useUnreadCount } from "@/lib/hooks/useUnreadCount";

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

interface MatchBadgeContextValue {
  unreadMatches: number;
  matchSummaries: MatchSummary[];
  requiresInvite: boolean;
}

export const MatchBadgeContext = createContext<MatchBadgeContextValue>({
  unreadMatches: 0,
  matchSummaries: [],
  requiresInvite: false,
});

export function MatchBadgeProvider({ children }: { children: ReactNode }) {
  const { data } = useUnreadCount();

  const contextValue: MatchBadgeContextValue = {
    unreadMatches: data?.unreadMatches ?? 0,
    matchSummaries: data?.matches ?? [],
    requiresInvite: Boolean(data?.requiresInvite),
  };

  return (
    <MatchBadgeContext.Provider value={contextValue}>
      {children}
    </MatchBadgeContext.Provider>
  );
}

export function useMatchBadge() {
  return useContext(MatchBadgeContext);
}
