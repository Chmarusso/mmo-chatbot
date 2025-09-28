import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile, serializeProfile } from "@/lib/profile";
import { MobileNav } from "@/components/MobileNav";
import { DesktopNav } from "@/components/DesktopNav";

const PLACEHOLDER = "/avatar-placeholder.svg";

export const revalidate = 0;

export default async function MatchesPage() {
  const profile = await getOrCreateProfile();

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ user1Id: profile.id }, { user2Id: profile.id }],
    },
    include: {
      user1: { include: { user: true } },
      user2: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
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
      return {
        id: match.id,
        status: match.status,
        requiresGuardianApproval: match.requiresGuardianApproval,
        otherProfile: serializeProfile(other, other.user),
      };
    });

  return (
    <>
      <DesktopNav active="matches" />
      <main className="flex-1 space-y-6 px-4 py-6 pb-24 sm:px-6 lg:mx-auto lg:max-w-5xl lg:space-y-10 lg:px-12 lg:py-12 lg:pb-12">
        <header className="space-y-2 lg:text-left">
          <h1 className="text-3xl font-semibold lg:text-4xl">Your matches</h1>
          <p className="text-sm text-gray-400 lg:max-w-2xl lg:text-base">
            Tap a match to jump into real-time chat and schedule your next run.
          </p>
        </header>
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          {!formatted.length && (
            <div className="rounded-3xl border border-accent-purple/30 bg-surface/70 p-6 text-center lg:col-span-2 lg:p-10">
              <h2 className="text-lg font-semibold">No matches yet</h2>
              <p className="mt-2 text-sm text-gray-400 lg:text-base">
                Swipe on the dashboard to discover players who complement your party.
              </p>
            </div>
          )}
          {formatted.map(({ id, otherProfile, status, requiresGuardianApproval }) => (
            <Link
              key={id}
              href={`/chat/${id}`}
              className="flex items-center gap-4 rounded-3xl border border-accent-cyan/30 bg-surface/80 p-4 transition hover:border-accent-cyan/60 hover:shadow-glow lg:gap-6 lg:p-6"
            >
              <div className="relative h-14 w-14 overflow-hidden rounded-full border border-accent-cyan/40">
                <Image
                  src={otherProfile.avatarUrl || PLACEHOLDER}
                  alt={otherProfile.name}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold">{otherProfile.name}</span>
                <span className="text-xs text-gray-400">
                  {otherProfile.bio ?? "No bio yet"}
                </span>
              </div>
              <div className="ml-auto flex flex-col items-end gap-1 text-xs">
                <span className="text-accent-cyan">Tap to chat</span>
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
      <MobileNav active="matches" />
    </>
  );
}
