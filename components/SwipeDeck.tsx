"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import type { Profile } from "@/types/profile";
import { SwipeCard } from "@/components/SwipeCard";

interface SwipeDeckProps {
  profiles: Profile[];
  currentProfileId?: string;
}

export function SwipeDeck({ profiles }: SwipeDeckProps) {
  const [index, setIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remaining = useMemo(() => profiles.slice(index), [profiles, index]);
  const activeProfile = remaining[0];

  const submitSwipe = async (direction: "yes" | "no") => {
    if (!activeProfile) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/swipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          swipedId: activeProfile.id,
          direction,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error((data as { error?: string }).error ?? "Swipe failed");
      }

      if ((data as { matched?: boolean }).matched) {
        toast.success("It’s a match! Start chatting now.");
      }

      setIndex((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      toast.error("Could not record swipe. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!profiles.length) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-accent-cyan/30 bg-surface/60 p-8 text-center lg:min-h-[480px] lg:p-12">
        <h3 className="text-lg font-semibold lg:text-2xl">No squads yet</h3>
        <p className="text-sm text-gray-400 lg:max-w-md lg:text-base">
          Expand your preferences or check back soon. New heroes appear every day.
        </p>
      </div>
    );
  }

  const queueCount = Math.max(profiles.length - index - 1, 0);

  return (
    <div className="relative h-[480px] w-full max-w-md lg:h-[560px] lg:max-w-2xl">
      <AnimatePresence mode="popLayout">
        {activeProfile && (
          <SwipeCard
            key={activeProfile.id}
            profile={activeProfile}
            onSwipe={(direction) => {
              if (!isSubmitting) {
                submitSwipe(direction);
              }
            }}
          />
        )}
      </AnimatePresence>
      <p className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-12 text-xs text-gray-500 lg:text-sm">
        {queueCount} more player{queueCount === 1 ? "" : "s"} in queue
      </p>
    </div>
  );
}
