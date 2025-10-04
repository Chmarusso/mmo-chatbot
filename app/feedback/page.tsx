"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast.error("Let us know what happened so we can help.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedback.trim() }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to submit feedback");
      }

      toast.success("Thanks for the feedback! We'll review it shortly.");
      setFeedback("");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 space-y-6 px-4 py-6 pb-24 sm:px-6 lg:mx-auto lg:max-w-4xl lg:space-y-10 lg:px-12 lg:py-12 lg:pb-12">
      <header className="space-y-2 lg:text-left">
        <h1 className="text-3xl font-semibold lg:text-4xl">Feedback</h1>
        <p className="text-sm text-gray-400 lg:text-base">
          Found a bug or have an idea? Send it our way so we can improve MMO Match.
        </p>
      </header>
      <div className="rounded-3xl border border-accent-purple/30 bg-surface/80 p-6 lg:p-10">
        <div className="space-y-4">
          <Textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Describe the issue or share your feedback..."
            rows={6}
            maxLength={1000}
          />
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send feedback"}
          </Button>
        </div>
      </div>
    </main>
  );
}
