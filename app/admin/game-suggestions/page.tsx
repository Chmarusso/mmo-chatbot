import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { serializeGameSuggestion } from "@/lib/suggestions";
import type { GameSuggestionStatus } from "@/types/game-suggestion";
import { AdminSuggestionList } from "@/components/AdminSuggestionList";

type PageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

const VALID_STATUSES: GameSuggestionStatus[] = ["pending", "accepted", "rejected"];

export const metadata: Metadata = {
  title: "Game Suggestions | Admin | MMOPLAYA",
};

export default async function AdminGameSuggestionsPage({ searchParams }: PageProps) {
  const profile = await getOrCreateProfile();
  if (!profile.isAdmin) {
    notFound();
  }

  const params = await searchParams;
  const rawStatus = params?.status?.toLowerCase() ?? "pending";
  const status: GameSuggestionStatus = VALID_STATUSES.includes(rawStatus as GameSuggestionStatus)
    ? (rawStatus as GameSuggestionStatus)
    : "pending";

  const prismaStatus = status === "pending" ? "PENDING" : status === "accepted" ? "ACCEPTED" : "REJECTED";

  const suggestions = await prisma.gameSuggestion.findMany({
    where: { status: { equals: prismaStatus } },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { include: { user: true } },
      handledBy: { include: { user: true } },
    },
  });

  const serialized = suggestions.map(serializeGameSuggestion);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-12 pb-24 lg:px-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white lg:text-4xl">Game Suggestions</h1>
        <p className="text-sm text-gray-400 lg:text-base">
          Review and respond to community submissions. Updating the status will notify the rest of the team.
        </p>
      </header>

      <nav className="flex flex-wrap items-center gap-2">
        {VALID_STATUSES.map((item) => {
          const isActive = item === status;
          return (
            <a
              key={item}
              href={`?status=${item}`}
              className={
                isActive
                  ? "rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-4 py-2 text-sm font-semibold text-accent-cyan"
                  : "rounded-full border border-accent-purple/30 px-4 py-2 text-sm text-gray-400 hover:border-accent-cyan/40 hover:text-white"
              }
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </a>
          );
        })}
      </nav>

      <AdminSuggestionList initialSuggestions={serialized} currentStatus={status} />
    </main>
  );
}
