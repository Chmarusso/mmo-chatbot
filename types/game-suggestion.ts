export type GameSuggestionStatus = "pending" | "accepted" | "rejected";

export interface GameSuggestion {
  id: string;
  title: string;
  description: string | null;
  referenceUrl: string | null;
  status: GameSuggestionStatus;
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
