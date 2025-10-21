"use client";

import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface GameSuggestionFormProps {
  className?: string;
}

export function GameSuggestionForm({ className }: GameSuggestionFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuggestionId, setSubmittedSuggestionId] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Add the name of the game to suggest it.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/game-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim() || undefined,
          referenceUrl: referenceUrl.trim() || undefined,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.suggestion) {
        const errorMessage = payload?.error ?? "Could not submit suggestion. Try again.";
        throw new Error(errorMessage);
      }

      setSubmittedSuggestionId(payload.suggestion.id as string);
      toast.success("Thanks! Our team will review your suggestion.");
      setTitle("");
      setDescription("");
      setReferenceUrl("");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not submit suggestion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-5", className)}>
      <div className="space-y-2">
        <Label htmlFor="game-title">Game title *</Label>
        <Input
          id="game-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Blue Protocol"
          maxLength={150}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="game-description">Why should we add this game?</Label>
        <Textarea
          id="game-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Share what makes this MMO interesting—combat style, community, graphics, progression, etc."
          maxLength={2000}
          rows={5}
        />
        <p className="text-xs text-gray-500">Optional, but it helps the team prioritise new additions.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="game-reference">Reference link</Label>
        <Input
          id="game-reference"
          type="url"
          value={referenceUrl}
          onChange={(event) => setReferenceUrl(event.target.value)}
          placeholder="Official website, Steam page, or a reliable overview"
          maxLength={500}
        />
      </div>

      {submittedSuggestionId && (
        <div className="rounded-[0.4em] border border-accent-cyan/30 bg-accent-cyan/10 p-3 text-sm text-accent-cyan">
          We got your suggestion! You can submit more titles any time.
        </div>
      )}

      <Button
        type="submit"
        className="w-full rounded-[0.4em] bg-accent-cyan text-background hover:bg-accent-cyan/90"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Sending..." : "Send suggestion"}
      </Button>
    </form>
  );
}
