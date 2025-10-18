"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { GameSuggestion, GameSuggestionStatus } from "@/types/game-suggestion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AdminSuggestionListProps {
  initialSuggestions: GameSuggestion[];
  currentStatus: GameSuggestionStatus;
}

const STATUS_COPY: Record<GameSuggestionStatus, { label: string; tone: string }> = {
  pending: { label: "Pending", tone: "bg-yellow-500/10 text-yellow-200" },
  accepted: { label: "Accepted", tone: "bg-emerald-500/10 text-emerald-200" },
  rejected: { label: "Rejected", tone: "bg-rose-500/10 text-rose-200" },
};

export function AdminSuggestionList({ initialSuggestions, currentStatus }: AdminSuggestionListProps) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>(() =>
    initialSuggestions.reduce<Record<string, string>>((acc, suggestion) => {
      acc[suggestion.id] = suggestion.adminNotes ?? "";
      return acc;
    }, {})
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const emptyStateLabel = useMemo(() => {
    switch (currentStatus) {
      case "accepted":
        return "No accepted suggestions yet.";
      case "rejected":
        return "No rejected suggestions.";
      default:
        return "No pending suggestions right now.";
    }
  }, [currentStatus]);

  const handleUpdate = async (id: string, nextStatus?: GameSuggestionStatus) => {
    setLoadingId(id);
    try {
      const payload: Record<string, unknown> = {};
      if (nextStatus) payload.status = nextStatus;
      if (noteDrafts[id] !== undefined) payload.adminNotes = noteDrafts[id];

      const response = await fetch(`/api/game-suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.suggestion) {
        throw new Error(data?.error ?? "Failed to update suggestion");
      }

      setSuggestions((prev) => {
        const mapped = prev.map((suggestion) =>
          suggestion.id === id ? (data.suggestion as GameSuggestion) : suggestion
        );
        if (nextStatus && nextStatus !== currentStatus) {
          return mapped.filter((suggestion) => suggestion.id !== id);
        }
        return mapped;
      });

      toast.success("Suggestion updated");
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
        {emptyStateLabel}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {suggestions.map((suggestion) => {
        const statusConfig = STATUS_COPY[suggestion.status];
        const noteValue = noteDrafts[suggestion.id] ?? "";
        const submittedAt = new Date(suggestion.createdAt).toLocaleString();

        return (
          <article
            key={suggestion.id}
            className="space-y-4 rounded-3xl border border-accent-cyan/20 bg-surface/80 p-6 shadow-glow"
          >
            <header className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{suggestion.title}</h2>
                <p className="text-xs text-gray-400">Suggested by {suggestion.createdBy.name} · {submittedAt}</p>
              </div>
              <Badge className={cn("self-start", statusConfig.tone)}>{statusConfig.label}</Badge>
            </header>

            {suggestion.referenceUrl && (
              <p className="text-sm">
                <span className="text-gray-400">Reference:&nbsp;</span>
                <a
                  href={suggestion.referenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-cyan hover:text-accent-cyan/80"
                >
                  {suggestion.referenceUrl}
                </a>
              </p>
            )}

            {suggestion.description && (
              <p className="whitespace-pre-wrap rounded-2xl border border-accent-purple/20 bg-background/60 p-4 text-sm text-gray-200">
                {suggestion.description}
              </p>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300" htmlFor={`admin-notes-${suggestion.id}`}>
                Admin notes
              </label>
              <Textarea
                id={`admin-notes-${suggestion.id}`}
                value={noteValue}
                onChange={(event) =>
                  setNoteDrafts((prev) => ({
                    ...prev,
                    [suggestion.id]: event.target.value,
                  }))
                }
                rows={3}
                maxLength={1000}
                placeholder="Optional notes for the team or the submitter"
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <button
                  type="button"
                  className="rounded-full border border-accent-cyan/30 px-3 py-1 transition hover:bg-accent-cyan/10"
                  onClick={() => handleUpdate(suggestion.id)}
                  disabled={loadingId === suggestion.id}
                >
                  Save notes
                </button>
              </div>
            </div>

            <footer className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                type="button"
                variant="default"
                className="rounded-full bg-emerald-500 text-white hover:bg-emerald-500/90"
                onClick={() => handleUpdate(suggestion.id, "accepted")}
                disabled={loadingId === suggestion.id}
              >
                Mark as accepted
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-full bg-rose-500/80 hover:bg-rose-500"
                onClick={() => handleUpdate(suggestion.id, "rejected")}
                disabled={loadingId === suggestion.id}
              >
                Reject
              </Button>
              {suggestion.status !== "pending" && (
                <Button
                  type="button"
                  variant="secondary"
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
