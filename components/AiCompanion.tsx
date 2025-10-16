"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageSquareText, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChatBubble,
  ChatBubbleMessage,
  ChatBubbleTimestamp,
  ChatContainer,
  ChatHeader,
  ChatInput,
  ChatMessages,
} from "@/components/ui/chat";
import type { AiMessage, AiCompanionProfileSnapshot } from "@/types/ai";
import { GAME_OPTIONS, PLAYSTYLES, TIME_SLOTS } from "@/types/profile";

const FETCH_INTERVAL_MS = 45_000;

const makeMessageId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const formatRelativeTime = (isoDate: string) => {
  const createdAt = new Date(isoDate).getTime();
  const diffMs = Date.now() - createdAt;
  if (diffMs < 45_000) return "Just now";
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 4) {
    return `${diffWeeks}w ago`;
  }
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths}mo ago`;
  }
  const diffYears = Math.round(diffMonths / 12);
  return `${diffYears}y ago`;
};

interface CompanionOnboardingProps {
  initialGames: string[];
  initialPlaystyle: string | null;
  initialTimeSlots: string[];
  onComplete: (snapshot: AiCompanionProfileSnapshot) => void;
}

export function AiCompanion() {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [profileSnapshot, setProfileSnapshot] = useState<AiCompanionProfileSnapshot | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const needsOnboarding =
    !isLoading &&
    profileSnapshot !== null &&
    (!profileSnapshot.gamePref || !profileSnapshot.playstyle || (profileSnapshot.timeSlots?.length ?? 0) === 0);

  useEffect(() => {
    let interrupted = false;

    const loadMessages = async () => {
      try {
        const response = await fetch("/api/ai-chat");
        if (!response.ok) {
          throw new Error("Failed to load companion history.");
        }
        const payload = (await response.json()) as {
          messages: AiMessage[];
          profile: AiCompanionProfileSnapshot;
        };
        if (!interrupted) {
          setMessages(payload.messages ?? []);
          setProfileSnapshot(payload.profile ?? null);
        }
      } catch (error) {
        console.error(error);
        if (!interrupted) {
          toast.error("Could not load companion chat.");
        }
      } finally {
        if (!interrupted) {
          setIsLoading(false);
        }
      }
    };

    loadMessages();
    const interval = window.setInterval(loadMessages, FETCH_INTERVAL_MS);
    return () => {
      interrupted = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, needsOnboarding]);

  const handleOnboardingComplete = (snapshot: AiCompanionProfileSnapshot) => {
    const dedupedTimeSlots = Array.from(new Set(snapshot.timeSlots ?? []));
    setProfileSnapshot({
      ...snapshot,
      timeSlots: dedupedTimeSlots,
      timeSlot: dedupedTimeSlots[0] ?? snapshot.timeSlot,
    });
    setMessages((prev) => [
      ...prev,
      {
        id: makeMessageId(),
        role: "assistant",
        content:
          "Profile intel locked in. Ask me anything about squad comps, build ideas, or raid prep when you're ready.",
        createdAt: new Date().toISOString(),
      },
    ]);
    toast.success("Profile basics saved! Your companion is ready.");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending || needsOnboarding) {
      if (needsOnboarding) {
        toast.error("Finish the onboarding checklist before chatting with the companion.");
      }
      return;
    }
    const trimmed = input.trim();
    if (!trimmed) return;

    setIsSending(true);

    // Optimistically add user's message and a temporary thinking indicator
    const userTempId = makeMessageId();
    const thinkingTempId = makeMessageId();
    const nowIso = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      { id: userTempId, role: "user", content: trimmed, createdAt: nowIso },
      { id: thinkingTempId, role: "assistant", content: "Thinking…", createdAt: nowIso, isThinking: true },
    ]);
    setInput("");

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = (await response.json().catch(() => ({}))) as
        | { messages: AiMessage[]; profile?: AiCompanionProfileSnapshot }
        | { error: string };

      if (!response.ok || !("messages" in data)) {
        throw new Error("error" in data ? data.error : "Companion is unavailable right now.");
      }

      // Replace the optimistic thinking bubble with the real assistant response
      setMessages((prev) => {
        const withoutThinking = prev.filter((m) => m.id !== thinkingTempId);
        return [...withoutThinking, ...(data.messages.filter((m) => m.role === "assistant"))];
      });
      if (data.profile) {
        setProfileSnapshot(data.profile);
      }
    } catch (error) {
      console.error(error);
      // On error, remove thinking indicator and show an error message from the assistant
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== thinkingTempId)
          .map((m) => m)
      );
      toast.error(error instanceof Error ? error.message : "Failed to chat with companion.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const form = event.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const initialGames =
    profileSnapshot?.gamePreferences?.length
      ? profileSnapshot.gamePreferences
      : profileSnapshot?.gamePref
      ? [profileSnapshot.gamePref]
      : [];

  const initialCompanionTimeSlots = Array.from(
    new Set(
      profileSnapshot?.timeSlots && profileSnapshot.timeSlots.length > 0
        ? profileSnapshot.timeSlots
        : profileSnapshot?.timeSlot
        ? [profileSnapshot.timeSlot]
        : []
    ),
  );

  return (
    <ChatContainer className="h-[600px] border-accent-purple/30 bg-surface/80 shadow-glow lg:h-[680px]">
      <ChatHeader className="border-accent-purple/30 bg-surface/90">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-cyan/20 text-accent-cyan">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Companion Intel</h2>
            <p className="text-xs text-muted-foreground">
              Plan squads, optimise builds, and get raid tips tailored to your profile.
            </p>
          </div>
        </div>
      </ChatHeader>
      <ChatMessages ref={scrollRef}>
        <div className="flex h-full flex-col gap-4">
          {isLoading && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-accent-cyan" />
              Loading chat history…
            </div>
          )}

          {!isLoading && !needsOnboarding && messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-accent-cyan/30 bg-background/50 p-6 text-center text-sm text-muted-foreground">
              <MessageSquareText className="h-6 w-6 text-accent-cyan" />
              <p>Your companion is ready. Ask about optimal raid rotations or request a warm-up quest.</p>
            </div>
          )}

          {messages.map((msg) => (
            <ChatBubble key={msg.id} variant={msg.role === "user" ? "sent" : "received"}>
              <div className="flex flex-col">
                <ChatBubbleMessage variant={msg.role === "user" ? "sent" : "received"}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.isThinking ? (
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-accent-cyan" />
                        Thinking…
                      </span>
                    ) : (
                      msg.content
                    )}
                  </p>
                </ChatBubbleMessage>
                <ChatBubbleTimestamp>
                  {msg.role === "user" ? "You" : "Companion"} · {formatRelativeTime(msg.createdAt)}
                </ChatBubbleTimestamp>
              </div>
            </ChatBubble>
          ))}

          {needsOnboarding && (
            <ChatBubble variant="received">
              <div className="flex max-w-xl flex-col gap-3">
                <ChatBubbleMessage>
                  <p className="text-sm font-medium text-accent-cyan">
                    Let&apos;s tune your pilot card so I can tailor match intel.
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Pick the MMOs you actively grind, how you like to play, and when you&apos;re usually online. You can update these later from your profile.
                  </p>
                  <CompanionOnboarding
                    initialGames={initialGames}
                    initialPlaystyle={profileSnapshot?.playstyle ?? null}
                    initialTimeSlots={initialCompanionTimeSlots}
                    onComplete={handleOnboardingComplete}
                  />
                </ChatBubbleMessage>
                <ChatBubbleTimestamp>Companion</ChatBubbleTimestamp>
              </div>
            </ChatBubble>
          )}
        </div>
      </ChatMessages>

      {!needsOnboarding && (
        <ChatInput
          onSubmit={handleSubmit}
          isSubmitting={isSending}
          actionLabel={isSending ? "Sending…" : "Send"}
          className="border-accent-purple/30"
          renderActions={() =>
            isSending ? (
              <Loader2 className="h-4 w-4 animate-spin text-accent-cyan" />
            ) : null
          }
        >
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for build advice, raid strats, or squad icebreakers…"
            rows={3}
            className="resize-none border-accent-purple/40 bg-surface/80 text-sm text-muted-foreground placeholder:text-muted-foreground focus-visible:ring-accent-cyan/40"
            disabled={isSending}
            required
          />
        </ChatInput>
      )}
    </ChatContainer>
  );
}

function CompanionOnboarding({
  initialGames,
  initialPlaystyle,
  initialTimeSlots,
  onComplete,
}: CompanionOnboardingProps) {
  const [selectedGames, setSelectedGames] = useState<string[]>(initialGames);
  const [gameSearch, setGameSearch] = useState("");
  const [playstyle, setPlaystyle] = useState(initialPlaystyle ?? "");
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>(
    Array.from(new Set(initialTimeSlots)),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialGamesKey = useMemo(() => initialGames.join("|"), [initialGames]);
  const initialTimeSlotsKey = useMemo(() => initialTimeSlots.join("|"), [initialTimeSlots]);

  useEffect(() => {
    setSelectedGames(initialGames);
  }, [initialGames]);

  useEffect(() => {
    setPlaystyle(initialPlaystyle ?? "");
  }, [initialPlaystyle]);

  useEffect(() => {
    setSelectedTimeSlots(Array.from(new Set(initialTimeSlots)));
  }, [initialTimeSlots]);

  const toggleTimeSlot = (value: string) => {
    setSelectedTimeSlots((prev) =>
      prev.includes(value)
        ? prev.filter((slot) => slot !== value)
        : [...prev, value]
    );
  };

  const filteredGames = useMemo(() => {
    const query = gameSearch.trim().toLowerCase();
    if (!query) {
      return GAME_OPTIONS;
    }
    return GAME_OPTIONS.filter((option) => option.label.toLowerCase().includes(query));
  }, [gameSearch]);

  const toggleGame = (value: string) => {
    setSelectedGames((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedGames.length) {
      toast.error("Select at least one MMO you play regularly.");
      return;
    }
    if (!playstyle) {
      toast.error("Choose a preferred playstyle.");
      return;
    }
    if (!selectedTimeSlots.length) {
      toast.error("Pick at least one window you usually squad up.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gamePref: selectedGames[0] ?? null,
          gamePreferences: selectedGames,
          playstyle,
          timeSlot: selectedTimeSlots[0] ?? null,
          timeSlots: selectedTimeSlots,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as
        | { profile: AiCompanionProfileSnapshot }
        | { error: string };

      if (!response.ok || !("profile" in payload)) {
        throw new Error("error" in payload ? payload.error : "Failed to save profile basics.");
      }

      const normalizedTimeSlots = payload.profile.timeSlots ?? [];
      setSelectedGames(payload.profile.gamePreferences ?? []);
      setPlaystyle(payload.profile.playstyle ?? "");
      setSelectedTimeSlots(normalizedTimeSlots);

      onComplete({
        gamePref: payload.profile.gamePref,
        playstyle: payload.profile.playstyle,
        timeSlot: payload.profile.timeSlot,
        timeSlots: normalizedTimeSlots,
        gamePreferences: payload.profile.gamePreferences ?? [],
      });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not save profile basics.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-cyan">
            Core MMOs
          </p>
          {selectedGames.length > 0 && (
            <span className="text-[11px] text-gray-500">
              {selectedGames.length} selected
            </span>
          )}
        </div>
        <Input
          value={gameSearch}
          onChange={(event) => setGameSearch(event.target.value)}
          placeholder="Search titles (WoW, FFXIV, New World...)"
          className="h-10 border-accent-purple/40 bg-background/70 text-sm text-gray-100 placeholder:text-gray-500 focus-visible:ring-accent-cyan/40"
        />
        <div className="flex flex-wrap gap-2">
          {filteredGames.length === 0 && (
            <span className="text-xs text-gray-500">
              No games found for “{gameSearch}”.
            </span>
          )}
          {filteredGames.map((option) => {
            const isSelected = selectedGames.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleGame(option.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  isSelected
                    ? "border-accent-cyan bg-accent-cyan/15 text-accent-cyan shadow-glow"
                    : "border-transparent bg-background/70 text-gray-200 hover:border-accent-cyan/40 hover:text-white"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-500">
          Your first pick becomes the primary match filter. Add extras to keep track of alternates.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-cyan">
          Preferred playstyle
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PLAYSTYLES.map((option) => {
            const isSelected = playstyle === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPlaystyle(option.value)}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left text-xs font-medium transition",
                  isSelected
                    ? "border-accent-cyan bg-accent-cyan/15 text-accent-cyan shadow-glow"
                    : "border-accent-purple/20 bg-background/60 text-gray-200 hover:border-accent-cyan/40 hover:text-white"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-cyan">
          Usual squad window
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TIME_SLOTS.map((option) => {
            const isSelected = selectedTimeSlots.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleTimeSlot(option.value)}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left text-xs font-medium transition",
                  isSelected
                    ? "border-accent-cyan bg-accent-cyan/15 text-accent-cyan shadow-glow"
                    : "border-accent-purple/20 bg-background/60 text-gray-200 hover:border-accent-cyan/40 hover:text-white"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-500">
          First slot becomes your primary match window. Add as many backups as you want.
        </p>
      </div>

      <Button
        type="submit"
        className="w-full rounded-2xl bg-accent-cyan px-4 py-3 text-sm font-semibold text-background transition hover:bg-accent-cyan/90 disabled:opacity-60"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save and continue"
        )}
      </Button>
    </form>
  );
}
