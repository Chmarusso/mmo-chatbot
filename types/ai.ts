export type AiMessageRole = "user" | "assistant";

export interface AiMessage {
  id: string;
  role: AiMessageRole;
  content: string;
  createdAt: string;
  // Client-only flag to show a thinking indicator while waiting for model reply
  isThinking?: boolean;
}

export interface AiCompanionProfileSnapshot {
  gamePref: string | null;
  playstyle: string | null;
  timeSlot: string | null;
  timeSlots: string[];
  gamePreferences: string[];
}
