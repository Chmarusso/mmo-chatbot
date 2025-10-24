import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { classifyIntent, type IntentResult } from "@/lib/intent-detection";
import { semanticGameSearch, type GameSearchResult } from "@/lib/vector-search";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const COMPANION_MODEL = process.env.COMPANION_MODEL ?? "anthropic/claude-3.5-haiku";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const MAX_HISTORY = 12;
const MAX_MESSAGE_LENGTH = 1000;

/**
 * Build enhanced system prompt with user context and relevant games
 */
function buildEnhancedSystemPrompt(
  profile: {
    name: string;
    gamePreferences: string[];
    playstyle: string | null;
    timeSlots: string[];
    language: string | null;
  },
  gameContext?: GameSearchResult[],
  recentUserMessages?: string[]
): string {
  const userContext = `
CURRENT USER PROFILE:
- Name: ${profile.name}
- Playstyle: ${profile.playstyle || "Not specified"}
- Typical Play Times: ${
    profile.timeSlots.length > 0 ? profile.timeSlots.join(", ") : "Not specified"
  }
- Language: ${profile.language || "Not specified"}
`.trim();

  const conversationContextSection =
    recentUserMessages && recentUserMessages.length > 0
      ? `

RECENT CONVERSATION HISTORY (User's last ${recentUserMessages.length} messages):
${recentUserMessages
  .map((msg, idx) => `${idx + 1}. "${msg}"`)
  .join("\n")}

Use this conversation history to understand the user's interests, preferences, and what they've been asking about.
Provide contextual recommendations based on their question trajectory.
`.trim()
      : "";

  const gameContextSection =
    gameContext && gameContext.length > 0
      ? `

RELEVANT GAMES FROM DATABASE:
${gameContext
  .map(
    (game, idx) => `
${idx + 1}. ${game.label}
   - Description: ${game.description?.substring(0, 200) || "No description"}...
   - Category: ${game.category?.label || "N/A"}
   - Similarity: ${(game.similarity * 100).toFixed(0)}%
   - Website: ${game.website || "N/A"}
`
  )
  .join("\n")}

When recommending games, reference these specific titles from our database.
Include the similarity score and key details to help users make informed decisions.
`.trim()
      : "";

  return `
You are the MMOPLAYA Companion, an upbeat MMO strategist who helps players discover games, plan squads, optimize builds, and schedule raids.

${userContext}
${conversationContextSection}
${gameContextSection}

YOUR ROLE:
- Provide personalized recommendations based on the user's profile above
- Use the conversation history to understand context and provide relevant follow-ups
- Reference games from the database when available (they are listed above if relevant to this conversation)
- Give concise, encouraging answers grounded in MMORPG knowledge
- Ask clarifying questions when needed
- Keep responses safe and friendly—no profanity, no personal data collection
- Don't answer questions that are not related to gaming or MMORPGs. Politely guide the user back to the topic of gaming/MMOs.

When discussing game recommendations:
- If database games are provided above, prioritize those in your recommendations
- Mention similarity scores to show how well they match
- Explain WHY a game matches their playstyle/preferences
- Consider the user's recent questions to provide contextual recommendations
- Keep responses focused and actionable
`.trim();
}

/**
 * Fetch relevant games based on user intent and conversation context
 */
async function fetchRelevantGames(
  intentResult: IntentResult,
  profile: {
    gamePreferences: string[];
    playstyle: string | null;
  }
): Promise<GameSearchResult[]> {
  // Skip if OpenAI is not configured (needed for embeddings)
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[AI-Chat] OPENAI_API_KEY not set, skipping game search");
    return [];
  }

  console.log(`[AI-Chat] fetchRelevantGames called with intent: ${intentResult.intent}`);
  console.log(`[AI-Chat] Intent entities:`, intentResult.entities);
  console.log(`[AI-Chat] User profile:`, {
    gamePreferences: profile.gamePreferences,
    playstyle: profile.playstyle,
  });

  try {
    switch (intentResult.intent) {
      case "find_similar_games": {
        // User mentioned a specific game, find similar ones
        const gameNames = intentResult.entities.gameNames || [];
        if (gameNames.length > 0) {
          console.log(`[AI-Chat] Finding games similar to: ${gameNames[0]}`);
          const results = await semanticGameSearch(gameNames[0], {
            limit: 5,
            minSimilarity: 0.6,
          });
          return results;
        }
        break;
      }

      case "recommend_by_preference": {
        // Build query from message entities only (don't use user's gamePreferences)
        const keywords = intentResult.entities.keywords || [];
        const playstyles = intentResult.entities.playstyles || [];
        const categories = intentResult.entities.categories || [];

        console.log(`[AI-Chat] recommend_by_preference - keywords:`, keywords);
        console.log(`[AI-Chat] recommend_by_preference - playstyles:`, playstyles);
        console.log(`[AI-Chat] recommend_by_preference - categories:`, categories);

        let query = "";

        // Add categories from message (blockchain, sci-fi, etc.)
        if (categories.length > 0) {
          query += categories.join(" ");
        }

        // Include user's playstyle if not overridden
        if (playstyles.length > 0) {
          query += " " + playstyles.join(" ");
        } else if (profile.playstyle) {
          query += " " + profile.playstyle;
        }

        // Add keywords from message (but filter out generic ones like "suggest", "recommend")
        const genericWords = ["suggest", "recommend", "find", "show", "give", "want"];
        const meaningfulKeywords = keywords.filter(
          k => !genericWords.includes(k.toLowerCase())
        );
        if (meaningfulKeywords.length > 0) {
          query += " " + meaningfulKeywords.join(" ");
        }

        // Note: We intentionally DON'T add user's gamePreferences to the query
        // This allows the chat to recommend games based purely on the user's question

        console.log(`[AI-Chat] Built search query: "${query.trim()}"`);

        if (query.trim()) {
          console.log(`[AI-Chat] Executing semanticGameSearch...`);
          const results = await semanticGameSearch(query.trim(), {
            limit: 5,
            minSimilarity: 0.3, // Lower threshold for broader recommendations
          });
          console.log(`[AI-Chat] semanticGameSearch returned ${results.length} results`);
          if (results.length > 0) {
            console.log(`[AI-Chat] Top results:`, results.slice(0, 3).map(g => `${g.label} (${(g.similarity * 100).toFixed(1)}%)`));
          }
          return results;
        } else {
          console.log(`[AI-Chat] Query is empty, skipping search`);
        }
        break;
      }

      case "my_games": {
        // Fetch user's current games from DB with full details
        if (profile.gamePreferences && profile.gamePreferences.length > 0) {
          console.log(
            `[AI-Chat] Fetching user's games: ${profile.gamePreferences.join(", ")}`
          );
          const games = await prisma.game.findMany({
            where: {
              value: { in: profile.gamePreferences },
            },
            include: {
              category: true,
            },
          });

          return games.map((g) => ({
            value: g.value,
            label: g.label,
            description: g.description,
            screenshot: g.screenshot,
            website: g.website,
            category: g.category
              ? {
                  value: g.category.value,
                  label: g.category.label,
                }
              : null,
            similarity: 1.0, // Perfect match since these are their games
          }));
        }
        break;
      }

      case "trending_games":
      case "category_browse": {
        // Use categories or keywords for search
        const categories = intentResult.entities.categories || [];
        const keywords = intentResult.entities.keywords || [];

        console.log(`[AI-Chat] category_browse - categories:`, categories);
        console.log(`[AI-Chat] category_browse - keywords:`, keywords);

        const searchQuery = [...categories, ...keywords].join(" ");

        if (searchQuery.trim()) {
          console.log(`[AI-Chat] Executing category browse with query: "${searchQuery.trim()}"`);
          const results = await semanticGameSearch(searchQuery.trim(), {
            limit: 8,
            minSimilarity: 0.3, // Lower threshold for category browsing (30%)
          });
          console.log(`[AI-Chat] Category browse returned ${results.length} results`);
          if (results.length > 0) {
            console.log(`[AI-Chat] Top 5 results:`, results.slice(0, 5).map(g => `${g.label} (${(g.similarity * 100).toFixed(1)}%)`));
          } else {
            console.log(`[AI-Chat] No results found with threshold 0.3`);
          }
          return results;
        } else {
          console.log(`[AI-Chat] Empty search query for category_browse`);
        }
        break;
      }

      case "game_info": {
        // Fetch specific game details
        const gameNames = intentResult.entities.gameNames || [];
        if (gameNames.length > 0) {
          console.log(`[AI-Chat] Fetching game info for: ${gameNames.join(", ")}`);
          const games = await prisma.game.findMany({
            where: {
              OR: [
                { value: { in: gameNames } },
                { label: { in: gameNames, mode: "insensitive" } },
              ],
            },
            include: {
              category: true,
            },
            take: 3,
          });

          return games.map((g) => ({
            value: g.value,
            label: g.label,
            description: g.description,
            screenshot: g.screenshot,
            website: g.website,
            category: g.category
              ? {
                  value: g.category.value,
                  label: g.category.label,
                }
              : null,
            similarity: 1.0,
          }));
        }
        break;
      }

      case "compare_games": {
        // Fetch the games being compared
        const gameNames = intentResult.entities.gameNames || [];
        if (gameNames.length >= 2) {
          console.log(`[AI-Chat] Comparing games: ${gameNames.join(" vs ")}`);
          const games = await prisma.game.findMany({
            where: {
              label: { in: gameNames, mode: "insensitive" },
            },
            include: {
              category: true,
            },
          });

          return games.map((g) => ({
            value: g.value,
            label: g.label,
            description: g.description,
            screenshot: g.screenshot,
            website: g.website,
            category: g.category
              ? {
                  value: g.category.value,
                  label: g.category.label,
                }
              : null,
            similarity: 1.0,
          }));
        }
        break;
      }

      default:
        console.log(`[AI-Chat] No game search handler for intent: ${intentResult.intent}`);
        return [];
    }

    console.log(`[AI-Chat] No games found - falling through all cases`);
    return [];
  } catch (error) {
    console.error("[AI-Chat] Error fetching relevant games:", error);
    return [];
  }
}

function mapRoleToApi(role: "USER" | "ASSISTANT") {
  return role === "USER" ? "user" : "assistant";
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

  const conversation = await prisma.aiConversation.findUnique({
    where: { profileId: profile.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) {
    await prisma.aiConversation.create({
      data: {
        profileId: profile.id,
      },
    });

    return NextResponse.json({ messages: [], profile: profileSnapshot });
  }

  const messages = conversation.messages.map((message) => ({
    id: message.id,
    role: message.role.toLowerCase(),
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    ...(message.intent && {
      intent: message.intent,
      intentConfidence: message.intentConfidence,
      intentEntities: message.intentEntities,
    }),
  }));

  return NextResponse.json({ messages, profile: profileSnapshot });
}

export async function POST(request: Request) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json(
      { error: "AI chat is not configured. Set OPENROUTER_API_KEY." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { message?: string }
    | null;

  const message = body?.message?.trim();

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
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

  const conversation = await prisma.aiConversation.upsert({
    where: { profileId: profile.id },
    update: {},
    create: {
      profileId: profile.id,
    },
  });

  let userMessageRecord: { id: string; createdAt: Date; content: string } | null = null;

  try {
    // 1. Detect intent for user message
    const intentResult = await classifyIntent(message);

    console.log(
      `[AI-Chat] Intent detected: ${intentResult.intent} (confidence: ${intentResult.confidence})`
    );

    // 2. Check if message is off-topic and reject it
    if (intentResult.intent === "off_topic") {
      const offTopicMessage = "I'm the MMOPLAYA Companion, and I specialize in helping with gaming and MMO-related questions! I can help you discover games, compare titles, get gameplay advice, or discuss MMO strategies. What would you like to know about gaming?";

      // Save user message
      userMessageRecord = await prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: "USER",
          content: message,
          intent: intentResult.intent,
          intentConfidence: intentResult.confidence,
          intentEntities: intentResult.entities,
        },
      });

      // Save assistant rejection message
      const assistantMessage = await prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: offTopicMessage,
        },
      });

      return NextResponse.json({
        messages: [
          {
            id: userMessageRecord.id,
            role: "user",
            content: message,
            createdAt: userMessageRecord.createdAt.toISOString(),
            intent: intentResult.intent,
            intentConfidence: intentResult.confidence,
            intentEntities: intentResult.entities,
          },
          {
            id: assistantMessage.id,
            role: "assistant",
            content: offTopicMessage,
            createdAt: assistantMessage.createdAt.toISOString(),
          },
        ],
        profile: buildProfileSnapshot(profile),
      });
    }

    // 3. Fetch relevant games based on intent
    const relevantGames = await fetchRelevantGames(intentResult, {
      gamePreferences: profile.gamePreferences ?? [],
      playstyle: profile.playstyle,
    });

    if (relevantGames.length > 0) {
      console.log(
        `[AI-Chat] Found ${relevantGames.length} relevant games:`,
        relevantGames.map((g) => g.label).join(", ")
      );
    }

    // 4. Save user message with intent
    userMessageRecord = await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: message,
        intent: intentResult.intent,
        intentConfidence: intentResult.confidence,
        intentEntities: intentResult.entities,
      },
    });

    const totalMessages = await prisma.aiMessage.count({
      where: { conversationId: conversation.id },
    });

    const skip = Math.max(0, totalMessages - MAX_HISTORY * 2);

    const history = await prisma.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      skip,
      take: MAX_HISTORY * 2,
    });

    const chatHistory = history.map((entry) => ({
      role: mapRoleToApi(entry.role),
      content: entry.content,
    }));

    // 5. Extract recent user messages for context (last 10)
    const recentUserMessages = history
      .filter((entry) => entry.role === "USER")
      .slice(-10)
      .map((entry) => entry.content);

    console.log(
      `[AI-Chat] Including ${recentUserMessages.length} recent user messages in context`
    );

    // 6. Build enhanced system prompt with user context, games, and conversation history
    const enhancedSystemPrompt = buildEnhancedSystemPrompt(
      {
        name: profile.name,
        gamePreferences: profile.gamePreferences ?? [],
        playstyle: profile.playstyle,
        timeSlots: profile.timeSlots ?? [],
        language: profile.language,
      },
      relevantGames,
      recentUserMessages
    );

    // 7. Call LLM with enhanced context
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": APP_URL,
        "X-Title": "MMOPLAYA Companion",
      },
      body: JSON.stringify({
        model: COMPANION_MODEL,
        messages: [
          {
            role: "system",
            content: enhancedSystemPrompt,
          },
          ...chatHistory,
        ],
        temperature: 0.7,
        max_tokens: 800, // Increased for richer responses with game details
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter error: ${errorText}`);
    }

    const data = await response.json();
    const assistantContent =
      (data?.choices?.[0]?.message?.content as string | undefined)?.trim();

    if (!assistantContent) {
      throw new Error("No response from AI companion.");
    }

    const assistantMessage = await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: assistantContent,
      },
    });

    // Fetch the complete user message with intent data
    const completeUserMessage = await prisma.aiMessage.findUnique({
      where: { id: userMessageRecord.id },
    });

    return NextResponse.json({
      messages: [
        {
          id: userMessageRecord.id,
          role: "user",
          content: message,
          createdAt: userMessageRecord.createdAt.toISOString(),
          ...(completeUserMessage?.intent && {
            intent: completeUserMessage.intent,
            intentConfidence: completeUserMessage.intentConfidence,
            intentEntities: completeUserMessage.intentEntities,
          }),
        },
        {
          id: assistantMessage.id,
          role: "assistant",
          content: assistantContent,
          createdAt: assistantMessage.createdAt.toISOString(),
        },
      ],
      profile: buildProfileSnapshot(profile),
      relevantGames, // Include game context for frontend rendering
    });
  } catch (error) {
    if (userMessageRecord) {
      await prisma.aiMessage
        .delete({ where: { id: userMessageRecord.id } })
        .catch(() => {});
    }

    console.error("AI companion error:", error);
    const messageText =
      error instanceof Error ? error.message : "Failed to contact AI companion.";
    return NextResponse.json({ error: messageText }, { status: 502 });
  }
}
