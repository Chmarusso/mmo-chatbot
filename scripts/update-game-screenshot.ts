import { PrismaClient } from "@prisma/client";
import * as readline from "readline";

const prisma = new PrismaClient();
const SERPER_API_KEY = process.env.SERPER_API_KEY;

interface UpdateScreenshotOptions {
  gameIdentifier: string;
  screenshotUrl?: string;
}

interface SerperImageResult {
  title: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  thumbnailUrl: string;
  source: string;
  link: string;
}

interface SerperSearchResponse {
  images?: SerperImageResult[];
}

/**
 * Find a game by value or label
 */
async function findGame(identifier: string) {
  // Try exact match on value first
  let game = await prisma.game.findUnique({
    where: { value: identifier },
    include: { category: true },
  });

  if (game) return game;

  // Try case-insensitive label search
  const games = await prisma.game.findMany({
    where: {
      label: {
        contains: identifier,
        mode: "insensitive",
      },
    },
    include: { category: true },
    take: 5,
  });

  if (games.length === 0) {
    return null;
  }

  if (games.length === 1) {
    return games[0];
  }

  // Multiple matches - show options
  console.log(`\n📋 Found ${games.length} games matching "${identifier}":\n`);
  games.forEach((g, idx) => {
    console.log(`${idx + 1}. ${g.label} (${g.value})`);
    console.log(`   Category: ${g.category?.label || "N/A"}`);
    console.log(`   Current screenshot: ${g.screenshot || "None"}`);
    console.log("");
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const choice = await new Promise<string>((resolve) => {
    rl.question(`Select a game (1-${games.length}): `, resolve);
  });
  rl.close();

  const index = parseInt(choice) - 1;
  if (isNaN(index) || index < 0 || index >= games.length) {
    throw new Error("Invalid selection");
  }

  return games[index];
}

/**
 * Search for game screenshots using Serper API
 */
async function searchGameScreenshots(gameName: string): Promise<SerperImageResult[]> {
  if (!SERPER_API_KEY) {
    console.log("⚠️  SERPER_API_KEY not set, skipping automatic search");
    return [];
  }

  try {
    console.log(`\n🔍 Searching for "${gameName}" screenshots...`);

    const searchQuery = `${gameName} game screenshot`;

    const response = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 10,
      }),
    });

    if (!response.ok) {
      console.error(`⚠️  Serper API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = (await response.json()) as SerperSearchResponse;

    if (!data.images || data.images.length === 0) {
      console.log("⚠️  No images found");
      return [];
    }

    console.log(`✓ Found ${data.images.length} images\n`);
    return data.images;
  } catch (error) {
    console.error("⚠️  Error searching for screenshots:", error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Prompt user to select from search results or enter custom URL
 */
async function promptForScreenshotWithSearch(gameName: string): Promise<string> {
  // Try automatic search first
  const searchResults = await searchGameScreenshots(gameName);

  if (searchResults.length > 0) {
    console.log("📸 Screenshot Options:");
    console.log("=".repeat(80));

    searchResults.forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.title || "Untitled"}`);
      console.log(`   Source: ${result.source}`);
      console.log(`   URL: ${result.imageUrl}`);
      console.log(`   Size: ${result.imageWidth}x${result.imageHeight}px`);
      console.log("");
    });

    console.log(`0. Enter custom URL`);
    console.log("=".repeat(80));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const choice = await new Promise<string>((resolve) => {
      rl.question(`\nSelect option (0-${searchResults.length}): `, resolve);
    });

    const index = parseInt(choice);

    if (isNaN(index) || index < 0 || index > searchResults.length) {
      rl.close();
      console.error("❌ Invalid selection");
      process.exit(1);
    }

    if (index === 0) {
      // Custom URL
      const customUrl = await new Promise<string>((resolve) => {
        rl.question("Enter custom screenshot URL: ", resolve);
      });
      rl.close();
      return customUrl.trim();
    }

    rl.close();
    return searchResults[index - 1].imageUrl;
  }

  // Fallback to manual entry
  return await promptForScreenshotManual();
}

/**
 * Prompt for screenshot URL (manual entry)
 */
async function promptForScreenshotManual(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const url = await new Promise<string>((resolve) => {
    rl.question("Enter screenshot URL: ", resolve);
  });
  rl.close();

  return url.trim();
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Update game screenshot
 */
async function updateGameScreenshot(options: UpdateScreenshotOptions) {
  console.log("🎮 MMOPLAYA - Update Game Screenshot\n");

  // Find the game
  console.log(`🔍 Looking for game: "${options.gameIdentifier}"...`);
  const game = await findGame(options.gameIdentifier);

  if (!game) {
    console.error(`\n❌ No game found matching "${options.gameIdentifier}"`);
    console.log("\n💡 Tip: Search by game value (e.g., 'world-of-warcraft') or partial name");
    process.exit(1);
  }

  console.log(`\n✓ Found: ${game.label}`);
  console.log(`  Value: ${game.value}`);
  console.log(`  Category: ${game.category?.label || "N/A"}`);
  console.log(`  Current screenshot: ${game.screenshot || "None"}\n`);

  // Get screenshot URL
  let screenshotUrl = options.screenshotUrl;

  if (!screenshotUrl) {
    screenshotUrl = await promptForScreenshot();
  }

  if (!screenshotUrl) {
    console.error("❌ Screenshot URL is required");
    process.exit(1);
  }

  // Validate URL
  if (!isValidUrl(screenshotUrl)) {
    console.error(`❌ Invalid URL: ${screenshotUrl}`);
    process.exit(1);
  }

  // Show what will be updated
  console.log("\n📝 Update Summary:");
  console.log("=".repeat(60));
  console.log(`Game: ${game.label}`);
  console.log(`Old screenshot: ${game.screenshot || "(none)"}`);
  console.log(`New screenshot: ${screenshotUrl}`);
  console.log("=".repeat(60));

  // Confirm
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const confirm = await new Promise<string>((resolve) => {
    rl.question("\nProceed with update? (yes/no): ", resolve);
  });
  rl.close();

  if (confirm.toLowerCase() !== "yes") {
    console.log("\n❌ Update cancelled");
    process.exit(0);
  }

  // Update the game
  console.log("\n⏳ Updating game...");

  const updatedGame = await prisma.game.update({
    where: { value: game.value },
    data: {
      screenshot: screenshotUrl,
      updatedAt: new Date(),
    },
  });

  console.log("\n✅ Screenshot updated successfully!\n");
  console.log(`Game: ${updatedGame.label}`);
  console.log(`New screenshot: ${updatedGame.screenshot}`);
  console.log(`Updated at: ${updatedGame.updatedAt.toISOString()}\n`);

  // Show preview link
  const gameSlug = game.value.replace(/_/g, "-");
  console.log(`🔗 View game page: ${process.env.APP_URL || "http://localhost:3000"}/games/${gameSlug}\n`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: pnpm tsx scripts/update-game-screenshot.ts <game-name-or-value> [screenshot-url]");
    console.log("");
    console.log("Examples:");
    console.log('  pnpm tsx scripts/update-game-screenshot.ts "World of Warcraft"');
    console.log('  pnpm tsx scripts/update-game-screenshot.ts world-of-warcraft https://example.com/screenshot.jpg');
    console.log('  pnpm tsx scripts/update-game-screenshot.ts wow');
    console.log("");
    process.exit(1);
  }

  const gameIdentifier = args[0];
  const screenshotUrl = args[1];

  await updateGameScreenshot({
    gameIdentifier,
    screenshotUrl,
  });
}

main()
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
