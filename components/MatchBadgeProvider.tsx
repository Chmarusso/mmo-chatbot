"use client";

import { createContext, useContext, ReactNode, useEffect, useRef } from "react";
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
  const previousCountRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const contextValue: MatchBadgeContextValue = {
    unreadMatches: data?.unreadMatches ?? 0,
    matchSummaries: data?.matches ?? [],
    requiresInvite: Boolean(data?.requiresInvite),
  };

  useEffect(() => {
    // Initialize audio element only on client side
    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio("/sounds/notification.mp3");
      audioRef.current.volume = 0.5;
    }
  }, []);

  useEffect(() => {
    const currentCount = data?.unreadMatches ?? 0;

    // Only play sound if count increased (new match)
    if (
      previousCountRef.current !== null &&
      currentCount > previousCountRef.current &&
      !data?.requiresInvite
    ) {
      // Check if user has notifications enabled
      const checkNotificationSetting = async () => {
        try {
          const response = await fetch("/api/profile");
          if (response.ok) {
            const { profile } = await response.json();
            if (profile?.notifyOnNewMatch && audioRef.current) {
              audioRef.current.play().catch((error) => {
                console.log("Could not play notification sound:", error);
              });
            }
          }
        } catch (error) {
          console.error("Failed to check notification settings:", error);
        }
      };

      checkNotificationSetting();
    }

    previousCountRef.current = currentCount;
  }, [data?.unreadMatches, data?.requiresInvite]);

  return (
    <MatchBadgeContext.Provider value={contextValue}>
      {children}
    </MatchBadgeContext.Provider>
  );
}

export function useMatchBadge() {
  return useContext(MatchBadgeContext);
}
