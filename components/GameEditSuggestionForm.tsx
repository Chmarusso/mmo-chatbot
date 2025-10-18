"use client";

import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface GameEditSuggestionFormProps {
  gameValue: string;
  gameLabel: string;
}

type FieldState = {
  description: string;
  summary: string;
  featureSummary: string;
  screenshot: string;
  website: string;
  genreTags: string;
  platformTags: string;
  gameplayTags: string;
  worldTags: string;
  visualStyleTags: string;
  monetization: string;
  idealFor: string;
  comment: string;
};

const DEFAULT_STATE: FieldState = {
  description: "",
  summary: "",
  featureSummary: "",
  screenshot: "",
  website: "",
  genreTags: "",
  platformTags: "",
  gameplayTags: "",
  worldTags: "",
  visualStyleTags: "",
  monetization: "",
  idealFor: "",
  comment: "",
};

function parseTags(input: string): string[] | undefined {
  const values = input
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return values.length > 0 ? values : undefined;
}

export function GameEditSuggestionForm({ gameValue, gameLabel }: GameEditSuggestionFormProps) {
  const [fields, setFields] = useState<FieldState>(DEFAULT_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const updateField = (key: keyof FieldState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const payload: Record<string, unknown> = {};

    if (fields.description.trim()) payload.description = fields.description.trim();
    if (fields.summary.trim()) payload.summary = fields.summary.trim();
    if (fields.featureSummary.trim()) payload.featureSummary = fields.featureSummary.trim();
    if (fields.screenshot.trim()) payload.screenshot = fields.screenshot.trim();
    if (fields.website.trim()) payload.website = fields.website.trim();
    if (fields.monetization.trim()) payload.monetization = fields.monetization.trim();
    if (fields.idealFor.trim()) payload.idealFor = fields.idealFor.trim();

    const genreTags = parseTags(fields.genreTags);
    const platformTags = parseTags(fields.platformTags);
    const gameplayTags = parseTags(fields.gameplayTags);
    const worldTags = parseTags(fields.worldTags);
    const visualStyleTags = parseTags(fields.visualStyleTags);

    if (genreTags) payload.genreTags = genreTags;
    if (platformTags) payload.platformTags = platformTags;
    if (gameplayTags) payload.gameplayTags = gameplayTags;
    if (worldTags) payload.worldTags = worldTags;
    if (visualStyleTags) payload.visualStyleTags = visualStyleTags;

    if (fields.comment.trim()) payload.comment = fields.comment.trim();

    if (Object.keys(payload).length === 0) {
      toast.error("Fill in at least one field to suggest an update.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/games/${gameValue}/suggest-edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.suggestionId) {
        throw new Error(data?.error ?? "Failed to submit update");
      }

      setSubmittedId(data.suggestionId as string);
      toast.success("Thanks! Our admins will review your update.");
      setFields(DEFAULT_STATE);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to submit update");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <p className="text-sm text-gray-400">
          Suggest improvements for <span className="font-semibold text-white">{gameLabel}</span>. Provide only the
          fields you think should change.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="description">Updated description</Label>
          <Textarea
            id="description"
            value={fields.description}
            onChange={updateField("description")}
            rows={4}
            maxLength={2000}
            placeholder="Share a fresher description or official summary."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="summary">Updated overview</Label>
          <Textarea
            id="summary"
            value={fields.summary}
            onChange={updateField("summary")}
            rows={3}
            maxLength={1500}
            placeholder="Condensed overview (2-3 sentences)."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="feature-summary">Feature highlights</Label>
          <Textarea
            id="feature-summary"
            value={fields.featureSummary}
            onChange={updateField("featureSummary")}
            rows={4}
            maxLength={2000}
            placeholder="Bullet points or short summary of standout features."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="screenshot">Screenshot URL</Label>
          <Input
            id="screenshot"
            type="url"
            value={fields.screenshot}
            onChange={updateField("screenshot")}
            placeholder="https://example.com/screenshot.jpg"
            maxLength={500}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Official website or key link</Label>
          <Input
            id="website"
            type="url"
            value={fields.website}
            onChange={updateField("website")}
            placeholder="https://"
            maxLength={500}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="genre-tags">Genre tags</Label>
          <Input
            id="genre-tags"
            value={fields.genreTags}
            onChange={updateField("genreTags")}
            placeholder="mmorpg, sandbox, action combat"
          />
          <p className="text-xs text-gray-500">Comma-separated list.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="platform-tags">Platforms</Label>
          <Input
            id="platform-tags"
            value={fields.platformTags}
            onChange={updateField("platformTags")}
            placeholder="pc, xbox, playstation"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gameplay-tags">Gameplay tags</Label>
          <Input
            id="gameplay-tags"
            value={fields.gameplayTags}
            onChange={updateField("gameplayTags")}
            placeholder="tab-target combat, raid-heavy, life-skilling"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="world-tags">World tags</Label>
          <Input
            id="world-tags"
            value={fields.worldTags}
            onChange={updateField("worldTags")}
            placeholder="open world, instanced dungeons"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="visual-tags">Visual style</Label>
          <Input
            id="visual-tags"
            value={fields.visualStyleTags}
            onChange={updateField("visualStyleTags")}
            placeholder="stylised fantasy, grimdark realistic"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monetization">Monetisation</Label>
          <Input
            id="monetization"
            value={fields.monetization}
            onChange={updateField("monetization")}
            placeholder="Free-to-play with optional cosmetics"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ideal-for">Ideal for</Label>
          <Input
            id="ideal-for"
            value={fields.idealFor}
            onChange={updateField("idealFor")}
            placeholder="Players who enjoy..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="comment">Optional note for the team</Label>
        <Textarea
          id="comment"
          value={fields.comment}
          onChange={updateField("comment")}
          rows={3}
          maxLength={1000}
          placeholder="Any extra context we should know?"
        />
      </div>

      {submittedId && (
        <div className="rounded-2xl border border-accent-cyan/30 bg-accent-cyan/10 p-3 text-sm text-accent-cyan">
          Update received! Our admins will review and apply it if it improves the listing.
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full rounded-2xl">
        {isSubmitting ? "Sending..." : "Submit update"}
      </Button>
    </form>
  );
}
