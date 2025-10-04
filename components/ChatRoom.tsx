"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@/types/chat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMatchBadge } from "@/components/MatchBadgeProvider";
import { useMarkMatchViewedOnce } from "@/lib/hooks/useMarkMatchViewedOnce";
import type { Profile as UserProfile } from "@/types/profile";
import {
  preferenceLabel,
  GAME_OPTIONS,
  TIME_SLOTS,
  LANGUAGES,
  PLAYSTYLES,
} from "@/types/profile";
import { Check, CheckCheck, MoreVertical, Ban, Trash2 } from "lucide-react";

interface ChatRoomProps {
  matchId: string;
  profileId: string;
  initialMessages: ChatMessage[];
  otherUserName: string;
  otherProfile: UserProfile;
  canSend?: boolean;
  readOnlyReason?: string;
}

const POLL_INTERVAL_MS = 3000;

export function ChatRoom({
  matchId,
  profileId,
  initialMessages,
  otherUserName,
  otherProfile,
  canSend = true,
  readOnlyReason,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const latestTimestampRef = useRef<string | null>(
    initialMessages.length ? initialMessages[initialMessages.length - 1].createdAt : null
  );
  const markMatchViewed = useMarkMatchViewedOnce(matchId);
  const readMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (let i = 0; i < messages.length; i += 1) {
      const current = messages[i];
      if (current.senderId !== profileId) continue;
      let read = false;
      for (let j = i + 1; j < messages.length; j += 1) {
        if (messages[j].senderId !== profileId) {
          read = true;
          break;
        }
      }
      map.set(current.id, read);
    }
    return map;
  }, [messages, profileId]);

  const formatRelativeTime = useCallback((isoDate: string) => {
    const createdAt = new Date(isoDate).getTime();
    const diffMs = Date.now() - createdAt;
    if (diffMs < 45_000) return "Just now";
    const diffMinutes = Math.round(diffMs / 60_000);
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    }
    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 30) {
      return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    }
    const diffMonths = Math.round(diffDays / 30);
    if (diffMonths < 12) {
      return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
    }
    const diffYears = Math.round(diffMonths / 12);
    return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
  }, []);

  useEffect(() => {
    setMessages(initialMessages);
    latestTimestampRef.current = initialMessages.length
      ? initialMessages[initialMessages.length - 1].createdAt
      : null;
  }, [initialMessages]);

  // Mark match as viewed when component mounts (handled by useMarkMatchViewedOnce)

  useEffect(() => {
    const poll = async () => {
      try {
        const params = new URLSearchParams();
        if (latestTimestampRef.current) {
          params.set("since", latestTimestampRef.current);
        }
        const response = await fetch(`/api/messages/${matchId}?${params.toString()}`);
        if (!response.ok) return;
        const { messages: newMessages } = (await response.json()) as { messages: ChatMessage[] };
        if (newMessages?.length) {
          const containsIncoming = newMessages.some((msg) => msg.senderId !== profileId);
          setMessages((prev) => {
            const existingIds = new Set(prev.map((message) => message.id));
            const merged = [...prev];
            for (const message of newMessages) {
              if (!existingIds.has(message.id)) {
                merged.push(message);
              }
            }
            latestTimestampRef.current = merged[merged.length - 1]?.createdAt ?? latestTimestampRef.current;
            return merged;
          });
          // React Query will automatically handle cache invalidation
        }
      } catch (error) {
        console.error("Failed to poll messages", error);
      }
    };

    poll();
    const intervalId = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [matchId, profileId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend) return;
    const trimmed = message.trim();
    if (!trimmed) return;

    setIsSending(true);

    try {
      const response = await fetch(`/api/messages/${matchId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: trimmed }),
      });

      const payload = (await response.json().catch(() => ({}))) as
        | { message: ChatMessage }
        | { error: string };

      if (!response.ok || !("message" in payload)) {
        throw new Error(
          "error" in payload ? payload.error : "Message failed to send"
        );
      }

      const created = payload.message;
      setMessages((prev) => {
        const merged = [...prev, created];
        latestTimestampRef.current = merged[merged.length - 1]?.createdAt ?? latestTimestampRef.current;
        return merged;
      });
      setMessage("");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Message failed to send");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-[520px] flex-col rounded-3xl border border-accent-purple/30 bg-surface/80 shadow-glow lg:h-[640px]">
      <div className="flex items-center justify-between gap-3 border-b border-accent-cyan/20 p-4 lg:p-6">
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-400 lg:text-base">Chatting with</p>
            <h2 className="text-lg font-semibold lg:text-2xl">{otherUserName}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
            {otherProfile.gamePref && (
              <Badge variant="glow">{preferenceLabel(otherProfile.gamePref, GAME_OPTIONS)}</Badge>
            )}
            {otherProfile.playstyle && (
              <Badge>{preferenceLabel(otherProfile.playstyle, PLAYSTYLES)}</Badge>
            )}
            {otherProfile.timeSlot && (
              <Badge>{preferenceLabel(otherProfile.timeSlot, TIME_SLOTS)}</Badge>
            )}
            {otherProfile.language && (
              <Badge>{preferenceLabel(otherProfile.language, LANGUAGES)}</Badge>
            )}
          </div>
          {otherProfile.bio && (
            <p className="max-w-2xl text-xs text-gray-400 lg:text-sm">{otherProfile.bio}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full border border-accent-cyan/30 p-2 text-accent-cyan transition hover:bg-accent-cyan/10">
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Chat options</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-surface text-sm text-gray-100">
            <DropdownMenuItem
              onClick={async () => {
                try {
                  const response = await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
                  if (!response.ok) {
                    throw new Error("Failed to remove match");
                  }
                  toast.success("Match removed");
                  window.location.href = "/matches";
                } catch (error) {
                  console.error(error);
                  toast.error("Could not remove match");
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4 text-red-300" /> Remove match
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                const reason = window.prompt("Let us know why you are reporting this player (optional)");
                try {
                  const response = await fetch(`/api/matches/${matchId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reason }),
                  });
                  if (!response.ok) {
                    throw new Error("Failed to submit report");
                  }
                  toast.success("Report submitted");
                } catch (error) {
                  console.error(error);
                  toast.error("Could not submit report");
                }
              }}
            >
              <Ban className="mr-2 h-4 w-4 text-yellow-300" /> Report player
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {!canSend && readOnlyReason ? (
        <div className="border-b border-accent-cyan/20 bg-surface/70 px-4 py-3 text-xs text-gray-300 lg:px-6 lg:text-sm">
          {readOnlyReason}
        </div>
      ) : null}

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4 text-sm lg:space-y-3 lg:px-6 lg:py-6 lg:text-base">
        {messages.map((msg) => {
          const isOwn = msg.senderId === profileId;
          const isRead = isOwn ? readMap.get(msg.id) ?? false : false;
          return (
            <div
              key={msg.id}
              className={`flex w-full ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs rounded-2xl px-4 py-2 lg:max-w-lg lg:px-5 lg:py-3 ${
                  isOwn
                    ? "bg-accent-cyan/30 text-accent-cyan"
                    : "border border-accent-purple/30 bg-surface text-gray-100"
                }`}
              >
                <p>{msg.content}</p>
                <div
                  className={`mt-1 flex items-center gap-2 text-[10px] text-gray-400 lg:text-[11px] ${
                    isOwn ? "justify-end" : "justify-start"
                  }`}
                >
                  <span>{formatRelativeTime(msg.createdAt)}</span>
                  {isOwn && (
                    isRead ? (
                      <CheckCheck className="h-3 w-3 text-accent-cyan" aria-label="Read" />
                    ) : (
                      <Check className="h-3 w-3 text-gray-500" aria-label="Sent" />
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-accent-cyan/20 p-4 lg:gap-3 lg:p-6">
        <Input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Send a message"
          autoComplete="off"
          disabled={!canSend}
        />
        <Button type="submit" disabled={isSending || !message.trim() || !canSend}>
          Send
        </Button>
      </form>
    </div>
  );
}
