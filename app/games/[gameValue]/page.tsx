import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ExternalLink, Star } from "lucide-react";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { resolveAvatarUrl, isPlaceholderAvatar } from "@/lib/avatar";
import RatingSection from "@/components/RatingSection";
import GameComments from "@/components/GameComments";

interface GamePageProps {
  params: Promise<{ gameValue: string }>;
}

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { gameValue } = await params;
  const dbGameValue = gameValue.replace(/-/g, '_');
  const game = await prisma.game.findUnique({
    where: { value: dbGameValue },
  });

  if (!game) {
    return {
      title: "Game Not Found | MMOPLAYA",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const ogImageUrl = `${baseUrl}/api/og/game/${dbGameValue}`;

  return {
    title: `${game.label} | MMOPLAYA`,
    description: game.description || `Find players for ${game.label} on MMOPLAYA`,
    openGraph: {
      title: `${game.label} | MMOPLAYA`,
      description: game.description || `Find players for ${game.label} on MMOPLAYA`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${game.label} on MMOPLAYA`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${game.label} | MMOPLAYA`,
      description: game.description || `Find players for ${game.label} on MMOPLAYA`,
      images: [ogImageUrl],
    },
  };
}

export default async function GamePage({ params }: GamePageProps) {
  const { gameValue } = await params;
  const currentUser = await getCurrentUser();

  // Convert URL format (with dashes) back to database format (with underscores)
  const dbGameValue = gameValue.replace(/-/g, '_');

  const game = await prisma.game.findUnique({
    where: { value: dbGameValue },
    include: {
      profiles: {
        where: {
          isShadowbanned: false,
        },
        take: 12,
        orderBy: {
          updatedAt: "desc",
        },
      },
      ratings: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!game) {
    notFound();
  }

  const currentUserRating = currentUser
    ? game.ratings.find((r) => r.profileId === currentUser.profile?.id)
    : null;

  const averageRating =
    game.ratings.length > 0
      ? game.ratings.reduce((sum, r) => sum + r.rating, 0) / game.ratings.length
      : 0;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-12 pb-24 lg:px-12">
      {/* Header Section */}
      <header className="space-y-4">
        <Link
          href="/games"
          className="inline-flex items-center gap-2 text-sm text-text-secondary transition hover:text-accent-purple"
        >
          ← Back to Games
        </Link>
        <h1 className="text-3xl font-semibold text-white lg:text-4xl">{game.label}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href={`/games/${game.value.replace(/_/g, '-')}/suggest-edit`}
            className="inline-flex items-center rounded-[0.4em] border border-accent-cyan/40 px-4 py-1.5 text-accent-cyan transition hover:bg-accent-cyan/15"
          >
            Suggest an edit
          </Link>
        </div>
      </header>

      {/* Screenshot Section */}
      {game.screenshot && (
        <section className="relative h-64 w-full overflow-hidden rounded-[0.4em] border border-accent-purple/20 lg:h-96">
          <Image
            src={game.screenshot}
            alt={game.label}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 1200px"
            priority
          />
        </section>
      )}

      {/* Info Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <section className="space-y-6 lg:col-span-2">
          {/* Description */}
          {game.description && (
            <div className="rounded-[0.4em] border border-accent-purple/20 bg-surface/80 p-6">
              <h2 className="mb-3 text-xl font-semibold text-white">About</h2>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => (
                      <p className="mb-4 text-sm leading-relaxed text-text-secondary last:mb-0">
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-white">{children}</strong>
                    ),
                    h1: ({ children }) => (
                      <h3 className="mb-2 mt-4 text-base font-semibold text-white first:mt-0">
                        {children}
                      </h3>
                    ),
                    h2: ({ children }) => (
                      <h3 className="mb-2 mt-4 text-base font-semibold text-white first:mt-0">
                        {children}
                      </h3>
                    ),
                    h3: ({ children }) => (
                      <h4 className="mb-2 mt-3 text-sm font-semibold text-white first:mt-0">
                        {children}
                      </h4>
                    ),
                    ul: ({ children }) => (
                      <ul className="mb-4 ml-4 list-disc space-y-1 text-sm text-text-secondary">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="mb-4 ml-4 list-decimal space-y-1 text-sm text-text-secondary">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  }}
                >
                  {game.description}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Rating Section - Only for authenticated users */}
          {currentUser && (
            <div className="rounded-[0.4em] border border-accent-purple/20 bg-surface/80 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Community Rating</h2>
                <div className="flex items-center gap-2">
                  <Star className="fill-accent-purple text-accent-purple" size={20} />
                  <span className="text-lg font-semibold text-white">
                    {averageRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-text-secondary">({game.ratings.length})</span>
                </div>
              </div>
              <RatingSection
                gameValue={dbGameValue}
                currentRating={currentUserRating?.rating}
                isLoggedIn={true}
              />
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Actions */}
          <div className="space-y-3 rounded-[0.4em] border border-accent-purple/20 bg-surface/80 p-6">
            {currentUser ? (
              <Link
                href="/profile"
                className="block w-full rounded-[0.4em] bg-accent-purple px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-accent-purple/80"
              >
                Set as Your Game
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="block w-full rounded-[0.4em] bg-accent-purple px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-accent-purple/80"
              >
                Join to Play
              </Link>
            )}
            {game.website && (
              <a
                href={`/api/games/${gameValue}/visit`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-[0.4em] border border-accent-purple/40 px-4 py-3 text-sm font-medium text-text-secondary transition hover:border-accent-purple hover:text-accent-purple"
              >
                Visit Official Site
                <ExternalLink size={16} />
              </a>
            )}
          </div>

          {/* Stats - Only for authenticated users */}
          {currentUser && (
            <div className="rounded-[0.4em] border border-accent-purple/20 bg-surface/80 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Stats</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Active Players</span>
                  <span className="font-medium text-white">{game.profiles.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total Ratings</span>
                  <span className="font-medium text-white">{game.ratings.length}</span>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Comments and Players - Only for authenticated users */}
      {currentUser ? (
        <>
          {/* Comments Section */}
          <section>
            <GameComments gameValue={gameValue} isLoggedIn={true} />
          </section>

          {/* Players Section */}
          {game.profiles.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Players</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {game.profiles.map((profile) => (
                  <Link key={profile.id} href={`/profile/${profile.id}`}>
                    <article className="flex items-center gap-3 rounded-[0.4em] border border-accent-purple/20 bg-surface/80 p-4 transition hover:border-accent-purple/40">
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
                        <Image
                          src={resolveAvatarUrl(profile.avatarUrl)}
                          alt={profile.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized={isPlaceholderAvatar(profile.avatarUrl)}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium text-white">{profile.name}</h3>
                        {profile.bio && (
                          <p className="line-clamp-1 text-xs text-text-secondary">{profile.bio}</p>
                        )}
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        /* Login prompt for unauthenticated users */
        <section className="rounded-[0.4em] border border-accent-purple/20 bg-gradient-to-br from-surface/80 to-accent-purple/5 p-8 text-center">
          <div className="mb-4 text-6xl">👥</div>
          <h2 className="mb-3 text-2xl font-bold text-white">
            Want to connect with players?
          </h2>
          <p className="mb-6 text-base text-text-secondary">
            Join MMOPLAYA to see who&apos;s playing {game.label}, chat with the community, and find your perfect squad! 🎮
          </p>
          <a
            href="/auth/login"
            className="inline-block rounded-[0.4em] bg-gradient-to-r from-accent-purple to-accent-pink px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
          >
            Join the Community
          </a>
        </section>
      )}
    </main>
  );
}
