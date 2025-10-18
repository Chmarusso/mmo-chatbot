"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ChatContainer,
  ChatHeader,
  ChatMessages,
  ChatBubble,
  ChatBubbleMessage,
  ChatBubbleTimestamp,
  ChatInput,
} from "@/components/ui/chat";
import type { ChatMessage } from "@/types/chat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMarkMatchViewedOnce } from "@/lib/hooks/useMarkMatchViewedOnce";
import type { Profile as UserProfile } from "@/types/profile";
import {
  preferenceLabel,
  TIME_SLOTS,
  LANGUAGES,
  PLAYSTYLES,
} from "@/types/profile";
import { Check, CheckCheck, MoreVertical, Ban, Trash2 } from "lucide-react";
import { useGameOptions } from "@/lib/hooks/useGameOptions";

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
  const { data: gameOptions } = useGameOptions();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
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

  useEffect(() => {
    console.log("useEffect running, inputRef.current:", inputRef.current);
    const input = inputRef.current;
    if (!input) {
      console.error("Input ref is null!");
      return;
    }

    console.log("Attaching keydown listener to input");
    const handleKeyPress = (event: globalThis.KeyboardEvent) => {
      console.log("Key event detected:", event.key);
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        console.log("Enter pressed, submitting");
        const form = input.form;
        if (form) {
          form.requestSubmit();
        } else {
          console.error("No form found!");
        }
      }
    };

    input.addEventListener("keydown", handleKeyPress);
    console.log("Listener attached");
    return () => {
      console.log("Cleaning up listener");
      input.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSend || isSending) return;
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
    <ChatContainer className="h-[520px] shadow-glow lg:h-[640px]">
      <ChatHeader>
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-400 lg:text-base">Chatting with</p>
            <h2 className="text-lg font-semibold lg:text-2xl">{otherUserName}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
            {otherProfile.gamePref && (
              <Link
                href={`/games/${otherProfile.gamePref.replace(/_/g, '-')}`}
                className="inline-flex items-center rounded-full bg-accent-purple/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-accent-purple transition hover:bg-accent-purple/30"
              >
                {preferenceLabel(otherProfile.gamePref, gameOptions)}
              </Link>
            )}
            {otherProfile.playstyle && (
              <Badge variant="playstyle">{preferenceLabel(otherProfile.playstyle, PLAYSTYLES)}</Badge>
            )}
            {(otherProfile.timeSlots?.length ? otherProfile.timeSlots : otherProfile.timeSlot ? [otherProfile.timeSlot] : []).map(
              (slot) => (
                <Badge key={slot} variant="timeslot">
                  {preferenceLabel(slot, TIME_SLOTS)}
                </Badge>
              )
            )}
            {otherProfile.language && (
              <Badge variant="language">{preferenceLabel(otherProfile.language, LANGUAGES)}</Badge>
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
      </ChatHeader>

      {!canSend && readOnlyReason ? (
        <div className="border-b border-accent-cyan/20 bg-surface/70 px-4 py-3 text-xs text-gray-300 lg:px-6 lg:text-sm">
          {readOnlyReason}
        </div>
      ) : null}

      <ChatMessages>
        <div className="space-y-4">
          {messages.map((msg) => {
            const isOwn = msg.senderId === profileId;
            const isRead = isOwn ? readMap.get(msg.id) ?? false : false;
            return (
              <ChatBubble key={msg.id} variant={isOwn ? "sent" : "received"}>
                <ChatBubbleMessage variant={isOwn ? "sent" : "received"}>
                  <p className="leading-relaxed">{msg.content}</p>
                  <ChatBubbleTimestamp className="flex items-center gap-1.5">
                    <span>{formatRelativeTime(msg.createdAt)}</span>
                    {isOwn && (
                      isRead ? (
                        <CheckCheck className="h-3 w-3 text-accent-cyan" aria-label="Read" />
                      ) : (
                        <Check className="h-3 w-3 text-gray-500" aria-label="Sent" />
                      )
                    )}
                  </ChatBubbleTimestamp>
                </ChatBubbleMessage>
              </ChatBubble>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ChatMessages>

      <ChatInput
        onSubmit={handleSubmit}
        isSubmitting={isSending}
        actionLabel="Send"
      >
        <Input
          ref={inputRef}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Send a message"
          autoComplete="off"
          disabled={!canSend}
          className="h-11 rounded-2xl border-accent-cyan/30 bg-background/60 text-base placeholder:text-gray-500 focus-visible:ring-accent-cyan/50"
        />
      </ChatInput>
    </ChatContainer>
  );
}
