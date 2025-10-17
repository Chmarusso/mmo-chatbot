import { spawn } from "child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// List of games to add
const GAMES_TO_ADD = [
  "World of Warcraft (Retail)",
  "World of Warcraft Classic",
  "Final Fantasy XIV",
  "The Elder Scrolls Online",
  "Guild Wars 2",
  "Black Desert Online",
  "Lost Ark",
  "EVE Online",
  "Star Wars: The Old Republic",
  "RuneScape",
  "Old School RuneScape",
  "Albion Online",
  "New World: Aeternum",
  "Warframe",
  "Destiny 2",
  "Phantasy Star Online 2: New Genesis",
  "The Lord of the Rings Online",
  "Star Trek Online",
  "DC Universe Online",
  "MapleStory",
  "Mabinogi",
  "Vindictus",
  "Ragnarok Online",
  "Metin2",
  "Tibia",
  "Lineage",
  "Lineage II",
  "Aion",
  "Aion Classic",
  "Perfect World International",
  "Cabal Online",
  "Silkroad Online",
  "FlyFF",
  "Rappelz",
  "Allods Online",
  "Conquer Online",
  "Eudemons Online",
  "EverQuest",
  "EverQuest II",
  "Dark Age of Camelot",
  "Ultima Online",
  "Anarchy Online",
  "Project Gorgon",
  "Villagers & Heroes",
  "Rune of Magic",
  "NosTale",
  "La Tale",
  "Skyforge",
  "Wizard101",
  "Pirate101",
  "AdventureQuest Worlds",
  "AdventureQuest 3D",
  "RuneScape Mobile",
  "Old School RuneScape Mobile",
  "Black Desert Mobile",
  "Lineage 2M",
  "Lineage W",
  "MU Online",
  "MU Legend",
  "Dofus",
  "Wakfu",
  "Realm of the Mad God",
  "Trove",
  "Tower of Fantasy",
  "MIR4",
  "MIR M",
  "Dragon Raja",
  "Ni no Kuni: Cross Worlds",
  "Ragnarok Origin",
  "MapleStory M",
  "Palia",
  "Temtem",
  "Foxhole",
  "Planetside 2",
  "Star Citizen",
  "Elite Dangerous",
  "EVE Echoes",
  "Blue Protocol: Star Resonance",
  "Tarisland",
  "Throne and Liberty",
  "Brawlhalla",
  "Crossout",
  "Dauntless",
  "War Thunder",
  "World of Tanks",
  "World of Warships",
  "World of Warplanes",
  "Albion East",
  "Toontown Rewritten",
  "Pirates Online: Rewritten",
  "Phantasy Star Online 2 Classic",
  "Swords of Legends Online",
  "Granado Espada",
  "Ragnarok Online 2",
  "Hero Online",
  "Seal Online",
  "Twelve Sky 2",
  "Dekaron",
  "Kritika Global",
  "Albion Online Mobile",
];

interface BatchResult {
  game: string;
  status: "success" | "failed" | "skipped";
  error?: string;
}

/**
 * Create a slug from game title (same logic as add-game-agent)
 */
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

/**
 * Check if a game already exists in the database
 */
async function gameExists(gameTitle: string): Promise<boolean> {
  const slug = createSlug(gameTitle);
  const existing = await prisma.game.findUnique({
    where: { value: slug },
  });
  return !!existing;
}

/**
 * Run the add-game-agent script for a single game
 */
async function addSingleGame(gameTitle: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`🎮 Processing: ${gameTitle}`);
    console.log("=".repeat(80));

    // Don't use shell to avoid escaping issues
    const child = spawn("npx", ["tsx", "scripts/add-game-agent.ts", gameTitle], {
      stdio: "inherit",
      shell: false, // Important: don't use shell to avoid escaping issues
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Main batch processing function
 */
async function main() {
  console.log(`\n🚀 Batch Add Games Script`);
  console.log("=".repeat(80));
  console.log(`Total games to process: ${GAMES_TO_ADD.length}`);
  console.log("=".repeat(80));

  const results: BatchResult[] = [];
  let processed = 0;
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  // Check for --skip-existing flag
  const skipExisting = process.argv.includes("--skip-existing");
  if (skipExisting) {
    console.log("\n⚠️  Skip existing mode enabled - will skip games already in database");
  }

  // Check for --start-from flag
  const startFromIndex = process.argv.findIndex((arg) => arg === "--start-from");
  const startFrom = startFromIndex !== -1 ? parseInt(process.argv[startFromIndex + 1]) : 0;
  if (startFrom > 0) {
    console.log(`\n⚠️  Starting from game #${startFrom + 1}: ${GAMES_TO_ADD[startFrom]}`);
  }

  // Check for --limit flag
  const limitIndex = process.argv.findIndex((arg) => arg === "--limit");
  const limit = limitIndex !== -1 ? parseInt(process.argv[limitIndex + 1]) : GAMES_TO_ADD.length;

  const gamesToProcess = GAMES_TO_ADD.slice(startFrom, startFrom + limit);
  console.log(`\nProcessing ${gamesToProcess.length} games (from index ${startFrom} to ${startFrom + gamesToProcess.length - 1})\n`);

  for (let i = 0; i < gamesToProcess.length; i++) {
    const gameTitle = gamesToProcess[i];
    const actualIndex = startFrom + i;
    processed++;

    console.log(`\n[${processed}/${gamesToProcess.length}] Game #${actualIndex + 1}: ${gameTitle}`);

    try {
      // Check if game already exists
      if (skipExisting) {
        const exists = await gameExists(gameTitle);
        if (exists) {
          console.log(`⏭️  Skipping "${gameTitle}" - already exists in database`);
          results.push({ game: gameTitle, status: "skipped" });
          skipped++;
          continue;
        }
      }

      // Add the game
      await addSingleGame(gameTitle);
      results.push({ game: gameTitle, status: "success" });
      successful++;

      console.log(`\n✅ Successfully added: ${gameTitle}`);

      // Add a delay between games to be respectful to APIs
      if (i < gamesToProcess.length - 1) {
        console.log("\n⏳ Waiting 5 seconds before next game...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Failed to add "${gameTitle}": ${errorMessage}`);
      results.push({ game: gameTitle, status: "failed", error: errorMessage });
      failed++;

      // Wait a bit before continuing after an error
      if (i < gamesToProcess.length - 1) {
        console.log("\n⏳ Waiting 10 seconds before next game (after error)...");
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }
  }

  // Print summary
  console.log(`\n\n${"=".repeat(80)}`);
  console.log("📊 BATCH PROCESSING SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total games processed: ${processed}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log("=".repeat(80));

  // Print failed games
  if (failed > 0) {
    console.log(`\n❌ Failed games:`);
    results
      .filter((r) => r.status === "failed")
      .forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.game}`);
        if (r.error) {
          console.log(`     Error: ${r.error}`);
        }
      });
  }

  // Print skipped games
  if (skipped > 0) {
    console.log(`\n⏭️  Skipped games (already exist):`);
    results
      .filter((r) => r.status === "skipped")
      .forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.game}`);
      });
  }

  console.log("\n✨ Batch processing complete!");
  console.log("=".repeat(80));
}

main()
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
