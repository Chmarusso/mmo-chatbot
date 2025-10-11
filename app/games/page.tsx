import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Games | MMO Match",
  description: "Browse every MMO supported in MMO Match and discover new worlds to explore.",
};

export default async function GamesPage() {
  const games = await prisma.game.findMany({
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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {games.map((game) => (
          <Link key={game.value} href={`/games/${game.value.replace(/_/g, '-')}`}>
            <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-accent-purple/20 bg-surface/80 transition hover:border-accent-purple/40">
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
                <h2 className="text-lg font-semibold text-white">{game.label}</h2>
                {game.description && (
                  <p className="mt-2 line-clamp-3 text-xs text-text-secondary">
                    {game.description}
                  </p>
                )}
              </div>
            </article>
          </Link>
        ))}
      </section>
    </main>
  );
}
