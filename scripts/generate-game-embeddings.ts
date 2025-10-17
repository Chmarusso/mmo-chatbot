import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensions, $0.02/1M tokens
const BATCH_SIZE = 100; // Process in batches to avoid rate limits

interface EmbeddingResult {
  gameValue: string;
  embedding: number[];
  success: boolean;
  error?: string;
}

/**
 * Generate text representation of a game for embedding
 */
function generateGameText(game: {
  label: string;
  description: string | null;
  category: { label: string } | null;
}): string {
  const parts = [
    `Title: ${game.label}`,
    game.category ? `Category: ${game.category.label}` : null,
    game.description ? `Description: ${game.description}` : null,
  ].filter(Boolean);

  return parts.join("\n");
}

/**
 * Generate embeddings for a batch of games
 */
async function generateEmbeddingsBatch(
  games: Array<{
    value: string;
    label: string;
    description: string | null;
    category: { label: string } | null;
  }>
): Promise<EmbeddingResult[]> {
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
  const games = await prisma.game.findMany({
    include: {
      category: true,
    },
    orderBy: {
      label: "asc",
    },
  });

  console.log(`📊 Found ${games.length} games to process\n`);

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
  }

  // Process in batches
  let processed = 0;
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < games.length; i += BATCH_SIZE) {
    const batch = games.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(games.length / BATCH_SIZE)}`);
    console.log(`   Games ${i + 1}-${Math.min(i + BATCH_SIZE, games.length)} of ${games.length}`);

    // Generate embeddings
    const results = await generateEmbeddingsBatch(batch);

    // Save to database
    await saveEmbeddings(results);

    // Update counters
    processed += batch.length;
    successful += results.filter((r) => r.success).length;
    failed += results.filter((r) => !r.success).length;

    console.log(`   Progress: ${processed}/${games.length} (${Math.round((processed / games.length) * 100)}%)`);

    // Rate limiting: wait between batches
    if (i + BATCH_SIZE < games.length) {
      console.log("   ⏳ Waiting 2 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 EMBEDDING GENERATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total games: ${games.length}`);
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
