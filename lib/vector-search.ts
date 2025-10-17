import { PrismaClient, Prisma } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = "text-embedding-3-small";

export interface GameSearchResult {
  value: string;
  label: string;
  description: string | null;
  screenshot: string | null;
  website: string | null;
  category: {
    value: string;
    label: string;
  } | null;
  similarity: number; // 0-1, higher is more similar
}

/**
 * Generate embedding for a search query
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: query,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Failed to generate query embedding:", error);
    throw new Error("Failed to generate search embedding");
  }
}

/**
 * Search games by semantic similarity
 */
export async function semanticGameSearch(
  query: string,
  options: {
    limit?: number;
    minSimilarity?: number;
    categoryFilter?: string[];
  } = {}
): Promise<GameSearchResult[]> {
  const { limit = 10, minSimilarity = 0.5, categoryFilter } = options;

  // Generate query embedding
  const queryEmbedding = await generateQueryEmbedding(query);

  // Build category filter condition
  const categoryCondition =
    categoryFilter && categoryFilter.length > 0
      ? Prisma.sql`AND c.value = ANY(${categoryFilter})`
      : Prisma.empty;

  // Perform vector similarity search
  const results = await prisma.$queryRaw<
    Array<{
      value: string;
      label: string;
      description: string | null;
      screenshot: string | null;
      website: string | null;
      category_value: string | null;
      category_label: string | null;
      similarity: number;
    }>
  >`
    SELECT
      g.value,
      g.label,
      g.description,
      g.screenshot,
      g.website,
      c.value as category_value,
      c.label as category_label,
      1 - (g.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
    FROM "Game" g
    LEFT JOIN "GameCategory" c ON g."categoryId" = c.id
    WHERE g.embedding IS NOT NULL
    ${categoryCondition}
    ORDER BY g.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT ${limit}
  `;

  // Filter by minimum similarity and map results
  return results
    .filter((r) => r.similarity >= minSimilarity)
    .map((r) => ({
      value: r.value,
      label: r.label,
      description: r.description,
      screenshot: r.screenshot,
      website: r.website,
      category: r.category_value
        ? {
            value: r.category_value,
            label: r.category_label!,
          }
        : null,
      similarity: r.similarity,
    }));
}

/**
 * Find games similar to a reference game
 */
export async function findSimilarGames(
  gameValue: string,
  limit: number = 5
): Promise<GameSearchResult[]> {
  // Get the reference game's embedding
  const referenceGame = await prisma.$queryRaw<
    Array<{ embedding: string }>
  >`
    SELECT embedding::text as embedding
    FROM "Game"
    WHERE value = ${gameValue} AND embedding IS NOT NULL
  `;

  if (referenceGame.length === 0) {
    throw new Error("Game not found or missing embedding");
  }

  // Search for similar games (excluding the reference game itself)
  const results = await prisma.$queryRaw<
    Array<{
      value: string;
      label: string;
      description: string | null;
      screenshot: string | null;
      website: string | null;
      category_value: string | null;
      category_label: string | null;
      similarity: number;
    }>
  >`
    SELECT
      g.value,
      g.label,
      g.description,
      g.screenshot,
      g.website,
      c.value as category_value,
      c.label as category_label,
      1 - (g.embedding <=> ${referenceGame[0].embedding}::vector) as similarity
    FROM "Game" g
    LEFT JOIN "GameCategory" c ON g."categoryId" = c.id
    WHERE g.embedding IS NOT NULL
      AND g.value != ${gameValue}
    ORDER BY g.embedding <=> ${referenceGame[0].embedding}::vector
    LIMIT ${limit}
  `;

  return results.map((r) => ({
    value: r.value,
    label: r.label,
    description: r.description,
    screenshot: r.screenshot,
    website: r.website,
    category: r.category_value
      ? {
          value: r.category_value,
          label: r.category_label!,
        }
      : null,
    similarity: r.similarity,
  }));
}
