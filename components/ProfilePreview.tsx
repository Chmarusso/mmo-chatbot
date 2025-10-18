"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/types/profile";
import { preferenceLabel, TIME_SLOTS, LANGUAGES, PLAYSTYLES } from "@/types/profile";
import { resolveAvatarUrl, isPlaceholderAvatar } from "@/lib/avatar";
import { useGameOptions } from "@/lib/hooks/useGameOptions";

interface ProfilePreviewProps {
  profile: Profile;
}

export function ProfilePreview({ profile }: ProfilePreviewProps) {
  const { data: gameOptions } = useGameOptions();
  const timeSlots =
    profile.timeSlots && profile.timeSlots.length > 0
      ? profile.timeSlots
      : profile.timeSlot
      ? [profile.timeSlot]
      : [];

  return (
    <div className="flex flex-col rounded-3xl border border-accent-cyan/20 bg-surface/90 p-6 shadow-glow lg:p-10">
      <div className="flex flex-col items-center gap-4 lg:gap-6">
        <div className="relative h-32 w-32 overflow-hidden rounded-full border border-accent-purple/40 shadow-glow-purple lg:h-40 lg:w-40">
          <Image
            src={
              isPlaceholderAvatar(profile.avatarUrl)
                ? resolveAvatarUrl(profile.avatarUrl)
                : `${profile.avatarUrl}?t=${Date.now()}`
            }
            alt={profile.name}
            width={160}
            height={160}
            className="h-full w-full object-cover"
            unoptimized={isPlaceholderAvatar(profile.avatarUrl)}
            key={profile.avatarUrl || 'placeholder'}
          />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-semibold lg:text-3xl">{profile.name}</h2>
          {profile.bio && <p className="text-sm text-gray-300 lg:text-base">{profile.bio}</p>}
        </div>
      </div>
      <div className="mt-6 space-y-3 lg:space-y-4">
        <div className="flex flex-wrap justify-center gap-2 text-xs lg:gap-3 lg:text-sm">
          {profile.gamePref && (
            <Link
              href={`/games/${profile.gamePref.replace(/_/g, '-')}`}
              className="inline-flex items-center rounded-full bg-accent-purple/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-accent-purple transition hover:bg-accent-purple/30"
            >
              {preferenceLabel(profile.gamePref, gameOptions)}
            </Link>
          )}
          {profile.playstyle && (
            <Badge variant="playstyle">
              {preferenceLabel(profile.playstyle, PLAYSTYLES)}
            </Badge>
          )}
          {timeSlots.map((slot) => (
            <Badge key={slot} variant="timeslot">
              {preferenceLabel(slot, TIME_SLOTS)}
            </Badge>
          ))}
          {profile.language && (
            <Badge variant="language">
              {preferenceLabel(profile.language, LANGUAGES)}
            </Badge>
          )}
        </div>
        <div className="flex justify-center gap-3 lg:gap-4">
          {profile.twitterLink && (
            <a
              href={profile.twitterLink.startsWith("http") ? profile.twitterLink : `https://twitter.com/${profile.twitterLink.replace(/^@/, "")}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-accent-cyan/40 px-3 py-1 text-xs text-accent-cyan transition hover:bg-accent-cyan/10 lg:px-4 lg:py-1.5 lg:text-sm"
            >
              Twitter
            </a>
          )}
          {profile.redditLink && (
            <a
              href={profile.redditLink.startsWith("http") ? profile.redditLink : `https://reddit.com/${profile.redditLink}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-accent-purple/40 px-3 py-1 text-xs text-accent-purple transition hover:bg-accent-purple/10 lg:px-4 lg:py-1.5 lg:text-sm"
            >
              Reddit
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
