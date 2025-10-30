import { tool } from "ai";
import { z } from "zod";
import {
  semanticGameSearch,
  findSimilarGames,
  type GameSearchResult,
} from "./vector-search";
import { prisma } from "./prisma";

/**
 * Tool: Search games by semantic similarity
 * Uses vector embeddings to find games matching a natural language query
 */
export const searchGamesTool = tool({
  description: `Search for games using natural language queries. Examples: "MMORPG with sandbox elements", "casual PvE games"`,
  parameters: z.object({
    query: z.string().describe("Search query for games"),
    limit: z.number().default(10).describe("Max games to return"),
  }),
  // @ts-ignore - AI SDK type inference issue with execute function
  execute: async ({ query, limit }) => {
    const results = await semanticGameSearch(query, {
      limit,
      minSimilarity: 0.35, // Lowered from 0.5 based on real-world query analysis
    });

    return {
      success: results.length > 0,
      message: results.length > 0
        ? `Found ${results.length} games`
        : "No games found",
      games: results,
    };
  },
});

/**
 * Tool: Find games similar to a reference game
 * Uses the reference game's embedding to find similar games
 */
export const findSimilarGamesTool = tool({
  description: "Find games similar to a specific game",
  parameters: z.object({
    gameValue: z.string().describe("Game identifier (e.g. 'world-of-warcraft')"),
    limit: z.number().default(5).describe("Max games to return"),
  }),
  // @ts-ignore - AI SDK type inference issue
  execute: async ({ gameValue, limit }) => {
    try {
      const results = await findSimilarGames(gameValue, limit);
      return {
        success: results.length > 0,
        message: results.length > 0 ? `Found ${results.length} similar games` : "No similar games found",
        games: results,
      };
    } catch (error) {
      return {
        success: false,
        message: "Game not found in database",
        games: [],
      };
    }
  },
});

/**
 * Tool: Get user's current game list
 * Fetches the games the user has added to their profile
 */
export const getUserGamesTool = tool({
  description: "Get user's game list from profile",
  parameters: z.object({
    profileId: z.string().describe("User profile ID"),
  }),
  // @ts-ignore - AI SDK type inference issue
  execute: async ({ profileId }) => {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        select: {
          gamePreferences: true,
        },
      });

      if (!profile || !profile.gamePreferences || profile.gamePreferences.length === 0) {
        return { success: true, message: "No games in profile", games: [] };
      }

      // Fetch full game details
      const games = await prisma.game.findMany({
        where: { value: { in: profile.gamePreferences } },
        select: {
          value: true,
          label: true,
          description: true,
          screenshot: true,
          website: true,
          category: { select: { value: true, label: true } },
        },
      });

      return {
        success: true,
        message: `You have ${games.length} games`,
        games: games.map((g) => ({
          ...g,
          similarity: 1.0,
        })),
      };
    } catch (error) {
      return { success: false, message: "Failed to fetch games", games: [] };
    }
  },
});

/**
 * Tool: Get detailed information about specific games
 * Fetches full game details for one or more games by their values
 */
export const getGameDetailsTool = tool({
  description: "Get detailed info about specific games",
  parameters: z.object({
    gameValues: z.array(z.string()).describe("Array of game IDs"),
  }),
  // @ts-ignore - AI SDK type inference issue
  execute: async ({ gameValues }) => {
    try {
      const games = await prisma.game.findMany({
        where: { value: { in: gameValues } },
        select: {
          value: true,
          label: true,
          description: true,
          screenshot: true,
          website: true,
          category: { select: { value: true, label: true } },
        },
      });

      return {
        success: games.length > 0,
        message: games.length > 0 ? `Found ${games.length} games` : "No games found",
        games: games.map((g) => ({ ...g, similarity: 1.0 })),
      };
    } catch (error) {
      return { success: false, message: "Failed to fetch details", games: [] };
    }
  },
});

/**
 * Export all tools as a single object for easy use in AI SDK
 */
export const companionTools = {
  searchGames: searchGamesTool,
  findSimilarGames: findSimilarGamesTool,
  getUserGames: getUserGamesTool,
  getGameDetails: getGameDetailsTool,
};
