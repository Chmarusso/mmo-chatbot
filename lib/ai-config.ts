import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// Use official OpenRouter provider for AI SDK
export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  headers: {
    "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
    "X-Title": "MMO Match Companion",
  },
});

// Get the configured model or default to Claude 3.5 Haiku
const modelId = process.env.COMPANION_MODEL || "anthropic/claude-3.5-haiku";

// Export the configured model instance for companion chat
export const companionModel = openrouter(modelId);

// Model configuration for embeddings (using OpenAI directly)
export const embeddingModel = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})("text-embedding-3-small");

// Default chat parameters
export const defaultChatConfig = {
  temperature: 0.7,
  maxTokens: 800,
} as const;
