import "dotenv/config";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;
const R2_PATH_PREFIX = process.env.R2_PATH_PREFIX || "mmoplaya";

const s3 = new S3Client({
  endpoint: R2_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const DRY_RUN = process.argv.includes("--dry-run");
const CONCURRENCY = 5;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

interface MigrationItem {
  table: "Game" | "Profile";
  /** For Game this is `value` (the PK), for Profile it's `id` */
  pk: string;
  field: "screenshot" | "avatarUrl";
  oldUrl: string;
  category: "game-screenshots" | "avatars";
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

function extractFilename(url: string): string {
  const parts = url.split("/");
  return parts[parts.length - 1].split("?")[0];
}

function buildR2Key(category: string, filename: string): string {
  return `${R2_PATH_PREFIX}/${category}/${filename}`;
}

function buildR2Url(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MMOPLAYA-Migration/1.0)" },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length === 0) {
    throw new Error("Empty file (0 bytes)");
  }

  return { buffer, contentType };
}

async function migrateItem(item: MigrationItem): Promise<"migrated" | "skipped" | "failed"> {
  const filename = extractFilename(item.oldUrl);
  const key = buildR2Key(item.category, filename);
  const newUrl = buildR2Url(key);

  const label = `${item.table}:${item.pk}`;

  // Check if already exists in R2
  const exists = await objectExists(key);
  if (exists) {
    // Object already in R2 — just update DB if needed
    if (!DRY_RUN) {
      if (item.table === "Game") {
        await prisma.game.update({ where: { value: item.pk }, data: { screenshot: newUrl } });
      } else {
        await prisma.profile.update({ where: { id: item.pk }, data: { avatarUrl: newUrl } });
      }
    }
    console.log(`  SKIP (exists) ${label} -> ${key}`);
    return "skipped";
  }

  if (DRY_RUN) {
    console.log(`  DRY-RUN ${label} ${item.oldUrl.slice(0, 80)} -> ${key}`);
    return "migrated";
  }

  // Download and upload with retries
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { buffer, contentType } = await downloadImage(item.oldUrl);

      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      // Update DB
      if (item.table === "Game") {
        await prisma.game.update({ where: { value: item.pk }, data: { screenshot: newUrl } });
      } else {
        await prisma.profile.update({ where: { id: item.pk }, data: { avatarUrl: newUrl } });
      }

      console.log(`  OK ${label} -> ${key} (${buffer.length} bytes)`);
      return "migrated";
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`  RETRY ${attempt}/${MAX_RETRIES} ${label} - ${msg} (waiting ${delay}ms)`);
        await sleep(delay);
      } else {
        console.error(`  FAIL ${label} - ${msg}`);
        return "failed";
      }
    }
  }

  return "failed";
}

async function runBatch<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

async function main() {
  console.log(`\n🚀 Image Migration: Supabase → Cloudflare R2`);
  console.log(`   Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(`   Bucket: ${R2_BUCKET}`);
  console.log(`   Prefix: ${R2_PATH_PREFIX}`);
  console.log(`   Public URL: ${R2_PUBLIC_URL}`);
  console.log(`   Concurrency: ${CONCURRENCY}`);
  console.log("━".repeat(60));

  // Gather items to migrate
  const items: MigrationItem[] = [];

  // Game screenshots
  const games = await prisma.game.findMany({
    where: { screenshot: { contains: "supabase.co" } },
    select: { value: true, screenshot: true },
  });

  for (const game of games) {
    if (game.screenshot) {
      items.push({
        table: "Game",
        pk: game.value,
        field: "screenshot",
        oldUrl: game.screenshot,
        category: "game-screenshots",
      });
    }
  }

  // Profile avatars
  const profiles = await prisma.profile.findMany({
    where: { avatarUrl: { contains: "supabase.co" } },
    select: { id: true, avatarUrl: true },
  });

  for (const profile of profiles) {
    if (profile.avatarUrl) {
      items.push({
        table: "Profile",
        pk: profile.id,
        field: "avatarUrl",
        oldUrl: profile.avatarUrl,
        category: "avatars",
      });
    }
  }

  console.log(`\n📋 Found ${items.length} items to migrate`);
  console.log(`   Games: ${games.length}`);
  console.log(`   Profiles: ${profiles.length}`);

  if (items.length === 0) {
    console.log("\n✅ Nothing to migrate!");
    return;
  }

  console.log("");

  const results = await runBatch(items, CONCURRENCY, migrateItem);

  const migrated = results.filter((r) => r === "migrated").length;
  const skipped = results.filter((r) => r === "skipped").length;
  const failed = results.filter((r) => r === "failed").length;

  console.log("\n" + "━".repeat(60));
  console.log(`📊 Summary:`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped:  ${skipped}`);
  console.log(`   Failed:   ${failed}`);
  console.log(`   Total:    ${items.length}`);

  if (failed > 0) {
    console.log(`\n⚠️  ${failed} items failed. Re-run the script to retry.`);
    process.exit(1);
  }

  console.log(`\n✅ Migration complete!`);
}

main()
  .catch((error) => {
    console.error("\n❌ Migration error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
