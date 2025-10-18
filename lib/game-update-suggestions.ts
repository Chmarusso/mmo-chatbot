import { GameSuggestionStatus as PrismaStatus } from "@prisma/client";
import type { GameUpdateSuggestion as PrismaSuggestion, Profile as PrismaProfile, User, Game } from "@prisma/client";
import type { GameUpdateSuggestion, GameUpdateSuggestionStatus } from "@/types/game-update-suggestion";

const STATUS_MAP: Record<PrismaStatus, GameUpdateSuggestionStatus> = {
  [PrismaStatus.PENDING]: "pending",
  [PrismaStatus.ACCEPTED]: "accepted",
  [PrismaStatus.REJECTED]: "rejected",
};

type SuggestionWithRelations = PrismaSuggestion & {
  game: Game;
  createdBy: PrismaProfile & { user: User };
  handledBy: (PrismaProfile & { user: User }) | null;
};

export function serializeGameUpdateSuggestion(suggestion: SuggestionWithRelations): GameUpdateSuggestion {
  return {
    id: suggestion.id,
    gameValue: suggestion.gameValue,
    gameLabel: suggestion.game.label,
    payload: suggestion.payload as Record<string, unknown>,
    comment: suggestion.comment ?? null,
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
