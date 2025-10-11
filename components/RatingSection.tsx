"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface RatingSectionProps {
  gameValue: string;
  currentRating?: number;
  isLoggedIn: boolean;
}

export default function RatingSection({
  gameValue,
  currentRating,
  isLoggedIn,
}: RatingSectionProps) {
  const [rating, setRating] = useState(currentRating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRating = async (value: number) => {
    if (!isLoggedIn) {
      toast.error("Please log in to rate this game");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/games/${gameValue}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to submit rating");
      }

      setRating(value);
      toast.success("Rating submitted successfully");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to submit rating");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {isLoggedIn ? (
        <>
          <p className="text-sm text-text-secondary">Rate this game:</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleRating(value)}
                onMouseEnter={() => setHoverRating(value)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Star
                  size={32}
                  className={
                    value <= (hoverRating || rating)
                      ? "fill-accent-purple text-accent-purple"
                      : "text-gray-600"
                  }
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-text-secondary">Your rating: {rating} stars</p>
          )}
        </>
      ) : (
        <p className="text-sm text-text-secondary">Log in to rate this game</p>
      )}
    </div>
  );
}
