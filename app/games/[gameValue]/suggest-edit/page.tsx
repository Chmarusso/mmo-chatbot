import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { GameEditSuggestionForm } from "@/components/GameEditSuggestionForm";

type PageProps = {
  params: Promise<{ gameValue: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { gameValue } = await params;
  const game = await prisma.game.findUnique({ where: { value: gameValue } });
  if (!game) {
    return { title: "Game not found | MMOPLAYA" };
  }
  return {
    title: `Suggest edits for ${game.label} | MMOPLAYA`,
  };
}

export default async function SuggestEditPage({ params }: PageProps) {
  const [{ gameValue }] = await Promise.all([params, getOrCreateProfile()]);

  const game = await prisma.game.findUnique({ where: { value: gameValue } });
  if (!game) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12 pb-24 lg:px-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white lg:text-4xl">Suggest updates</h1>
        <p className="text-sm text-gray-300 lg:text-base">
          Help us keep <span className="font-semibold text-white">{game.label}</span> accurate and fresh. Submit any new
          info, screenshots, or metadata tweaks.
        </p>
      </header>

      <section className="rounded-[0.4em] border border-accent-cyan/30 bg-surface/80 p-6 shadow-glow lg:p-10">
        <GameEditSuggestionForm gameValue={game.value} gameLabel={game.label} />
      </section>
    </main>
  );
}
