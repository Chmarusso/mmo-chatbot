import { NextResponse } from "next/server";
import { streamText } from "ai";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { companionModel, defaultChatConfig } from "@/lib/ai-config";
import { companionTools } from "@/lib/ai-tools";
import type { GameSearchResult } from "@/lib/vector-search";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const MAX_HISTORY = 12;
const MAX_MESSAGE_LENGTH = 1000;

/**
 * Build system prompt with user context for AI SDK
 */
function buildSystemPrompt(profile: {
  id: string;
  name: string;
  gamePreferences: string[];
  playstyle: string | null;
  timeSlots: string[];
  language: string | null;
}): string {
  const userContext = `
CURRENT USER PROFILE:
- User ID: ${profile.id}
- Name: ${profile.name}
- Playstyle: ${profile.playstyle || "Not specified"}
- Typical Play Times: ${
    profile.timeSlots.length > 0 ? profile.timeSlots.join(", ") : "Not specified"
  }
- Language: ${profile.language || "Not specified"}
- Current Games: ${profile.gamePreferences.length > 0 ? profile.gamePreferences.join(", ") : "None added yet"}
`.trim();

  return `
You are the MMOPLAYA Companion, an upbeat MMO strategist who helps players discover games, plan squads, optimize builds, and schedule raids.

${userContext}

YOUR ROLE:
- Provide personalized recommendations based on the user's profile above
- Give concise, encouraging answers grounded in MMORPG knowledge
- Ask clarifying questions when needed
- Keep responses safe and friendly—no profanity, no personal data collection
- **IMPORTANT: Only answer questions related to gaming and MMORPGs.** If a user asks about something unrelated (politics, weather, general knowledge, etc.), politely decline and redirect them to gaming topics.

AVAILABLE TOOLS:
You have access to several tools to help users discover games:
- **searchGames**: Search for games using natural language queries (e.g., "MMORPG with sandbox elements", "casual PvE games")
- **findSimilarGames**: Find games similar to a specific title
- **getUserGames**: Get the user's current game list from their profile
- **getGameDetails**: Get detailed information about specific games

WHEN TO USE TOOLS:
- When users ask for game recommendations, use searchGames with a descriptive query
- When users mention a specific game and want similar ones, use findSimilarGames
- When users ask about "my games" or "what games do I play", use getUserGames
- When users want details about specific games, use getGameDetails
- You can call multiple tools in parallel if needed (e.g., search + get user games)

RESPONSE GUIDELINES:
- After calling tools, explain the results in a conversational way
- Highlight key features that match the user's preferences
- Mention similarity scores when relevant (e.g., "90% match")
- Keep responses concise (2-4 sentences) unless detailed comparison is requested
- If no games are found, suggest alternative searches or ask for more details

OFF-TOPIC HANDLING:
If a user asks about non-gaming topics, respond with something like:
"I'm the MMOPLAYA Companion, and I specialize in gaming and MMO-related questions! I can help you discover games, compare titles, get gameplay advice, or discuss MMO strategies. What would you like to know about gaming?"
`.trim();
}


function buildProfileSnapshot(profile: {
  gamePref: string | null;
  playstyle: string | null;
  timeSlot: string | null;
  timeSlots?: string[] | null;
  gamePreferences?: string[] | null;
}) {
  const timeSlots = Array.from(new Set(profile.timeSlots ?? []));
  const primaryTimeSlot = timeSlots[0] ?? profile.timeSlot ?? null;

  return {
    gamePref: profile.gamePref,
    playstyle: profile.playstyle,
    timeSlot: primaryTimeSlot,
    timeSlots,
    gamePreferences: profile.gamePreferences ?? [],
  };
}

export async function GET() {
  const profile = await getOrCreateProfile();

  if (!profile.inviteCode?.trim()) {
    return NextResponse.json(
      { error: "Invite code required to use the companion." },
      { status: 403 },
    );
  }

  const profileSnapshot = buildProfileSnapshot(profile);

  const conversation = await prisma.aiConversation.upsert({
    where: { profileId: profile.id },
    update: {},
    create: {
      profileId: profile.id,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (conversation.messages.length === 0) {
    return NextResponse.json({ messages: [], profile: profileSnapshot });
  }

  const messages = conversation.messages.map((message) => {
    // Extract game recommendations from toolResults if present
    let recommendedGames: GameSearchResult[] | undefined;

    if (message.toolResults) {
      try {
        const toolResults = message.toolResults as any[];
        // Look through all tool results for games
        for (const result of toolResults) {
          // AI SDK stores tool output in result.output, not result.result
          if (result?.output?.games && Array.isArray(result.output.games)) {
            recommendedGames = result.output.games;
            break; // Use first set of games found
          }
        }
      } catch (e) {
        console.warn('[AI-Chat] Failed to parse toolResults for message:', message.id);
      }
    }

    return {
      id: message.id,
      role: message.role.toLowerCase(),
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      ...(recommendedGames && { recommendedGames }),
      ...(message.intent && {
        intent: message.intent,
        intentConfidence: message.intentConfidence,
        intentEntities: message.intentEntities,
      }),
    };
  });

  return NextResponse.json({ messages, profile: profileSnapshot });
}

export async function POST(request: Request) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json(
      { error: "AI chat is not configured. Set OPENROUTER_API_KEY." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json().catch(() => null)) as
      | { messages?: Array<{ role: string; content: string }> }
      | null;

    const messages = body?.messages;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required." },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return NextResponse.json(
        { error: "Last message must be from user." },
        { status: 400 }
      );
    }

    if (lastMessage.content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` },
        { status: 400 },
      );
    }

    const profile = await getOrCreateProfile();

    if (!profile.inviteCode?.trim()) {
      return NextResponse.json(
        { error: "Invite code required to use the companion." },
        { status: 403 },
      );
    }

    // Ensure conversation exists
    const conversation = await prisma.aiConversation.upsert({
      where: { profileId: profile.id },
      update: {},
      create: {
        profileId: profile.id,
      },
    });

    // Build system prompt with user context
    const systemPrompt = buildSystemPrompt({
      id: profile.id,
      name: profile.name,
      gamePreferences: profile.gamePreferences ?? [],
      playstyle: profile.playstyle,
      timeSlots: profile.timeSlots ?? [],
      language: profile.language,
    });

    console.log(`[AI-Chat] Streaming response for user: ${profile.name}`);
    console.log(`[AI-Chat] Message count:`, messages.length);
    console.log(`[AI-Chat] Messages:`, JSON.stringify(messages.slice(-3), null, 2));

    // Stream response with AI SDK
    const result = streamText({
      model: companionModel,
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      tools: companionTools,
      temperature: defaultChatConfig.temperature,
      onFinish: async ({ text, toolCalls, toolResults, finishReason }) => {
        console.log(`[AI-Chat] Stream finished. Reason: ${finishReason}`);
        console.log(`[AI-Chat] Tool calls:`, toolCalls?.length || 0);
        console.log(`[AI-Chat] Response length:`, text.length);

        try {
          // Save user message to database
          await prisma.aiMessage.create({
            data: {
              conversationId: conversation.id,
              role: "USER",
              content: lastMessage.content,
            },
          });

          // Save assistant response to database with tool information
          await prisma.aiMessage.create({
            data: {
              conversationId: conversation.id,
              role: "ASSISTANT",
              content: text,
              // Store AI SDK tool calls and results
              toolCalls: toolCalls ? JSON.parse(JSON.stringify(toolCalls)) : undefined,
              toolResults: toolResults ? JSON.parse(JSON.stringify(toolResults)) : undefined,
            },
          });

          console.log(`[AI-Chat] Messages saved to database`);
        } catch (saveError) {
          console.error("[AI-Chat] Failed to save messages:", saveError);
        }
      },
    });

    // Return UI message stream response (supports tool calls and results)
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("AI companion error:", error);
    if (error && typeof error === 'object') {
      console.error("Error details:", JSON.stringify(error, null, 2));
    }
    const messageText =
      error instanceof Error ? error.message : "Failed to contact AI companion.";
    return NextResponse.json({ error: messageText }, { status: 502 });
  }
}
