import Link from "next/link";
import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile, serializeProfile } from "@/lib/profile";
import type { Profile } from "@/types/profile";
import { SwipeDeck } from "@/components/SwipeDeck";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Discover Matches | MMOPLAYA",
  description: "Swipe through MMO players who share your schedule, language, and playstyle.",
};

export default async function DashboardPage() {
  const profile = await getOrCreateProfile();

  const swipes = await prisma.swipe.findMany({
    where: { swiperId: profile.id },
    select: { swipedId: true },
  });

  const excludeIds = new Set<string>([profile.id]);
  swipes.forEach((swipe) => excludeIds.add(swipe.swipedId));

  let candidates: Profile[] = [];

  const hasPreferences = profile.gamePref && profile.language;

  if (hasPreferences) {
    const preferenceWhere: Prisma.ProfileWhereInput = {
      ...(profile.gamePref ? { gamePref: { equals: profile.gamePref } } : {}),
      ...(profile.language ? { language: { equals: profile.language } } : {}),
      NOT: { id: profile.id },
    };

    const potentialProfiles = await prisma.profile.findMany({
      where: preferenceWhere,
      include: {
        user: true,
      },
      take: 50,
    });

    candidates = potentialProfiles
      .filter((candidate) => !excludeIds.has(candidate.id))
      .map((candidate) => serializeProfile(candidate, candidate.user));
  }

  return (
    <main className="flex-1 space-y-8 px-4 py-6 pb-24 sm:px-6 lg:mx-auto lg:max-w-6xl lg:space-y-10 lg:px-12 lg:py-12 lg:pb-12">
      <header className="space-y-2 text-center lg:text-left">
        <h1 className="text-3xl font-semibold lg:text-4xl">Find your next raid squad</h1>
        <p className="text-sm text-gray-400 lg:max-w-2xl lg:text-base">
          Swipe to squad up with players who share your MMO and language.
        </p>
      </header>

      {!hasPreferences ? (
        <div className="mx-auto max-w-md rounded-3xl border border-accent-cyan/30 bg-surface/70 p-8 text-center lg:mx-0 lg:max-w-xl lg:text-left">
          <h2 className="text-xl font-semibold">Finish your profile to start matching</h2>
          <p className="mt-2 text-sm text-gray-300 lg:text-base">
            Tell us your preferred MMO and language to meet players who match your vibe.
          </p>
          <Link
            href="/profile"
            className="mt-4 inline-flex rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-5 py-2 text-sm font-medium text-accent-cyan hover:bg-accent-cyan/20"
          >
            Complete profile
          </Link>
        </div>
      ) : (
        <div className="flex justify-center lg:justify-start">
          <SwipeDeck profiles={candidates} currentProfileId={profile.id} />
        </div>
      )}
    </main>
  );
}
