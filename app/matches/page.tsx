import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile, serializeProfile } from "@/lib/profile";

const PLACEHOLDER = "/avatar-placeholder.svg";

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Your Matches | MMO Match",
  description: "Review your mutual matches and jump straight into chat to coordinate raids.",
};

export default async function MatchesPage() {
  const profile = await getOrCreateProfile();

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ user1Id: profile.id }, { user2Id: profile.id }],
    },
    include: {
      user1: { include: { user: true } },
      user2: { include: { user: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const formatted = matches
    .filter((match) => {
      if (profile.isChild) {
        return match.status === "ACTIVE";
      }
      return true;
    })
    .map((match) => {
      const other = match.user1Id === profile.id ? match.user2 : match.user1;
      const lastMessage = match.messages[0];
      return {
        id: match.id,
        status: match.status,
        requiresGuardianApproval: match.requiresGuardianApproval,
        otherProfile: serializeProfile(other, other.user),
        lastMessage: lastMessage?.content || null,
        lastMessageTime: lastMessage?.createdAt || match.createdAt,
      };
    })
    .sort((a, b) => {
      const timeA = a.lastMessageTime.getTime();
      const timeB = b.lastMessageTime.getTime();
      return timeB - timeA; // Most recent first
    });

  return (
    <main className="flex-1 space-y-6 px-4 py-6 pb-24 sm:px-6 lg:mx-auto lg:max-w-5xl lg:space-y-10 lg:px-12 lg:py-12 lg:pb-12">
      <header className="space-y-2 lg:text-left">
        <h1 className="text-3xl font-semibold lg:text-4xl">Your matches</h1>
        <p className="text-sm text-gray-400 lg:max-w-2xl lg:text-base">
          Tap a match to jump into real-time chat and schedule your next run.
        </p>
      </header>
      <div className="space-y-3">
        {!formatted.length && (
          <div className="rounded-3xl border border-accent-purple/30 bg-surface/70 p-6 text-center lg:p-10">
            <h2 className="text-lg font-semibold">No matches yet</h2>
            <p className="mt-2 text-sm text-gray-400 lg:text-base">
              Swipe on the dashboard to discover players who complement your party.
            </p>
          </div>
        )}
        {formatted.map(({ id, otherProfile, status, requiresGuardianApproval, lastMessage, lastMessageTime }) => (
          <Link
            key={id}
            href={`/chat/${id}`}
            className="flex items-center gap-4 rounded-3xl border border-accent-cyan/30 bg-surface/80 p-4 transition hover:border-accent-cyan/60 lg:gap-6 lg:p-6"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-accent-cyan/40">
              <Image
                src={otherProfile.avatarUrl || PLACEHOLDER}
                alt={otherProfile.name}
                width={56}
                height={56}
                className="h-full w-full object-cover"
                unoptimized={!otherProfile.avatarUrl || otherProfile.avatarUrl === PLACEHOLDER}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-lg font-semibold">{otherProfile.name}</span>
              {lastMessage ? (
                <span className="truncate text-sm text-gray-400">
                  {lastMessage}
                </span>
              ) : (
                <span className="text-sm text-gray-500 italic">
                  No messages yet
                </span>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
              {lastMessageTime && (
                <span className="text-gray-400">
                  {formatTimeAgo(new Date(lastMessageTime))}
                </span>
              )}
              {status !== "ACTIVE" ? (
                <span className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-yellow-200">
                  {status === "PENDING" && requiresGuardianApproval
                    ? "Pending guardian approval"
                    : status === "BLOCKED"
                    ? "Blocked"
                    : status.toLowerCase()}
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
