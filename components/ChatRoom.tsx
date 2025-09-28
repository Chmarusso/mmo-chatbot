"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChatMessage } from "@/types/chat";

interface ChatRoomProps {
  matchId: string;
  profileId: string;
  initialMessages: ChatMessage[];
  otherUserName: string;
  canSend?: boolean;
  readOnlyReason?: string;
}

const POLL_INTERVAL_MS = 3000;

export function ChatRoom({
  matchId,
  profileId,
  initialMessages,
  otherUserName,
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

  useEffect(() => {
    setMessages(initialMessages);
    latestTimestampRef.current = initialMessages.length
      ? initialMessages[initialMessages.length - 1].createdAt
      : null;
  }, [initialMessages]);

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
          setMessages((prev) => {
            const merged = [...prev, ...newMessages];
            latestTimestampRef.current = merged[merged.length - 1]?.createdAt ?? latestTimestampRef.current;
            return merged;
          });
        }
      } catch (error) {
        console.error("Failed to poll messages", error);
      }
    };

    poll();
    const intervalId = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [matchId]);

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
    <div className="flex h-full flex-1 flex-col rounded-3xl border border-accent-purple/30 bg-surface/80 shadow-glow lg:min-h-[600px]">
      <div className="flex items-center gap-3 border-b border-accent-cyan/20 p-4 lg:p-6">
        <div>
          <p className="text-sm text-gray-400 lg:text-base">Chatting with</p>
          <h2 className="text-lg font-semibold lg:text-2xl">{otherUserName}</h2>
        </div>
      </div>
      {!canSend && readOnlyReason ? (
        <div className="border-b border-accent-cyan/20 bg-surface/70 px-4 py-3 text-xs text-gray-300 lg:px-6 lg:text-sm">
          {readOnlyReason}
        </div>
      ) : null}

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4 text-sm lg:space-y-3 lg:px-6 lg:py-6 lg:text-base">
        {messages.map((msg) => {
          const isOwn = msg.senderId === profileId;
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
                <span className="mt-1 block text-[10px] text-gray-400 lg:text-[11px]">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
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
