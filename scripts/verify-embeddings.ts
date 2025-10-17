import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Verifying game embeddings...\n");

  // Count total games
  const totalGames = await prisma.game.count();

  // Count games with embeddings
  const gamesWithEmbeddings = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM "Game"
    WHERE embedding IS NOT NULL
  `;
  const withEmbeddings = Number(gamesWithEmbeddings[0].count);

  // Check embedding dimensions
  const sampleGame = await prisma.$queryRaw<
    Array<{ label: string; dimensions: number; model: string | null }>
  >`
    SELECT
      label,
      array_length(embedding, 1) as dimensions,
      "embeddingModel" as model
    FROM "Game"
    WHERE embedding IS NOT NULL
    LIMIT 1
  `;

  // Get games without embeddings using raw query
  const gamesWithoutEmbeddings = await prisma.$queryRaw<
    Array<{ value: string; label: string }>
  >`
    SELECT value, label
    FROM "Game"
    WHERE embedding IS NULL
    LIMIT 10
  `;

  console.log("📊 Embedding Statistics:");
  console.log("=".repeat(60));
  console.log(`Total games: ${totalGames}`);
  console.log(`Games with embeddings: ${withEmbeddings}`);
  console.log(`Games without embeddings: ${totalGames - withEmbeddings}`);
  console.log(`Coverage: ${((withEmbeddings / totalGames) * 100).toFixed(1)}%`);

  if (sampleGame.length > 0) {
    console.log(`\nEmbedding details:`);
    console.log(`  Dimensions: ${sampleGame[0].dimensions}`);
    console.log(`  Model: ${sampleGame[0].model || "Unknown"}`);
    console.log(`  Sample game: ${sampleGame[0].label}`);
  }
  console.log("=".repeat(60));

  if (gamesWithoutEmbeddings.length > 0) {
    console.log("\n⚠️  Games missing embeddings:");
    gamesWithoutEmbeddings.forEach((game, i) => {
      console.log(`  ${i + 1}. ${game.label} (${game.value})`);
    });
    if (totalGames - withEmbeddings > 10) {
      console.log(`  ... and ${totalGames - withEmbeddings - 10} more`);
    }
    console.log("\n  Run: pnpm embeddings:generate");
  } else {
    console.log("\n✅ All games have embeddings!");
  }

  // Test a sample query
  if (withEmbeddings > 0) {
    console.log("\n🧪 Testing similarity search...");
    const testResults = await prisma.$queryRaw<
      Array<{ label: string; similarity: number }>
    >`
      SELECT
        g1.label,
        1 - (g1.embedding <=> g2.embedding) as similarity
      FROM "Game" g1, "Game" g2
      WHERE g1.embedding IS NOT NULL
        AND g2.embedding IS NOT NULL
        AND g1.value != g2.value
        AND g2.label = 'World of Warcraft'
      ORDER BY g1.embedding <=> g2.embedding
      LIMIT 3
    `;

    if (testResults.length > 0) {
      console.log("  Games similar to 'World of Warcraft':");
      testResults.forEach((r, i) => {
        console.log(`    ${i + 1}. ${r.label} (${(r.similarity * 100).toFixed(1)}% similar)`);
      });
    }
  }
}

main()
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
