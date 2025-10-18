export type GameUpdateSuggestionStatus = "pending" | "accepted" | "rejected";

export interface GameUpdateSuggestion {
  id: string;
  gameValue: string;
  gameLabel: string;
  payload: Record<string, unknown>;
  comment: string | null;
  status: GameUpdateSuggestionStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  handledAt: string | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  handledBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
}
