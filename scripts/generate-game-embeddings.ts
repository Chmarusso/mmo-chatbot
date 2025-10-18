import { PrismaClient, Prisma } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensions, $0.02/1M tokens
const BATCH_SIZE = 100; // Process in batches to avoid rate limits

interface GameForEmbedding {
  value: string;
  label: string;
  description: string | null;
  summary: string | null;
  featureSummary: string | null;
  genreTags: string[];
  platformTags: string[];
  gameplayTags: string[];
  worldTags: string[];
  visualStyleTags: string[];
  monetization: string | null;
  idealFor: string | null;
  systemRequirements: Prisma.JsonValue | null;
  ragProfile: Prisma.JsonValue | null;
  sourceUrls: Prisma.JsonValue | null;
  category: { label: string } | null;
  embeddingGeneratedAt: Date | null;
}

interface EmbeddingResult {
  gameValue: string;
  embedding: number[];
  success: boolean;
  error?: string;
}

/**
 * Generate text representation of a game for embedding
 */
function generateGameText(game: GameForEmbedding): string {
  const parts: string[] = [`Title: ${game.label}`];

  if (game.category) {
    parts.push(`Category: ${game.category.label}`);
  }

  if (game.summary) {
    parts.push(`Summary: ${game.summary}`);
  } else if (game.description) {
    parts.push(`Summary: ${game.description}`);
  }

  if (game.featureSummary) {
    parts.push(`Highlights: ${game.featureSummary}`);
  }

  const appendTags = (label: string, values: string[]) => {
    if (Array.isArray(values) && values.length > 0) {
      parts.push(`${label}: ${values.join(", ")}`);
    }
  };

  appendTags("Genres", game.genreTags);
  appendTags("Platforms", game.platformTags);
  appendTags("Gameplay", game.gameplayTags);
  appendTags("World", game.worldTags);
  appendTags("Visual Style", game.visualStyleTags);

  if (game.monetization) {
    parts.push(`Monetization: ${game.monetization}`);
  }

  if (game.idealFor) {
    parts.push(`Ideal For: ${game.idealFor}`);
  }

  if (game.systemRequirements && typeof game.systemRequirements === "object") {
    try {
      const sys = game.systemRequirements as Record<string, unknown>;
      const min = sys.minimum as Record<string, unknown> | undefined;
      const rec = sys.recommended as Record<string, unknown> | undefined;
      const notes = typeof sys.additionalNotes === "string" ? sys.additionalNotes : undefined;
      if (min) {
        parts.push(
          `Minimum Specs: CPU ${min.cpu ?? "?"}, GPU ${min.gpu ?? "?"}, RAM ${min.ram ?? "?"}, Storage ${min.storage ?? "?"}`
        );
      }
      if (rec) {
        parts.push(
          `Recommended Specs: CPU ${rec.cpu ?? "?"}, GPU ${rec.gpu ?? "?"}, RAM ${rec.ram ?? "?"}, Storage ${rec.storage ?? "?"}`
        );
      }
      if (notes) {
        parts.push(`Performance Notes: ${notes}`);
      }
    } catch {
      // ignore malformed system requirement data
    }
  }

  if (game.ragProfile && typeof game.ragProfile === "object") {
    try {
      const profile = game.ragProfile as Record<string, unknown>;
      if (profile.coreLoop) {
        parts.push(`Core Loop: ${profile.coreLoop}`);
      }
      if (Array.isArray(profile.gameplayPillars) && profile.gameplayPillars.length > 0) {
        parts.push(`Gameplay Pillars: ${(profile.gameplayPillars as unknown[]).map(String).join(", ")}`);
      }
      if (profile.progression) {
        parts.push(`Progression: ${profile.progression}`);
      }
      if (profile.pveFocus) {
        parts.push(`PvE Focus: ${profile.pveFocus}`);
      }
      if (profile.pvpFocus) {
        parts.push(`PvP Focus: ${profile.pvpFocus}`);
      }
      if (profile.groupTypes) {
        parts.push(`Group Types: ${profile.groupTypes}`);
      }
      if (profile.sessionPace) {
        parts.push(`Session Pace: ${profile.sessionPace}`);
      }
      if (profile.difficulty) {
        parts.push(`Difficulty: ${profile.difficulty}`);
      }
      if (Array.isArray(profile.socialFeatures) && profile.socialFeatures.length > 0) {
        parts.push(`Social Features: ${(profile.socialFeatures as unknown[]).map(String).join(", ")}`);
      }
      if (profile.interfaceStyle) {
        parts.push(`Interface: ${profile.interfaceStyle}`);
      }
      if (profile.worldStructure) {
        parts.push(`World Structure: ${profile.worldStructure}`);
      }
      if (Array.isArray(profile.notableMechanics) && profile.notableMechanics.length > 0) {
        parts.push(`Notable Mechanics: ${(profile.notableMechanics as unknown[]).map(String).join(", ")}`);
      }
      if (Array.isArray(profile.extraInsights) && profile.extraInsights.length > 0) {
        parts.push(`Community Notes: ${(profile.extraInsights as unknown[]).map(String).join(", ")}`);
      }
    } catch {
      // ignore malformed rag profile data
    }
  }

  if (Array.isArray(game.sourceUrls) && game.sourceUrls.length > 0) {
    const urls = (game.sourceUrls as unknown[]).map((url) => String(url));
    parts.push(`Sources: ${urls.slice(0, 5).join(", ")}`);
  }

  if (game.description && !game.summary) {
    parts.push(`Legacy Description: ${game.description}`);
  }

  return parts.join("\n");
}

/**
 * Generate embeddings for a batch of games
 */
async function generateEmbeddingsBatch(games: GameForEmbedding[]): Promise<EmbeddingResult[]> {
  try {
    // Prepare texts
    const texts = games.map(generateGameText);

    // Call OpenAI API
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      encoding_format: "float",
    });

    // Map results back to games
    return games.map((game, index) => ({
      gameValue: game.value,
      embedding: response.data[index].embedding,
      success: true,
    }));
  } catch (error) {
    console.error("Batch embedding error:", error);
    // Return error for all games in batch
    return games.map((game) => ({
      gameValue: game.value,
      embedding: [],
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

/**
 * Save embeddings to database
 */
async function saveEmbeddings(results: EmbeddingResult[]) {
  for (const result of results) {
    if (!result.success) {
      console.warn(`⚠️  Failed to generate embedding for ${result.gameValue}`);
      continue;
    }

    try {
      // Use raw SQL because Prisma doesn't support vector type directly
      await prisma.$executeRaw`
        UPDATE "Game"
        SET
          embedding = ${JSON.stringify(result.embedding)}::vector,
          "embeddingModel" = ${EMBEDDING_MODEL},
          "embeddingGeneratedAt" = NOW()
        WHERE value = ${result.gameValue}
      `;
      console.log(`✓ Saved embedding for ${result.gameValue}`);
    } catch (error) {
      console.error(`✗ Failed to save embedding for ${result.gameValue}:`, error);
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log("🚀 Starting game embedding generation...\n");

  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY environment variable is not set");
    console.log("   Please set it in your .env file");
    process.exit(1);
  }

  // Fetch all games
  const games = (await prisma.game.findMany({
    include: {
      category: true,
    },
    orderBy: {
      label: "asc",
    },
  })) as GameForEmbedding[];

  console.log(`📊 Loaded ${games.length} games from database\n`);

  if (games.length === 0) {
    console.log("✓ No games found. Add games first using the add-game script.");
    return;
  }

  // Check for existing embeddings
  const gamesWithEmbeddings = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM "Game"
    WHERE embedding IS NOT NULL
  `;
  const existingCount = Number(gamesWithEmbeddings[0].count);

  let regenerateAll = false;

  if (existingCount > 0) {
    console.log(`⚠️  ${existingCount} games already have embeddings`);
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question("Regenerate all embeddings? (yes/no): ", resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== "yes") {
      console.log("Aborting...");
      process.exit(0);
    }
    regenerateAll = true;
  }

  const gamesWithGenreTags = games.filter((game) => Array.isArray(game.genreTags) && game.genreTags.length > 0);
  const skippedForMissingTags = games.length - gamesWithGenreTags.length;

  if (skippedForMissingTags > 0) {
    console.log(`ℹ️  Skipping ${skippedForMissingTags} games without genre tags.`);
  }

  const gamesToProcess = gamesWithGenreTags.filter((game) => regenerateAll || !game.embeddingGeneratedAt);

  if (gamesToProcess.length === 0) {
    console.log("✓ No games require embedding generation right now.");
    return;
  }

  console.log(`📊 Processing ${gamesToProcess.length} games for embeddings\n`);

  // Process in batches
  let processed = 0;
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < gamesToProcess.length; i += BATCH_SIZE) {
    const batch = gamesToProcess.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(gamesToProcess.length / BATCH_SIZE)}`);
    console.log(`   Games ${i + 1}-${Math.min(i + BATCH_SIZE, gamesToProcess.length)} of ${gamesToProcess.length}`);

    // Generate embeddings
    const results = await generateEmbeddingsBatch(batch);

    // Save to database
    await saveEmbeddings(results);

    // Update counters
    processed += batch.length;
    successful += results.filter((r) => r.success).length;
    failed += results.filter((r) => !r.success).length;

    console.log(`   Progress: ${processed}/${gamesToProcess.length} (${Math.round((processed / gamesToProcess.length) * 100)}%)`);

    // Rate limiting: wait between batches
    if (i + BATCH_SIZE < gamesToProcess.length) {
      console.log("   ⏳ Waiting 2 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 EMBEDDING GENERATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total games processed: ${gamesToProcess.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log("=".repeat(60));

  // Estimate cost
  const avgTokensPerGame = 150; // Rough estimate
  const totalTokens = successful * avgTokensPerGame;
  const costPer1M = 0.02; // text-embedding-3-small pricing
  const estimatedCost = (totalTokens / 1_000_000) * costPer1M;

  console.log(`\n💰 Estimated cost: $${estimatedCost.toFixed(4)}`);
  console.log(`   (${totalTokens.toLocaleString()} tokens @ $${costPer1M}/1M)\n`);
}

main()
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
