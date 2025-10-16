import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { resolveAvatarUrl, isPlaceholderAvatar } from "@/lib/avatar";
import { getCurrentUser } from "@/lib/session";
import { Gamepad2, Globe, Clock, Languages, Target, Lock } from "lucide-react";

interface ProfilePageProps {
  params: Promise<{ profileId: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { profileId } = await params;

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { name: true, bio: true },
  });

  if (!profile) {
    return {
      title: "Profile Not Found | MMOPLAYA",
    };
  }

  return {
    title: `${profile.name} | MMOPLAYA`,
    description: profile.bio || `View ${profile.name}'s gaming profile on MMOPLAYA`,
  };
}

export default async function ProfileViewPage({ params }: ProfilePageProps) {
  const { profileId } = await params;
  const currentUser = await getCurrentUser();
  const isAuthenticated = !!currentUser;

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      preferredGame: true,
      preferredTimeSlot: true,
      preferredLanguage: true,
      preferredPlaystyle: true,
    },
  });

  if (!profile || profile.isShadowbanned) {
    notFound();
  }

  // Get all game preferences - combine both old gamePref and new gamePreferences
  const gameValues = [...profile.gamePreferences];
  if (profile.gamePref && !gameValues.includes(profile.gamePref)) {
    gameValues.push(profile.gamePref);
  }

  const gamePreferences = gameValues.length > 0 ? await prisma.game.findMany({
    where: {
      value: {
        in: gameValues,
      },
    },
    select: {
      value: true,
      label: true,
      screenshot: true,
      category: {
        select: {
          label: true,
        },
      },
    },
  }) : [];

  // Get time slot preferences
  const timeSlotPreferences = await prisma.timeSlotOption.findMany({
    where: {
      value: {
        in: profile.timeSlots,
      },
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12 pb-24 lg:px-12">
      {/* Header with Avatar */}
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-accent-purple/20 lg:h-40 lg:w-40">
          <Image
            src={resolveAvatarUrl(profile.avatarUrl)}
            alt={profile.name}
            fill
            className="object-cover"
            sizes="160px"
            priority
            unoptimized={isPlaceholderAvatar(profile.avatarUrl)}
          />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white lg:text-4xl">{profile.name}</h1>
          {isAuthenticated && profile.bio && (
            <p className="text-base text-text-secondary lg:text-lg">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Fun login prompt for unauthenticated users */}
      {!isAuthenticated && (
        <div className="rounded-3xl border border-accent-purple/20 bg-gradient-to-br from-surface/80 to-accent-purple/5 p-8 text-center">
          <div className="mb-4 text-6xl">🎮</div>
          <h2 className="mb-3 text-2xl font-bold text-white">
            This profile is invite-only!
          </h2>
          <p className="mb-6 text-base text-text-secondary">
            Want to see {profile.name}'s epic gaming setup, favorite games, and when they're online?
            Join MMOPLAYA to unlock the full squad experience! 🚀
          </p>
          <a
            href="/auth/login"
            className="inline-block rounded-full bg-gradient-to-r from-accent-purple to-accent-pink px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
          >
            Join the Party 🎉
          </a>
        </div>
      )}

      {/* Game Preferences - only for authenticated users */}
      {isAuthenticated && (gamePreferences.length > 0 || profile.preferredGame) && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <Gamepad2 size={24} className="text-accent-purple" />
            {gamePreferences.length > 1 ? "Games I Play" : "Favorite Game"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {gamePreferences.length > 0 ? (
              gamePreferences.map((game) => (
                <div
                  key={game.value}
                  className="overflow-hidden rounded-3xl border border-accent-purple/20 bg-surface/80"
                >
                  {game.screenshot && (
                    <div className="relative h-32 w-full overflow-hidden">
                      <Image
                        src={game.screenshot}
                        alt={game.label}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-white">{game.label}</h3>
                    {game.category && (
                      <p className="text-sm text-text-secondary">{game.category.label}</p>
                    )}
                  </div>
                </div>
              ))
            ) : profile.preferredGame ? (
              <div className="overflow-hidden rounded-3xl border border-accent-purple/20 bg-surface/80">
                {profile.preferredGame.screenshot && (
                  <div className="relative h-32 w-full overflow-hidden">
                    <Image
                      src={profile.preferredGame.screenshot}
                      alt={profile.preferredGame.label}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-white">{profile.preferredGame.label}</h3>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* Preferences Grid - only for authenticated users */}
      {isAuthenticated && (
      <section className="grid gap-4 sm:grid-cols-2">
        {/* Time Slots */}
        {timeSlotPreferences.length > 0 && (
          <div className="rounded-3xl border border-accent-purple/20 bg-surface/80 p-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-white">
              <Clock size={20} className="text-accent-purple" />
              Available Times
            </h3>
            <div className="flex flex-wrap gap-2">
              {timeSlotPreferences.map((slot) => (
                <span
                  key={slot.value}
                  className="rounded-full bg-accent-purple/20 px-3 py-1 text-sm text-white"
                >
                  {slot.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Language */}
        {profile.preferredLanguage && (
          <div className="rounded-3xl border border-accent-purple/20 bg-surface/80 p-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-white">
              <Languages size={20} className="text-accent-purple" />
              Language
            </h3>
            <p className="text-text-secondary">
              {profile.preferredLanguage.icon && `${profile.preferredLanguage.icon} `}
              {profile.preferredLanguage.label}
            </p>
          </div>
        )}

        {/* Playstyle */}
        {profile.preferredPlaystyle && (
          <div className="rounded-3xl border border-accent-purple/20 bg-surface/80 p-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-white">
              <Target size={20} className="text-accent-purple" />
              Playstyle
            </h3>
            <p className="text-text-secondary">{profile.preferredPlaystyle.label}</p>
          </div>
        )}

        {/* Social Links */}
        {(profile.twitterLink || profile.redditLink) && (
          <div className="rounded-3xl border border-accent-purple/20 bg-surface/80 p-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-white">
              <Globe size={20} className="text-accent-purple" />
              Social Links
            </h3>
            <div className="space-y-2">
              {profile.twitterLink && (
                <a
                  href={profile.twitterLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-accent-purple hover:underline"
                >
                  Twitter/X
                </a>
              )}
              {profile.redditLink && (
                <a
                  href={profile.redditLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-accent-purple hover:underline"
                >
                  Reddit
                </a>
              )}
            </div>
          </div>
        )}
      </section>
      )}

      {/* Level & XP (if visible) - only for authenticated users */}
      {isAuthenticated && profile.level > 1 && (
        <div className="rounded-3xl border border-accent-purple/20 bg-surface/80 p-6 text-center">
          <p className="text-sm text-text-secondary">Level</p>
          <p className="text-4xl font-bold text-accent-purple">{profile.level}</p>
          <p className="mt-1 text-sm text-text-secondary">{profile.exp} XP</p>
        </div>
      )}
    </main>
  );
}
