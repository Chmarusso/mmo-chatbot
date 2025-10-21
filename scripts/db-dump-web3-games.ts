import { spawn } from 'child_process';
import { createWriteStream, createReadStream } from 'fs';
import { mkdir } from 'fs/promises';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { resolve } from 'path';
import { readdirSync, statSync } from 'fs';
import { PrismaClient } from '@prisma/client';

// Load environment variables
import { config } from 'dotenv';
config();

const prisma = new PrismaClient();

const BACKUP_DIR = resolve(process.cwd(), 'backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').split('.')[0];
const BACKUP_FILE = `${BACKUP_DIR}/web3_games_${TIMESTAMP}.sql`;
const COMPRESSED_FILE = `${BACKUP_FILE}.gz`;

function parseConnectionString(url: string) {
  const matches = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!matches) throw new Error('Invalid DATABASE_URL format');

  return {
    user: matches[1],
    password: matches[2],
    host: matches[3],
    port: matches[4],
    database: matches[5],
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

async function listRecentBackups() {
  try {
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('web3_games_') && (f.endsWith('.sql') || f.endsWith('.sql.gz')))
      .map(f => ({
        name: f,
        path: resolve(BACKUP_DIR, f),
        time: statSync(resolve(BACKUP_DIR, f)).mtime,
        size: statSync(resolve(BACKUP_DIR, f)).size,
      }))
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 5);

    if (files.length > 0) {
      console.log('\n\x1b[33mRecent web3 game backups:\x1b[0m');
      files.forEach(f => {
        console.log(`  ${f.name} (${formatBytes(f.size)})`);
      });
    }
  } catch (err) {
    // Directory doesn't exist yet, ignore
  }
}

async function findWeb3Category(): Promise<string | null> {
  console.log('\x1b[33mSearching for web3 game category...\x1b[0m');

  // Search for web3-related categories (case-insensitive)
  const category = await prisma.gameCategory.findFirst({
    where: {
      OR: [
        { value: { contains: 'web3', mode: 'insensitive' } },
        { label: { contains: 'web3', mode: 'insensitive' } },
        { value: { contains: 'blockchain', mode: 'insensitive' } },
        { label: { contains: 'blockchain', mode: 'insensitive' } },
        { value: { contains: 'crypto', mode: 'insensitive' } },
        { label: { contains: 'crypto', mode: 'insensitive' } },
      ]
    }
  });

  if (!category) {
    return null;
  }

  console.log(`\x1b[32m✓ Found web3 category:\x1b[0m ${category.label} (${category.value})`);
  console.log(`  Description: ${category.description || 'N/A'}`);

  return category.id;
}

async function countWeb3Games(categoryId: string): Promise<number> {
  const count = await prisma.game.count({
    where: {
      categoryId: categoryId
    }
  });

  return count;
}

async function createBackup() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('\x1b[31mError: DATABASE_URL not found in environment\x1b[0m');
    process.exit(1);
  }

  // Find web3 category
  const web3CategoryId = await findWeb3Category();

  if (!web3CategoryId) {
    console.error('\n\x1b[31mError: No web3 game category found in database\x1b[0m');
    console.error('Please create a category with "web3", "blockchain", or "crypto" in the value or label');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Count games in this category
  const gameCount = await countWeb3Games(web3CategoryId);
  console.log(`\x1b[33mFound ${gameCount} web3 game(s) to backup\x1b[0m\n`);

  if (gameCount === 0) {
    console.log('\x1b[33mNo web3 games to backup. Exiting.\x1b[0m');
    await prisma.$disconnect();
    process.exit(0);
  }

  // Get list of game values to backup
  const games = await prisma.game.findMany({
    where: { categoryId: web3CategoryId },
    select: { value: true }
  });

  await prisma.$disconnect();

  const gameValues = games.map(g => g.value);

  const dbConfig = parseConnectionString(DATABASE_URL);

  console.log('\x1b[33mStarting web3 games database backup...\x1b[0m');
  console.log(`Database: ${dbConfig.database}`);
  console.log(`Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`User: ${dbConfig.user}`);
  console.log('');

  // Create backup directory
  await mkdir(BACKUP_DIR, { recursive: true });

  console.log(`\x1b[33mCreating backup: ${BACKUP_FILE}\x1b[0m`);

  // Build pg_dump arguments
  const args = [
    '--host', dbConfig.host,
    '--port', dbConfig.port,
    '--username', dbConfig.user,
    '--dbname', dbConfig.database,
    '--format', 'plain',
    '--no-owner',
    '--no-acl',
  ];

  // Create a SQL dump with custom WHERE clauses for web3 games
  const pgDump = spawn('pg_dump', args, {
    env: { ...process.env, PGPASSWORD: dbConfig.password },
  });

  let sqlContent = '';

  pgDump.stdout.on('data', (data) => {
    sqlContent += data.toString();
  });

  pgDump.stderr.on('data', (data) => {
    // pg_dump writes progress to stderr, which is normal
    const message = data.toString();
    if (!message.includes('NOTICE') && !message.includes('pg_dump:')) {
      process.stderr.write(data);
    }
  });

  return new Promise<void>((resolve, reject) => {
    pgDump.on('error', (error) => {
      reject(new Error(`pg_dump not found. Please install PostgreSQL client tools.\n${error.message}`));
    });

    pgDump.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`pg_dump exited with code ${code}`));
        return;
      }

      try {
        // Filter the SQL dump to only include web3 games and related data
        const filteredSql = filterSqlForWeb3Games(sqlContent, gameValues, web3CategoryId);

        // Write filtered SQL to file
        const writeStream = createWriteStream(BACKUP_FILE);
        writeStream.write(filteredSql);
        writeStream.end();

        await new Promise((res, rej) => {
          writeStream.on('finish', res);
          writeStream.on('error', rej);
        });

        const stats = statSync(BACKUP_FILE);
        console.log('\x1b[32m✓ Backup completed successfully!\x1b[0m');
        console.log(`File: ${BACKUP_FILE}`);
        console.log(`Size: ${formatBytes(stats.size)}`);
        console.log('');

        // Create compressed version
        console.log('\x1b[33mCompressing backup...\x1b[0m');
        const gzip = createGzip();
        const source = createReadStream(BACKUP_FILE);
        const destination = createWriteStream(COMPRESSED_FILE);

        await pipeline(source, gzip, destination);

        const compressedStats = statSync(COMPRESSED_FILE);
        console.log('\x1b[32m✓ Compressed backup created!\x1b[0m');
        console.log(`File: ${COMPRESSED_FILE}`);
        console.log(`Size: ${formatBytes(compressedStats.size)}`);

        await listRecentBackups();

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

function filterSqlForWeb3Games(sqlContent: string, gameValues: string[], categoryId: string): string {
  // This is a simplified filter - for a full dump, we'd use pg_dump with specific table filtering
  // For now, we'll create a custom SQL script that exports just the web3 games

  const header = `--
-- Web3 Games Database Dump
-- Generated: ${new Date().toISOString()}
-- Game Category ID: ${categoryId}
-- Number of games: ${gameValues.length}
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

`;

  const gameValuesList = gameValues.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');

  const exportQueries = `
-- Export web3 game category
COPY (
  SELECT * FROM "GameCategory" WHERE id = '${categoryId}'
) TO STDOUT;

-- Export web3 games
COPY (
  SELECT * FROM "Game" WHERE "categoryId" = '${categoryId}'
) TO STDOUT;

-- Export web3 game ratings
COPY (
  SELECT * FROM "GameRating" WHERE "gameValue" IN (${gameValuesList})
) TO STDOUT;

-- Export web3 game comments
COPY (
  SELECT * FROM "GameComment" WHERE "gameValue" IN (${gameValuesList})
) TO STDOUT;

-- Export web3 game website clicks
COPY (
  SELECT * FROM "GameWebsiteClick" WHERE "gameValue" IN (${gameValuesList})
) TO STDOUT;

-- Export web3 game suggestions
COPY (
  SELECT * FROM "GameSuggestion" WHERE title IN (${gameValuesList})
) TO STDOUT;

-- Export web3 game update suggestions
COPY (
  SELECT * FROM "GameUpdateSuggestion" WHERE "gameValue" IN (${gameValuesList})
) TO STDOUT;
`;

  return header + exportQueries;
}

createBackup()
  .then(() => {
    console.log('\n\x1b[32mBackup process completed successfully!\x1b[0m\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n\x1b[31m✗ Backup failed!\x1b[0m');
    console.error(error.message);
    process.exit(1);
  });
