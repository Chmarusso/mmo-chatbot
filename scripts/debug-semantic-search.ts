#!/usr/bin/env tsx
/**
 * Debug Semantic Search
 *
 * This script helps debug semantic search issues by:
 * - Testing search queries with different similarity thresholds
 * - Comparing semantic search vs keyword search
 * - Showing similarity scores for all results
 * - Identifying potential data or embedding issues
 *
 * Usage:
 *   npx tsx scripts/debug-semantic-search.ts "2D isometric games"
 *   npx tsx scripts/debug-semantic-search.ts "casual MMO" --threshold 0.3
 */

import { prisma } from '../lib/prisma';
import { semanticGameSearch } from '../lib/vector-search';

const DEFAULT_MIN_SIMILARITY = 0.5;
const DEBUG_LIMIT = 20;

interface DebugOptions {
  query: string;
  minSimilarity?: number;
  showAll?: boolean;
}

async function debugSemanticSearch(options: DebugOptions) {
  const { query, minSimilarity = DEFAULT_MIN_SIMILARITY, showAll = false } = options;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 SEMANTIC SEARCH DEBUG');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Query: "${query}"`);
  console.log(`Min Similarity Threshold: ${minSimilarity}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Test 1: Semantic search with configured threshold
    console.log('📊 TEST 1: Semantic Search (with threshold)');
    console.log('─────────────────────────────────────────────────');

    const results = await semanticGameSearch(query, {
      limit: DEBUG_LIMIT,
      minSimilarity,
    });

    if (results.length === 0) {
      console.log('❌ No results found with current threshold');
    } else {
      console.log(`✅ Found ${results.length} results:\n`);
      results.forEach((game, index) => {
        console.log(`${index + 1}. ${game.label} (${game.value})`);
        console.log(`   Similarity: ${(game.similarity! * 100).toFixed(1)}%`);
        console.log(`   Category: ${game.category?.label || 'N/A'}`);
        if (game.description) {
          const shortDesc = game.description.substring(0, 100).replace(/\n/g, ' ');
          console.log(`   Description: ${shortDesc}...`);
        }
        console.log('');
      });
    }

    // Test 2: Semantic search with NO threshold (show all results)
    console.log('\n📊 TEST 2: Semantic Search (NO threshold - top 10)');
    console.log('─────────────────────────────────────────────────');

    const allResults = await semanticGameSearch(query, {
      limit: 10,
      minSimilarity: 0, // No threshold
    });

    console.log(`Found ${allResults.length} total results:\n`);
    allResults.forEach((game, index) => {
      const emoji = game.similarity! >= minSimilarity ? '✅' : '⚠️';
      console.log(`${emoji} ${index + 1}. ${game.label}`);
      console.log(`   Similarity: ${(game.similarity! * 100).toFixed(1)}% ${game.similarity! < minSimilarity ? '(below threshold)' : ''}`);
      console.log(`   Category: ${game.category?.label || 'N/A'}`);
      console.log('');
    });

    // Test 3: Keyword-based search for comparison
    console.log('\n📊 TEST 3: Keyword Search (for comparison)');
    console.log('─────────────────────────────────────────────────');

    const keywords = query.toLowerCase().split(' ').filter(w => w.length > 2);
    console.log(`Keywords extracted: ${keywords.join(', ')}\n`);

    const keywordResults = await prisma.game.findMany({
      where: {
        OR: keywords.flatMap(keyword => [
          { label: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
          { value: { contains: keyword, mode: 'insensitive' } },
        ]),
      },
      select: {
        value: true,
        label: true,
        description: true,
        category: {
          select: {
            value: true,
            label: true,
          },
        },
      },
      take: 10,
    });

    if (keywordResults.length === 0) {
      console.log('❌ No keyword matches found');
    } else {
      console.log(`✅ Found ${keywordResults.length} keyword matches:\n`);
      keywordResults.forEach((game, index) => {
        console.log(`${index + 1}. ${game.label} (${game.value})`);
        console.log(`   Category: ${game.category?.label || 'N/A'}`);

        // Show which keywords matched
        const matches: string[] = [];
        keywords.forEach(keyword => {
          if (game.label.toLowerCase().includes(keyword) ||
              game.description?.toLowerCase().includes(keyword) ||
              game.value.toLowerCase().includes(keyword)) {
            matches.push(keyword);
          }
        });
        if (matches.length > 0) {
          console.log(`   Matched keywords: ${matches.join(', ')}`);
        }
        console.log('');
      });
    }

    // Test 4: Check total games in database
    console.log('\n📊 TEST 4: Database Statistics');
    console.log('─────────────────────────────────────────────────');

    const totalGames = await prisma.game.count();
    const gamesWithEmbeddings = await prisma.game.count({
      where: {
        embeddingGeneratedAt: { not: null },
      },
    });

    console.log(`Total games in database: ${totalGames}`);
    console.log(`Games with embeddings: ${gamesWithEmbeddings}`);
    console.log(`Games without embeddings: ${totalGames - gamesWithEmbeddings}`);

    if (gamesWithEmbeddings < totalGames) {
      console.log('\n⚠️  WARNING: Some games are missing embeddings!');
      console.log('   Run: npx tsx scripts/generate-embeddings.ts');
    }

    // Test 5: Recommendations based on results
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 RECOMMENDATIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (results.length === 0 && allResults.length > 0) {
      const bestScore = allResults[0].similarity!;
      console.log(`⚠️  Issue: No results above threshold (${minSimilarity})`);
      console.log(`   Best similarity score: ${(bestScore * 100).toFixed(1)}%`);
      console.log(`   Suggestion: Consider lowering minSimilarity in lib/ai-tools.ts`);
      console.log(`   Current: 0.5, Recommended: ${Math.max(0.3, bestScore - 0.05).toFixed(2)}`);
    } else if (results.length === 0 && allResults.length === 0) {
      console.log('❌ Issue: No semantic results at all');
      console.log('   Possible causes:');
      console.log('   1. OpenAI API key missing or invalid');
      console.log('   2. Embedding generation failed');
      console.log('   3. No games in database');
      console.log('\n   Check:');
      console.log('   - OPENAI_API_KEY is set in .env');
      console.log('   - Run: npx tsx scripts/generate-embeddings.ts');
    } else if (keywordResults.length > 0 && results.length === 0) {
      console.log('⚠️  Keyword search found results but semantic search didn\'t');
      console.log('   This suggests the embeddings might not capture these concepts well');
      console.log('   Consider adding these terms to game descriptions or tags');
    } else {
      console.log('✅ Semantic search is working properly!');
      if (results.length < 5) {
        console.log(`   Note: Only ${results.length} results found - database may be limited`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Parse command line arguments
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage:
  npx tsx scripts/debug-semantic-search.ts <query> [options]

Options:
  --threshold <number>   Set minimum similarity threshold (default: 0.5)
  --all                  Show all results regardless of threshold
  --help, -h            Show this help message

Examples:
  npx tsx scripts/debug-semantic-search.ts "2D isometric games"
  npx tsx scripts/debug-semantic-search.ts "casual MMO" --threshold 0.3
  npx tsx scripts/debug-semantic-search.ts "sandbox PvP" --all
    `);
    process.exit(0);
  }

  // Extract query and options
  const options: DebugOptions = { query: '' };
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--threshold' && args[i + 1]) {
      options.minSimilarity = parseFloat(args[i + 1]);
      i += 2;
    } else if (arg === '--all') {
      options.showAll = true;
      i += 1;
    } else {
      // Treat as part of the query
      options.query += (options.query ? ' ' : '') + arg;
      i += 1;
    }
  }

  if (!options.query.trim()) {
    console.error('❌ Error: No query provided');
    console.log('Run with --help for usage information');
    process.exit(1);
  }

  await debugSemanticSearch(options);
  await prisma.$disconnect();
}

main();
