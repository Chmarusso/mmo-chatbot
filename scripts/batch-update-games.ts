import { spawn } from "child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CliOptions = {
  startFrom: number;
  limit: number | null;
  dryRun: boolean;
};

function parseCliOptions(): CliOptions {
  const args = process.argv.slice(2);
  let startFrom = 0;
  let limit: number | null = null;
  let dryRun = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--start-from" && args[i + 1]) {
      startFrom = Number.parseInt(args[i + 1], 10) || 0;
      i += 1;
    } else if (arg === "--limit" && args[i + 1]) {
      const parsed = Number.parseInt(args[i + 1], 10);
      limit = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      i += 1;
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return { startFrom: Math.max(0, startFrom), limit, dryRun };
}

function runAddGame(title: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["add-game", title], {
      stdio: "inherit",
      env: process.env,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`add-game exited with code ${code ?? 0}`));
      }
    });
    child.on("error", reject);
  });
}

async function main() {
  const options = parseCliOptions();

  console.log("\n🚀 Batch Update Games (feature summaries)\n" + "=".repeat(80));
  console.log(`Options -> startFrom: ${options.startFrom}, limit: ${options.limit ?? "∞"}, dryRun: ${options.dryRun}`);

  const games = await prisma.game.findMany({
    where: {
      OR: [{ featureSummary: null }, { featureSummary: "" }],
    },
    orderBy: { label: "asc" },
  });

  if (!games.length) {
    console.log("\n✅ All games already have a feature summary. Nothing to do.");
    return;
  }

  console.log(`\nFound ${games.length} games missing feature summaries.`);

  const selected = games.slice(options.startFrom, options.limit ? options.startFrom + options.limit : undefined);

  if (selected.length === 0) {
    console.log("\n⚠️  startFrom/limit resulted in an empty selection. Exiting.");
    return;
  }

  console.log(`\nProcessing ${selected.length} games...\n`);

  for (let index = 0; index < selected.length; index += 1) {
    const game = selected[index];
    const absoluteIndex = options.startFrom + index + 1;
    console.log("=".repeat(70));
    console.log(`[${index + 1}/${selected.length}] Game #${absoluteIndex}: ${game.label}`);

    if (options.dryRun) {
      console.log(`(dry-run) would execute: pnpm add-game "${game.label}"`);
      continue;
    }

    try {
      await runAddGame(game.label);
      console.log(`\n✓ Updated ${game.label}`);
    } catch (error) {
      console.error(`\n✗ Failed to update ${game.label}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log("\n✨ Batch update complete!\n");
}

main()
  .catch((error) => {
    console.error("\n❌ Batch update failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
