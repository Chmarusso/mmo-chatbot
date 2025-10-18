import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GameSuggestionStatus as PrismaStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { serializeGameUpdateSuggestion } from "@/lib/game-update-suggestions";
import { cn } from "@/lib/utils";
import type { GameUpdateSuggestionStatus } from "@/types/game-update-suggestion";
import { AdminGameUpdateList } from "@/components/AdminGameUpdateList";

type PageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

const VALID_STATUS: GameUpdateSuggestionStatus[] = ["pending", "accepted", "rejected"];

const STATUS_TO_PRISMA: Record<GameUpdateSuggestionStatus, PrismaStatus> = {
  pending: PrismaStatus.PENDING,
  accepted: PrismaStatus.ACCEPTED,
  rejected: PrismaStatus.REJECTED,
};

export const metadata: Metadata = {
  title: "Game Update Suggestions | Admin | MMOPLAYA",
};

export default async function AdminGameUpdateSuggestionsPage({ searchParams }: PageProps) {
  const profile = await getOrCreateProfile();
  if (!profile.isAdmin) {
    notFound();
  }

  const params = await searchParams;
  const requested = params?.status?.toLowerCase() as GameUpdateSuggestionStatus | undefined;
  const status: GameUpdateSuggestionStatus = requested && VALID_STATUS.includes(requested)
    ? requested
    : "pending";

  const suggestions = await prisma.gameUpdateSuggestion.findMany({
    where: { status: STATUS_TO_PRISMA[status] },
    orderBy: { createdAt: "desc" },
    include: {
      game: true,
      createdBy: { include: { user: true } },
      handledBy: { include: { user: true } },
    },
  });

  const serialized = suggestions.map(serializeGameUpdateSuggestion);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-12 pb-24 lg:px-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white lg:text-4xl">Game Update Suggestions</h1>
        <p className="text-sm text-gray-400 lg:text-base">
          Community-submitted edits to existing games. Accepting an update will apply the changes immediately.
        </p>
      </header>

      <nav className="flex flex-wrap items-center gap-2">
        {VALID_STATUS.map((value) => {
          const isActive = value === status;
          return (
            <a
              key={value}
              href={`?status=${value}`}
              className={cn(
                "rounded-full px-4 py-2 text-sm",
                isActive
                  ? "border border-accent-cyan/40 bg-accent-cyan/10 font-semibold text-accent-cyan"
                  : "border border-accent-purple/30 text-gray-400 hover:border-accent-cyan/40 hover:text-white"
              )}
            >
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </a>
          );
        })}
      </nav>

      <AdminGameUpdateList initialSuggestions={serialized} currentStatus={status} />
    </main>
  );
}
