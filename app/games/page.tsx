import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Games | MMO Match",
  description: "Browse every MMO supported in MMO Match and discover new worlds to explore.",
};

export default async function GamesPage() {
  const games = await prisma.game.findMany({
    include: {
      category: true,
    },
    orderBy: { label: "asc" },
  });

  // Get all categories for filter buttons
  const categories = await prisma.gameCategory.findMany({
    orderBy: { label: "asc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-12 pb-24 lg:px-12">
      <header className="space-y-3 text-center lg:text-left">
        <h1 className="text-3xl font-semibold text-white lg:text-4xl">Supported Games</h1>
        <p className="text-sm text-gray-300 lg:text-base">
          MMO Match connects players across the titles below. Update your profile to squad up in your favourite worlds.
        </p>
      </header>

      {/* Category Filter */}
      <section className="flex flex-wrap gap-2">
        <Badge variant="default" className="cursor-default">
          All Games
        </Badge>
        {categories.map((category) => (
          <Link key={category.id} href={`/games/category/${category.value}`}>
            <Badge variant="outline" className="cursor-pointer transition hover:bg-accent-purple/10">
              {category.label}
            </Badge>
          </Link>
        ))}
      </section>

      {/* Games Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {games.map((game) => (
          <article key={game.value} className="flex h-full flex-col overflow-hidden rounded-3xl border border-accent-purple/20 bg-surface/80 transition hover:border-accent-purple/40">
            <Link href={`/games/${game.value.replace(/_/g, '-')}`} className="flex flex-col flex-1">
              {game.screenshot && (
                <div className="relative h-40 w-full">
                  <Image
                    src={game.screenshot}
                    alt={game.label}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col p-4">
                <h2 className="text-lg font-semibold text-white mb-2">{game.label}</h2>
                {game.category && (
                  <Link
                    href={`/games/category/${game.category.value}`}
                    className="w-fit"
                  >
                    <Badge variant="secondary" className="mb-2 text-xs hover:bg-accent-purple/20 transition">
                      {game.category.label}
                    </Badge>
                  </Link>
                )}
                {game.description && (
                  <p className="mt-auto line-clamp-3 text-xs text-text-secondary">
                    {game.description}
                  </p>
                )}
              </div>
            </Link>
          </article>
        ))}
      </section>

      {games.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-text-secondary">No games found in this category.</p>
        </div>
      )}
    </main>
  );
}
