"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GuildInviteAcceptFormProps {
  inviteCode: string;
  guildId: string;
  guildName: string;
}

export function GuildInviteAcceptForm({ inviteCode, guildId, guildName }: GuildInviteAcceptFormProps) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/guilds/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inviteCode, nickname: nickname.trim() || null }),
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        throw new Error("Sign in with a magic link before joining");
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to join guild");
      }

      toast.success("Welcome to the guild!");
      router.push(`/guilds/${guildId}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to join guild");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-accent-purple/30 bg-surface/80 p-6 shadow-glow lg:p-10">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold lg:text-2xl">Join {guildName}</h2>
        <p className="text-sm text-gray-400 lg:text-base">
          Choose how you want teammates to see you in this guild. You can update this nickname later from the members list.
        </p>
      </div>
      <div className="space-y-2">
        <label htmlFor="nickname" className="text-sm font-medium text-accent-cyan">
          Guild nickname
        </label>
        <Input
          id="nickname"
          placeholder="Nightblade Guardian"
          value={nickname}
          onChange={(event) => setNickname(event.target.value.slice(0, 80))}
          maxLength={80}
        />
        <p className="text-xs text-gray-500 text-right">{nickname.length}/80</p>
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Joining..." : "Accept invite"}
      </Button>
      <p className="text-xs text-gray-500">
        You need an active session to join. If prompted, request a magic link from the homepage and return to this invite.
      </p>
    </form>
  );
}
