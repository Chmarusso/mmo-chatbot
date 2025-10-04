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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-12 pb-24 lg:px-12">
      <header className="space-y-3 text-center lg:text-left">
        <h1 className="text-3xl font-semibold text-white lg:text-4xl">Supported Games</h1>
        <p className="text-sm text-gray-300 lg:text-base">
          MMO Match connects players across the titles below. Update your profile to squad up in your favourite worlds.
        </p>
      </header>

      <section className="grid gap-6 lg:gap-8">
        {games.map((game) => (
          <article key={game.value} className="overflow-hidden rounded-3xl border border-accent-cyan/20 bg-surface/80">
            {game.screenshot && (
              <div className="relative h-48 w-full lg:h-64">
                <Image
                  src={game.screenshot}
                  alt={game.label}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 1200px"
                />
              </div>
            )}
            <div className="p-6 lg:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold text-white lg:text-3xl">{game.label}</h2>
                  {game.description && (
                    <p className="mt-2 text-sm text-gray-400 lg:text-base">
                      {game.description}
                    </p>
                  )}
                </div>
                {game.website && (
                  <a
                    href={game.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-4 py-2 text-sm font-medium text-accent-cyan transition hover:bg-accent-cyan/20"
                  >
                    Visit Site
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
              <Link
                href="/profile"
                className="mt-4 inline-flex rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-6 py-2 text-sm font-medium text-accent-cyan transition hover:bg-accent-cyan/20"
              >
                Set as your game
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
