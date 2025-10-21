import type { Metadata } from "next";
import Link from "next/link";
import { getOrCreateProfile } from "@/lib/profile";
import { GameSuggestionForm } from "@/components/GameSuggestionForm";

export const metadata: Metadata = {
  title: "Suggest a Game | MMOPLAYA",
  description: "Send us the MMO you want to see on MMOPLAYA and our admins will review it.",
};

export default async function SuggestGamePage() {
  await getOrCreateProfile();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12 pb-24 lg:px-12">
      <div className="space-y-3 text-center lg:text-left">
        <h1 className="text-3xl font-semibold text-white lg:text-4xl">Suggest a Game</h1>
        <p className="text-sm text-gray-300 lg:text-base">
          Let us know which MMO deserves a spotlight. Our admin crew reviews every suggestion and will
          follow up once it&apos;s approved. If it&apos;s already here, you can find it on the <Link href="/games" className="text-accent-cyan hover:text-accent-cyan/80">games list</Link>.
        </p>
      </div>

      <section className="rounded-[0.4em] border border-accent-cyan/30 bg-surface/80 p-6 shadow-glow lg:p-10">
        <GameSuggestionForm />
      </section>
    </main>
  );
}
