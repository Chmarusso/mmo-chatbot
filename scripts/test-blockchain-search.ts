import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = "text-embedding-3-small";

async function testBlockchainSearch() {
  console.log("🔍 Testing blockchain semantic search...\n");

  // Test query
  const query = "blockchain";

  console.log(`Query: "${query}"\n`);

  // Generate embedding for query
  console.log("Generating query embedding...");
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: query,
    encoding_format: "float",
  });

  const queryEmbedding = response.data[0].embedding;
  console.log(`✓ Query embedding generated (${queryEmbedding.length} dimensions)\n`);

  // Search database
  console.log("Searching database...\n");

  const results = await prisma.$queryRaw<
    Array<{
      value: string;
      label: string;
      description: string | null;
      category_label: string | null;
      similarity: number;
    }>
  >`
    SELECT
      g.value,
      g.label,
      g.description,
      c.label as category_label,
      1 - (g.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
    FROM "Game" g
    LEFT JOIN "GameCategory" c ON g."categoryId" = c.id
    WHERE g.embedding IS NOT NULL
    ORDER BY g.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT 20
  `;

  console.log("TOP 20 RESULTS:");
  console.log("=".repeat(80));
  results.forEach((r, idx) => {
    const sim = (r.similarity * 100).toFixed(1);
    console.log(`${idx + 1}. ${r.label}`);
    console.log(`   Category: ${r.category_label || "N/A"}`);
    console.log(`   Similarity: ${sim}%`);
    console.log(`   Description: ${r.description?.substring(0, 100)}...`);
    console.log("");
  });

  // Show blockchain games specifically
  console.log("\n" + "=".repeat(80));
  console.log("BLOCKCHAIN GAMES IN DATABASE:");
  console.log("=".repeat(80));

  const blockchainGames = await prisma.game.findMany({
    where: {
      category: {
        label: {
          contains: "Web3",
          mode: "insensitive"
        }
      }
    },
    include: {
      category: true
    },
    take: 10,
    orderBy: {
      label: "asc"
    }
  });

  blockchainGames.forEach((game, idx) => {
    console.log(`${idx + 1}. ${game.label} (${game.value})`);
    console.log(`   Category: ${game.category?.label}`);
    console.log(`   Description: ${game.description?.substring(0, 100)}...`);

    // Find this game in results
    const match = results.find(r => r.value === game.value);
    if (match) {
      console.log(`   ✓ Found in results with ${(match.similarity * 100).toFixed(1)}% similarity`);
    } else {
      console.log(`   ✗ NOT in top 20 results (similarity too low)`);
    }
    console.log("");
  });

  // Test different thresholds
  console.log("\n" + "=".repeat(80));
  console.log("RESULTS AT DIFFERENT THRESHOLDS:");
  console.log("=".repeat(80));

  [0.6, 0.5, 0.4, 0.3, 0.2].forEach(threshold => {
    const filtered = results.filter(r => r.similarity >= threshold);
    const blockchainCount = filtered.filter(r =>
      r.category_label?.toLowerCase().includes('web3') ||
      r.category_label?.toLowerCase().includes('blockchain')
    ).length;
    console.log(`Threshold ${threshold}: ${filtered.length} total games, ${blockchainCount} blockchain games`);
  });
}

testBlockchainSearch()
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
