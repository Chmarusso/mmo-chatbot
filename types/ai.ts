export type AiMessageRole = "user" | "assistant";

export interface GameRecommendation {
  value: string;
  label: string;
  description: string | null;
  screenshot: string | null;
  website: string | null;
  category: {
    value: string;
    label: string;
  } | null;
  similarity?: number;
}

export interface AiMessage {
  id: string;
  role: AiMessageRole;
  content: string;
  createdAt: string;
  // Client-only flag to show a thinking indicator while waiting for model reply
  isThinking?: boolean;
  // Optional game recommendations to display as cards
  recommendedGames?: GameRecommendation[];
  // Intent detection fields (only for user messages)
  intent?: string;
  intentConfidence?: number;
  intentEntities?: {
    gameNames?: string[];
    categories?: string[];
    playstyles?: string[];
    keywords?: string[];
  };
}

export interface AiCompanionProfileSnapshot {
  gamePref: string | null;
  playstyle: string | null;
  timeSlot: string | null;
  timeSlots: string[];
  gamePreferences: string[];
}
