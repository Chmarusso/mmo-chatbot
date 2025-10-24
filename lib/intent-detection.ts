import OpenAI from "openai";

let openai: OpenAI | null = null;

function getOpenAIClient() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export type UserIntent =
  | "find_similar_games"
  | "recommend_by_preference"
  | "compare_games"
  | "my_games"
  | "trending_games"
  | "game_info"
  | "category_browse"
  | "general_chat"
  | "off_topic";

export interface IntentResult {
  intent: UserIntent;
  confidence: number;
  reasoning: string;
  entities: {
    gameNames?: string[];
    categories?: string[];
    playstyles?: string[];
    keywords?: string[];
  };
}

const INTENT_SYSTEM_PROMPT = `You are an intent classifier for a gaming companion chat bot.

Your job is to analyze the user's message and determine:
1. What they want to do (their intent)
2. What entities they mentioned (game names, categories, playstyles)
3. How confident you are (0.0-1.0)

Available intents:
- find_similar_games: User wants games similar to a specific game they mentioned
- recommend_by_preference: User wants game recommendations based on their preferences/criteria
- compare_games: User wants to compare 2+ games
- my_games: User asks about their current game list/preferences
- trending_games: User wants to know what's popular/trending
- game_info: User wants detailed information about a specific game
- category_browse: User wants to browse games in a specific category
- general_chat: General conversation about gaming/MMOs (strategy, gameplay, builds, etc.)
- off_topic: NOT related to gaming, MMOs, or game research (e.g., politics, cooking, math, general knowledge)

Entity extraction:
- gameNames: Extract exact game titles mentioned (e.g., "World of Warcraft", "FFXIV")
- categories: Extract game categories (e.g., "MMORPG", "sandbox", "battle royale")
- playstyles: Extract playstyle preferences (e.g., "casual", "competitive", "PvP", "PvE")
- keywords: Extract other relevant keywords

Response format (JSON):
{
  "intent": "intent_name",
  "confidence": 0.95,
  "reasoning": "Brief 1-sentence explanation",
  "entities": {
    "gameNames": ["Game 1", "Game 2"],
    "categories": ["category1"],
    "playstyles": ["playstyle1"],
    "keywords": ["keyword1"]
  }
}

Examples:

User: "Games like World of Warcraft"
{
  "intent": "find_similar_games",
  "confidence": 0.95,
  "reasoning": "User explicitly wants games similar to WoW",
  "entities": {
    "gameNames": ["World of Warcraft"],
    "categories": ["MMORPG"],
    "keywords": ["similar"]
  }
}

User: "Recommend me a casual MMO for weekends"
{
  "intent": "recommend_by_preference",
  "confidence": 0.9,
  "reasoning": "User wants personalized recommendations with specific criteria",
  "entities": {
    "categories": ["MMO"],
    "playstyles": ["casual"],
    "keywords": ["weekends"]
  }
}

User: "Is WoW better than FFXIV?"
{
  "intent": "compare_games",
  "confidence": 0.95,
  "reasoning": "User directly comparing two games",
  "entities": {
    "gameNames": ["World of Warcraft", "Final Fantasy XIV"]
  }
}

User: "What games do I currently play?"
{
  "intent": "my_games",
  "confidence": 0.98,
  "reasoning": "User asking about their own game list",
  "entities": {}
}

User: "What's the best raid rotation for a holy paladin?"
{
  "intent": "general_chat",
  "confidence": 0.85,
  "reasoning": "Asking about game strategy, not finding/comparing games",
  "entities": {
    "keywords": ["raid", "holy paladin"]
  }
}

User: "What's the weather like today?"
{
  "intent": "off_topic",
  "confidence": 0.98,
  "reasoning": "Question about weather is not related to gaming or MMOs",
  "entities": {}
}

User: "How do I make chocolate cake?"
{
  "intent": "off_topic",
  "confidence": 0.99,
  "reasoning": "Cooking question has no relation to games or gaming",
  "entities": {}
}

User: "What is the capital of France?"
{
  "intent": "off_topic",
  "confidence": 0.95,
  "reasoning": "General knowledge question unrelated to gaming",
  "entities": {}
}

IMPORTANT: Be strict about off_topic classification. Only classify as general_chat if the message is actually about gaming, game strategy, gameplay mechanics, or MMO-related topics. Questions about non-gaming topics should always be classified as off_topic.`.trim();

/**
 * Classify user intent using AI
 */
export async function classifyIntent(message: string): Promise<IntentResult> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not set, using fallback intent detection");
    return detectIntentFallback(message);
  }

  try {
    const client = getOpenAIClient();
    if (!client) {
      console.warn("OpenAI client not available, using fallback intent detection");
      return detectIntentFallback(message);
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // Fast and cheap ($0.150/1M input tokens)
      messages: [
        {
          role: "system",
          content: INTENT_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.3, // Lower = more consistent
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from intent classifier");
    }

    const result = JSON.parse(content) as IntentResult;

    // Validate intent
    const validIntents: UserIntent[] = [
      "find_similar_games",
      "recommend_by_preference",
      "compare_games",
      "my_games",
      "trending_games",
      "game_info",
      "category_browse",
      "general_chat",
      "off_topic",
    ];

    if (!validIntents.includes(result.intent)) {
      console.warn(`Invalid intent detected: ${result.intent}, falling back to general_chat`);
      result.intent = "general_chat";
      result.confidence = 0.5;
    }

    return result;
  } catch (error) {
    console.error("Intent classification error:", error);

    // Fallback to regex-based detection
    return detectIntentFallback(message);
  }
}

/**
 * Fallback: Simple regex-based intent detection (backup if AI fails)
 */
export function detectIntentFallback(message: string): IntentResult {
  const lower = message.toLowerCase();

  // Pattern 1: Similar games
  if (/similar to|like|alternatives? to|games? like/i.test(message)) {
    return {
      intent: "find_similar_games",
      confidence: 0.7,
      reasoning: "Pattern match: similar/like/alternatives",
      entities: {},
    };
  }

  // Pattern 2: Recommendations
  if (/recommend|suggest|find me|looking for|want.*game/i.test(message)) {
    return {
      intent: "recommend_by_preference",
      confidence: 0.7,
      reasoning: "Pattern match: recommend/suggest/find",
      entities: {},
    };
  }

  // Pattern 3: Comparison
  if (/(vs|versus|compare|difference between|better than)/i.test(message)) {
    return {
      intent: "compare_games",
      confidence: 0.8,
      reasoning: "Pattern match: vs/compare/difference",
      entities: {},
    };
  }

  // Pattern 4: My games
  if (/my games?|what (do )?i play|games? i('m| am) playing/i.test(message)) {
    return {
      intent: "my_games",
      confidence: 0.9,
      reasoning: "Pattern match: my games/what I play",
      entities: {},
    };
  }

  // Pattern 5: Trending
  if (/popular|trending|hot|most played|everyone playing/i.test(message)) {
    return {
      intent: "trending_games",
      confidence: 0.8,
      reasoning: "Pattern match: popular/trending/hot",
      entities: {},
    };
  }

  // Default: General chat
  return {
    intent: "general_chat",
    confidence: 0.6,
    reasoning: "No specific pattern matched",
    entities: {},
  };
}
