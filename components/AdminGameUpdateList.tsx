"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { GameUpdateSuggestion, GameUpdateSuggestionStatus } from "@/types/game-update-suggestion";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<GameUpdateSuggestionStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-200",
  accepted: "bg-emerald-500/10 text-emerald-200",
  rejected: "bg-rose-500/10 text-rose-200",
};

interface AdminGameUpdateListProps {
  initialSuggestions: GameUpdateSuggestion[];
  currentStatus: GameUpdateSuggestionStatus;
}

const ARRAY_FIELDS = [
  "genreTags",
  "platformTags",
  "gameplayTags",
  "worldTags",
  "visualStyleTags",
];

const TEXT_FIELDS = [
  "description",
  "summary",
  "featureSummary",
  "screenshot",
  "website",
  "monetization",
  "idealFor",
];

function renderPayload(payload: Record<string, unknown>) {
  return (
    <div className="space-y-3">
      {TEXT_FIELDS.map((field) => {
        const value = payload[field];
        if (!value) return null;
        return (
          <div key={field} className="space-y-1">
            <h3 className="text-sm font-semibold capitalize text-white">{field.replace(/([A-Z])/g, " $1").toLowerCase()}</h3>
            {field === "screenshot" || field === "website" ? (
              <a href={String(value)} target="_blank" rel="noreferrer" className="text-accent-cyan hover:text-accent-cyan/80">
                {String(value)}
              </a>
            ) : (
              <p className="text-sm text-gray-200 whitespace-pre-wrap">{String(value)}</p>
            )}
          </div>
        );
      })}
      {ARRAY_FIELDS.map((field) => {
        const value = payload[field];
        if (!Array.isArray(value) || value.length === 0) return null;
        return (
          <div key={field} className="space-y-1">
            <h3 className="text-sm font-semibold capitalize text-white">{field.replace(/([A-Z])/g, " $1").toLowerCase()}</h3>
            <div className="flex flex-wrap gap-2">
              {value.map((entry) => (
                <Badge key={String(entry)} variant="secondary" className="text-xs">
                  {String(entry)}
                </Badge>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminGameUpdateList({ initialSuggestions, currentStatus }: AdminGameUpdateListProps) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    initialSuggestions.reduce<Record<string, string>>((acc, suggestion) => {
      acc[suggestion.id] = suggestion.adminNotes ?? "";
      return acc;
    }, {})
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const emptyLabel =
    currentStatus === "accepted"
      ? "No accepted updates yet."
      : currentStatus === "rejected"
        ? "No rejected updates."
        : "No pending updates.";

  const handleUpdate = async (id: string, nextStatus?: GameUpdateSuggestionStatus) => {
    setLoadingId(id);
    try {
      const payload: Record<string, unknown> = {};
      if (nextStatus) payload.status = nextStatus;
      if (notes[id] !== undefined) payload.adminNotes = notes[id];

      const response = await fetch(`/api/game-update-suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.suggestion) {
        throw new Error(data?.error ?? "Failed to update suggestion");
      }

      setSuggestions((prev) => {
        const updated = prev.map((item) => (item.id === id ? (data.suggestion as GameUpdateSuggestion) : item));
        if (nextStatus && nextStatus !== currentStatus) {
          return updated.filter((item) => item.id !== id);
        }
        return updated;
      });

      toast.success("Update saved");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to update suggestion");
    } finally {
      setLoadingId(null);
    }
  };

  if (suggestions.length === 0) {
    return (
      <div className="rounded-3xl border border-accent-cyan/20 bg-surface/70 p-6 text-center text-sm text-gray-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {suggestions.map((suggestion) => {
        const statusTone = STATUS_STYLES[suggestion.status];
        return (
          <article key={suggestion.id} className="space-y-4 rounded-3xl border border-accent-cyan/20 bg-surface/80 p-6 shadow-glow">
            <header className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{suggestion.gameLabel}</h2>
                <p className="text-xs text-gray-400">
                  Suggested by {suggestion.createdBy.name} · {new Date(suggestion.createdAt).toLocaleString()}
                </p>
              </div>
              <Badge className={cn("self-start", statusTone)}>
                {suggestion.status.charAt(0).toUpperCase() + suggestion.status.slice(1)}
              </Badge>
            </header>

            {suggestion.comment && (
              <p className="rounded-2xl border border-accent-purple/20 bg-background/60 p-3 text-sm text-gray-200">
                {suggestion.comment}
              </p>
            )}

            {renderPayload(suggestion.payload)}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300" htmlFor={`admin-notes-${suggestion.id}`}>
                Admin notes
              </label>
              <Textarea
                id={`admin-notes-${suggestion.id}`}
                value={notes[suggestion.id] ?? ""}
                onChange={(event) =>
                  setNotes((prev) => ({
                    ...prev,
                    [suggestion.id]: event.target.value,
                  }))
                }
                rows={3}
                maxLength={1000}
                placeholder="Internal notes for other admins"
              />
              <Button
                type="button"
                variant="secondary"
                className="rounded-full"
                onClick={() => handleUpdate(suggestion.id)}
                disabled={loadingId === suggestion.id}
              >
                Save notes
              </Button>
            </div>

            <footer className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="rounded-full bg-emerald-500 hover:bg-emerald-500/90"
                onClick={() => handleUpdate(suggestion.id, "accepted")}
                disabled={loadingId === suggestion.id}
              >
                Accept & apply
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-full"
                onClick={() => handleUpdate(suggestion.id, "rejected")}
                disabled={loadingId === suggestion.id}
              >
                Reject
              </Button>
              {suggestion.status !== "pending" && (
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/10"
                  onClick={() => handleUpdate(suggestion.id, "pending")}
                  disabled={loadingId === suggestion.id}
                >
                  Move back to pending
                </Button>
              )}
            </footer>
          </article>
        );
      })}
    </div>
  );
}
