import { spawn } from 'child_process';
import { createWriteStream, createReadStream } from 'fs';
import { mkdir } from 'fs/promises';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { resolve } from 'path';
import { readdirSync, statSync } from 'fs';

// Load environment variables
import { config } from 'dotenv';
config();

const BACKUP_DIR = resolve(process.cwd(), 'backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').split('.')[0];
const BACKUP_FILE = `${BACKUP_DIR}/mmo_match_${TIMESTAMP}.sql`;
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
      .filter(f => f.endsWith('.sql') || f.endsWith('.sql.gz'))
      .map(f => ({
        name: f,
        path: resolve(BACKUP_DIR, f),
        time: statSync(resolve(BACKUP_DIR, f)).mtime,
        size: statSync(resolve(BACKUP_DIR, f)).size,
      }))
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 5);

    if (files.length > 0) {
      console.log('\n\x1b[33mRecent backups:\x1b[0m');
      files.forEach(f => {
        console.log(`  ${f.name} (${formatBytes(f.size)})`);
      });
    }
  } catch (err) {
    // Directory doesn't exist yet, ignore
  }
}

async function createBackup() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('\x1b[31mError: DATABASE_URL not found in environment\x1b[0m');
    process.exit(1);
  }

  const dbConfig = parseConnectionString(DATABASE_URL);

  console.log('\x1b[33mStarting database backup...\x1b[0m');
  console.log(`Database: ${dbConfig.database}`);
  console.log(`Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`User: ${dbConfig.user}`);
  console.log('');

  // Create backup directory
  await mkdir(BACKUP_DIR, { recursive: true });

  console.log(`\x1b[33mCreating backup: ${BACKUP_FILE}\x1b[0m`);

  // Use pg_dump via child_process
  const pgDump = spawn('pg_dump', [
    '--host', dbConfig.host,
    '--port', dbConfig.port,
    '--username', dbConfig.user,
    '--dbname', dbConfig.database,
    '--format', 'plain',
    '--no-owner',
    '--no-acl',
    '--clean',
    '--if-exists',
  ], {
    env: { ...process.env, PGPASSWORD: dbConfig.password },
  });

  const writeStream = createWriteStream(BACKUP_FILE);

  return new Promise<void>((resolve, reject) => {
    pgDump.stdout.pipe(writeStream);

    pgDump.stderr.on('data', (data) => {
      // pg_dump writes progress to stderr, which is normal
      const message = data.toString();
      if (!message.includes('NOTICE') && !message.includes('pg_dump:')) {
        process.stderr.write(data);
      }
    });

    pgDump.on('error', (error) => {
      reject(new Error(`pg_dump not found. Please install PostgreSQL client tools.\n${error.message}`));
    });

    pgDump.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`pg_dump exited with code ${code}`));
        return;
      }

      try {
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
