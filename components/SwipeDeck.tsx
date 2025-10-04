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
  const [swipeDirection, setSwipeDirection] = useState<"yes" | "no" | null>(null);
  const [undoEntry, setUndoEntry] = useState<
    | {
        profile: Profile;
        direction: "yes" | "no";
        toastId: string;
      }
    | null
  >(null);

  const remaining = useMemo(() => profiles.slice(index), [profiles, index]);
  const activeProfile = remaining[0];

  const showUndoToast = (entry: { profile: Profile; direction: "yes" | "no" }) => {
    const message = entry.direction === "yes" ? "Sent squad invite" : "Passed on player";
    const toastId = toast.custom((t) => (
      <div className="flex items-center gap-3 rounded-2xl border border-accent-cyan/30 bg-surface/90 px-4 py-3 text-sm text-gray-100 shadow-glow">
        <div className="flex-1">
          <p className="font-medium">{message}</p>
          <p className="text-xs text-gray-400">Tap undo to bring them back.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-accent-cyan/50 px-3 py-1 text-xs font-semibold text-accent-cyan transition hover:bg-accent-cyan/10"
          onClick={() => undoSwipe(entry, t.id)}
        >
          Undo
        </button>
      </div>
    ),
    {
      duration: 4000,
    });

    return toastId;
  };

  const undoSwipe = async (entry: { profile: Profile; direction: "yes" | "no" }, toastId?: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/swipes?swipedId=${entry.profile.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to undo swipe");
      }

      if (toastId) {
        toast.dismiss(toastId);
      }

      setIndex((prev) => Math.max(prev - 1, 0));
      setSwipeDirection(null);
      setUndoEntry(null);
      toast.success("Swipe reverted");
    } catch (error) {
      console.error(error);
      toast.error("Could not undo swipe. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitSwipe = async (direction: "yes" | "no") => {
    if (!activeProfile) return;

    setSwipeDirection(direction);
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

      if (undoEntry?.toastId) {
        toast.dismiss(undoEntry.toastId);
      }

      const toastId = showUndoToast({ profile: activeProfile, direction });
      setUndoEntry({ profile: activeProfile, direction, toastId });

      setIndex((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      toast.error("Could not record swipe. Try again.");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSwipeDirection(null), 0);
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
            swipeDirection={swipeDirection}
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
