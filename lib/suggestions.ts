import { GameSuggestionStatus as PrismaSuggestionStatus, type GameSuggestion as PrismaSuggestion, type Profile as PrismaProfile, type User } from "@prisma/client";
import type { GameSuggestion, GameSuggestionStatus } from "@/types/game-suggestion";

const STATUS_MAP: Record<PrismaSuggestionStatus, GameSuggestionStatus> = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
};

type SuggestionWithRelations = PrismaSuggestion & {
  createdBy: PrismaProfile & { user: User };
  handledBy: (PrismaProfile & { user: User }) | null;
};

export function serializeGameSuggestion(suggestion: SuggestionWithRelations): GameSuggestion {
  return {
    id: suggestion.id,
    title: suggestion.title,
    description: suggestion.description ?? null,
    referenceUrl: suggestion.referenceUrl ?? null,
    status: STATUS_MAP[suggestion.status],
    adminNotes: suggestion.adminNotes ?? null,
    createdAt: suggestion.createdAt.toISOString(),
    updatedAt: suggestion.updatedAt.toISOString(),
    handledAt: suggestion.handledAt ? suggestion.handledAt.toISOString() : null,
    createdBy: {
      id: suggestion.createdBy.id,
      name: suggestion.createdBy.name,
      email: suggestion.createdBy.user.email,
    },
    handledBy: suggestion.handledBy
      ? {
          id: suggestion.handledBy.id,
          name: suggestion.handledBy.name,
          email: suggestion.handledBy.user.email,
        }
      : null,
  };
}
