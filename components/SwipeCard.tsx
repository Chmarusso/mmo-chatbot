"use client";

import { motion, PanInfo } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/types/profile";
import { preferenceLabel, GAME_OPTIONS, TIME_SLOTS, LANGUAGES, PLAYSTYLES } from "@/types/profile";
import { cn } from "@/lib/utils";
import { resolveAvatarUrl, isPlaceholderAvatar } from "@/lib/avatar";

interface SwipeCardProps {
  profile: Profile;
  swipeDirection?: "yes" | "no" | null;
  onSwipe: (direction: "yes" | "no") => void;
}

const cardVariants = {
  enter: { opacity: 0, scale: 0.95, y: 20 },
  center: { opacity: 1, scale: 1, y: 0 },
  exitLeft: { opacity: 0, x: -220, rotate: -8 },
  exitRight: { opacity: 0, x: 220, rotate: 8 },
};

export function SwipeCard({ profile, onSwipe, swipeDirection }: SwipeCardProps) {
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 120) {
      onSwipe("yes");
    } else if (info.offset.x < -120) {
      onSwipe("no");
    }
  };

  const exitVariant = swipeDirection === "yes" ? "exitRight" : swipeDirection === "no" ? "exitLeft" : "exitLeft";

  return (
    <motion.div
      className={cn(
        "absolute inset-0 flex flex-col rounded-3xl border border-accent-cyan/20 bg-surface/90 p-6 shadow-glow lg:p-10"
      )}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      dragSnapToOrigin
      onDragEnd={handleDragEnd}
      whileDrag={{ rotate: 5, scale: 1.02 }}
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit={exitVariant}
    >
      <div className="flex flex-col items-center gap-4 lg:gap-6">
        <div
          className="relative h-32 w-32 overflow-hidden rounded-full border border-accent-purple/40 shadow-glow-purple lg:h-40 lg:w-40"
          onDragStart={(event) => event.preventDefault()}
        >
          <Image
            src={resolveAvatarUrl(profile.avatarUrl)}
            alt={profile.name}
            width={160}
            height={160}
            className="h-full w-full object-cover"
            draggable={false}
            unoptimized={isPlaceholderAvatar(profile.avatarUrl)}
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
              onClick={(e) => e.stopPropagation()}
            >
              {preferenceLabel(profile.gamePref, GAME_OPTIONS)}
            </Link>
          )}
          {profile.playstyle && (
            <Badge variant="playstyle">
              {preferenceLabel(profile.playstyle, PLAYSTYLES)}
            </Badge>
          )}
          {(profile.timeSlots?.length ? profile.timeSlots : profile.timeSlot ? [profile.timeSlot] : []).map(
            (slot) => (
              <Badge key={slot} variant="timeslot">
                {preferenceLabel(slot, TIME_SLOTS)}
              </Badge>
            )
          )}
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
      <div className="mt-auto grid grid-cols-2 gap-3 pt-6 lg:gap-4 lg:pt-8">
        <button
          type="button"
          onClick={() => onSwipe("no")}
          className="rounded-2xl border border-red-500/40 bg-red-500/10 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/20 lg:py-4 lg:text-base"
        >
          Pass
        </button>
        <button
          type="button"
          onClick={() => onSwipe("yes")}
          className="rounded-2xl border border-accent-cyan/40 bg-accent-cyan/20 py-3 text-sm font-medium text-accent-cyan transition hover:bg-accent-cyan/30 lg:py-4 lg:text-base"
        >
          Squad Up
        </button>
      </div>
    </motion.div>
  );
}
