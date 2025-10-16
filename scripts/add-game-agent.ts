import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

interface RawgGame {
  id: number;
  name: string;
  description_raw?: string;
  background_image?: string;
  website?: string;
  genres?: Array<{ id: number; name: string; slug: string }>;
  platforms?: Array<{ platform: { id: number; name: string } }>;
  metacritic?: number;
  released?: string;
  short_screenshots?: Array<{ id: number; image: string }>;
}

interface GameData {
  title: string;
  description: string;
  screenshot: string;
  website: string;
  categorySlug?: string;
}

/**
 * Search RAWG.io for game information
 */
async function searchRawg(gameTitle: string): Promise<RawgGame | null> {
  if (!RAWG_API_KEY) {
    throw new Error("RAWG_API_KEY environment variable is required");
  }

  const searchUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(gameTitle)}&page_size=1`;

  try {
    const response = await fetch(searchUrl);
    if (!response.ok) {
      console.error(`RAWG API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      console.log(`No results found for "${gameTitle}"`);
      return null;
    }

    return data.results[0];
  } catch (error) {
    console.error("Error fetching from RAWG:", error);
    return null;
  }
}

/**
 * Use AI to analyze game data and suggest category
 */
async function analyzeGameWithAI(
  gameData: RawgGame,
  availableCategories: Array<{ value: string; label: string }>
): Promise<{ description: string; categorySlug: string | null }> {
  if (!OPENROUTER_KEY) {
    // Fallback if no AI available
    return {
      description: gameData.description_raw?.slice(0, 480) || "No description available",
      categorySlug: mapGenreToCategory(gameData.genres?.[0]?.slug, availableCategories),
    };
  }

  const categoriesList = availableCategories
    .map((cat) => `- ${cat.value}: ${cat.label}`)
    .join("\n");

  const prompt = `Analyze this game and provide:
1. A concise, engaging description (max 480 characters) highlighting what makes it interesting for players
2. The most appropriate category from the list below

Game: ${gameData.name}
Description: ${gameData.description_raw?.slice(0, 1000) || "N/A"}
Genres: ${gameData.genres?.map((g) => g.name).join(", ") || "N/A"}
Platforms: ${gameData.platforms?.map((p) => p.platform.name).join(", ") || "N/A"}
Release Date: ${gameData.released || "N/A"}
Metacritic Score: ${gameData.metacritic || "N/A"}

Available categories:
${categoriesList}

Respond in JSON format:
{
  "description": "Your engaging description here",
  "categorySlug": "category_value_here or null if none fit"
}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": APP_URL,
        "X-Title": "MMOPLAYA Game Agent",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-haiku",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("No response from AI");
    }

    // Extract JSON from response (might be wrapped in markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      description: parsed.description?.slice(0, 480) || gameData.description_raw?.slice(0, 480) || "No description available",
      categorySlug: parsed.categorySlug || null,
    };
  } catch (error) {
    console.error("AI analysis failed, using fallback:", error);
    return {
      description: gameData.description_raw?.slice(0, 480) || "No description available",
      categorySlug: mapGenreToCategory(gameData.genres?.[0]?.slug, availableCategories),
    };
  }
}

/**
 * Simple genre to category mapping fallback
 */
function mapGenreToCategory(
  genreSlug: string | undefined,
  availableCategories: Array<{ value: string; label: string }>
): string | null {
  if (!genreSlug) return null;

  const mapping: Record<string, string> = {
    massively_multiplayer: "mmorpg",
    mmo: "mmorpg",
    rpg: "action_rpg",
    action: "action_rpg",
    survival: "survival",
    shooter: "fps",
    strategy: "strategy",
    racing: "racing",
  };

  const mapped = mapping[genreSlug];
  if (mapped && availableCategories.some((cat) => cat.value === mapped)) {
    return mapped;
  }

  return null;
}

/**
 * Create a slug from game title
 */
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

/**
 * Add game to database
 */
async function addGameToDatabase(gameData: GameData): Promise<void> {
  const slug = createSlug(gameData.title);

  // Check if category exists
  let categoryId: string | undefined;
  if (gameData.categorySlug) {
    const category = await prisma.gameCategory.findUnique({
      where: { value: gameData.categorySlug },
    });
    categoryId = category?.id;
  }

  // Check if game already exists
  const existing = await prisma.game.findUnique({
    where: { value: slug },
  });

  if (existing) {
    console.log(`Game "${gameData.title}" already exists in database with slug: ${slug}`);
    console.log("Updating existing game...");

    await prisma.game.update({
      where: { value: slug },
      data: {
        label: gameData.title,
        description: gameData.description,
        screenshot: gameData.screenshot || null,
        website: gameData.website || null,
        categoryId: categoryId || null,
      },
    });

    console.log("✓ Game updated successfully!");
    return;
  }

  // Create new game
  await prisma.game.create({
    data: {
      value: slug,
      label: gameData.title,
      description: gameData.description,
      screenshot: gameData.screenshot || null,
      website: gameData.website || null,
      categoryId: categoryId || null,
    },
  });

  console.log(`✓ Game "${gameData.title}" added successfully with slug: ${slug}`);
}

/**
 * Main function
 */
async function main() {
  const [, , gameTitle] = process.argv;

  if (!gameTitle) {
    console.log("Usage: pnpm add-game <game title>");
    console.log("\nExample: pnpm add-game 'World of Warcraft'");
    console.log("\nRequired environment variables:");
    console.log("  RAWG_API_KEY - Get from https://rawg.io/apidocs");
    console.log("  OPENROUTER_API_KEY (optional) - For AI-enhanced descriptions");
    process.exit(1);
  }

  console.log(`\n🔍 Searching for game: "${gameTitle}"\n`);

  // Step 1: Search RAWG
  const rawgGame = await searchRawg(gameTitle);
  if (!rawgGame) {
    console.error("❌ Could not find game on RAWG.io");
    process.exit(1);
  }

  console.log(`✓ Found: ${rawgGame.name}`);
  console.log(`  Genres: ${rawgGame.genres?.map((g) => g.name).join(", ") || "N/A"}`);
  console.log(`  Released: ${rawgGame.released || "N/A"}`);
  console.log(`  Metacritic: ${rawgGame.metacritic || "N/A"}\n`);

  // Step 2: Get available categories
  const categories = await prisma.gameCategory.findMany({
    select: { value: true, label: true },
  });

  console.log("📊 Analyzing game with AI...\n");

  // Step 3: Analyze with AI
  const analysis = await analyzeGameWithAI(rawgGame, categories);

  // Step 4: Prepare game data
  const gameData: GameData = {
    title: rawgGame.name,
    description: analysis.description,
    screenshot: rawgGame.background_image || rawgGame.short_screenshots?.[0]?.image || "",
    website: rawgGame.website || `https://rawg.io/games/${rawgGame.id}`,
    categorySlug: analysis.categorySlug || undefined,
  };

  console.log("📝 Game data prepared:");
  console.log(`  Title: ${gameData.title}`);
  console.log(`  Description: ${gameData.description.slice(0, 100)}...`);
  console.log(`  Category: ${gameData.categorySlug || "None"}`);
  console.log(`  Screenshot: ${gameData.screenshot ? "Yes" : "No"}`);
  console.log(`  Website: ${gameData.website}\n`);

  // Step 5: Add to database
  console.log("💾 Adding to database...\n");
  await addGameToDatabase(gameData);

  console.log("\n✨ Done!");
}

main()
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
