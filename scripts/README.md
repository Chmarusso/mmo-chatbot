# Database Backup & Restore Scripts

Shell scripts for backing up and restoring your PostgreSQL database.

## Quick Reference

```bash
# Full database backup
npm run db:dump

# Games-only backup (GameCategory, Game)
npm run db:dump:games

# Restore a backup
npm run db:restore backups/mmo_match_20250111_143022.sql.gz

# Upload backup to VPS
npm run upload:db backups/mmo_match_20250111_143022.sql.gz
npm run upload:db:games backups/games_20250111_143022.sql.gz
```

## Prerequisites

- PostgreSQL client tools (`pg_dump` and `psql`) must be installed
- `.env` file must be configured with `DATABASE_URL`

## Usage

### Creating a Full Database Backup

Create a SQL dump of your entire database:

```bash
# Using npm script (recommended)
npm run db:dump

# Or directly
./scripts/db-dump.sh
```

This will:
- Create a timestamped SQL file in `./backups/`
- Create a compressed `.sql.gz` version
- Show the file size and list recent backups

### Creating a Games-Only Backup

Create a SQL dump of game catalog tables only (GameCategory, Game):

```bash
# Using npm script (recommended)
npm run db:dump:games

# Or directly
./scripts/db-dump-games.sh
```

This will:
- Create a timestamped `games_*.sql` file in `./backups/`
- Create a compressed `.sql.gz` version
- Show the file size and list recent game backups

**Use this when you want to:**
- Transfer game data to your VPS without user data
- Share game catalog with other instances
- Backup only game-related changes

**Example output:**
```
Starting database backup...
Database: mmo_match
Host: localhost:5432
User: postgres

Creating backup: ./backups/mmo_match_20250111_143022.sql
✓ Backup completed successfully!
File: ./backups/mmo_match_20250111_143022.sql
Size: 2.3M

Compressing backup...
✓ Compressed backup created!
File: ./backups/mmo_match_20250111_143022.sql.gz
Size: 512K
```

### Restoring from a Backup

List available backups:

```bash
npm run db:restore
```

Restore a specific backup:

```bash
# Restore from uncompressed SQL file
npm run db:restore backups/mmo_match_20250111_143022.sql

# Or restore from compressed file
npm run db:restore backups/mmo_match_20250111_143022.sql.gz
```

**⚠️ WARNING:** Restoring will **OVERWRITE** your current database. You will be prompted to confirm before proceeding.

## Backup File Format

Backup files are named with the following pattern:
```
mmo_match_YYYYMMDD_HHMMSS.sql
mmo_match_YYYYMMDD_HHMMSS.sql.gz (compressed)
```

Where:
- `YYYYMMDD` - Date (e.g., 20250111)
- `HHMMSS` - Time (e.g., 143022)

## Backup Directory

All backups are stored in `./backups/` directory, which is automatically created if it doesn't exist.

**Recommendation:** Add `backups/` to your `.gitignore` to avoid committing database dumps to version control.

## Tips

### Automated Backups

Add a cron job to automatically backup your database:

```bash
# Backup every day at 2 AM
0 2 * * * cd /path/to/mmo-playas && npm run db:dump
```

### Backup Before Migrations

Always backup before running database migrations:

```bash
npm run db:dump
npx prisma migrate dev
```

### Transfer Backups

Copy a backup to another server:

```bash
# Using scp
scp backups/mmo_match_20250111_143022.sql.gz user@server:/path/

# On remote server
npm run db:restore mmo_match_20250111_143022.sql.gz
```

### Loading Games Data on VPS

To transfer and load game data (without user data) to your VPS:

#### Step 1: Create a games-only backup locally

```bash
npm run db:dump:games
```

This creates a file like `backups/games_20250111_143022.sql.gz`

#### Step 2: Upload to VPS

```bash
# Upload the compressed backup
scp backups/games_20250111_143022.sql.gz apifullstak:/home/deploy/mmoplaya-app/backups/

# Or use the upload script (note: it uploads to the same destination)
npm run upload:db:games backups/games_20250111_143022.sql.gz
```

#### Step 3: Load on VPS

SSH into your VPS and run:

```bash
ssh apifullstak
cd /home/deploy/mmoplaya-app

# Method 1: Using psql directly with compressed file
gunzip -c backups/games_20250111_143022.sql.gz | psql $DATABASE_URL

# Method 2: Using psql with uncompressed file
# First uncompress if needed
gunzip backups/games_20250111_143022.sql.gz
psql $DATABASE_URL < backups/games_20250111_143022.sql

# Method 3: Using the restore script (if available on VPS)
npm run db:restore backups/games_20250111_143022.sql.gz
```

**Important Notes:**
- The games dump uses `--clean --if-exists` flags, so it will safely replace existing game metadata
- It now excludes ratings, comments, clicks, and other user-generated tables
- The dump includes all game embeddings for semantic search
- Make sure your VPS has the required PostgreSQL extensions installed (like pgvector for embeddings)

### Regenerating Game Embeddings

Whenever you add or significantly edit games, refresh their vector embeddings so similarity search stays accurate:

```bash
npm run generate:game-embeddings
```

This executes `scripts/generate-game-embeddings.ts`, which reads every game from the database, calls OpenAI’s `text-embedding-3-small` model (1536 dimensions), and writes the vectors plus metadata back to the `Game` table.

**Before you run it**
- Ensure `OPENAI_API_KEY` is set in your environment.
- The script prompts before overwriting existing embeddings.
- Run it against your local database, validate the results (e.g., `npm run db:dump:games` or `npm run generate:game-embeddings` followed by `scripts/verify-embeddings.ts`), then push the updated `Game` data to the VPS if needed.

#### Verifying the Import

After importing, verify the data:

```bash
# Connect to the database
psql $DATABASE_URL

# Check game counts
SELECT COUNT(*) FROM "Game";
SELECT COUNT(*) FROM "GameCategory";
-- Ratings/comments are excluded from the games-only dump; check them separately if restored

# Exit psql
\q
```

### Inspect a Backup

View the contents without restoring:

```bash
# Uncompressed
less backups/mmo_match_20250111_143022.sql

# Compressed
zless backups/mmo_match_20250111_143022.sql.gz
```

## Troubleshooting

### pg_dump: command not found

Install PostgreSQL client tools:

```bash
# macOS (Homebrew)
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
# Download from https://www.postgresql.org/download/windows/
```

### Authentication Failed

Verify your `DATABASE_URL` in `.env` is correct:

```
DATABASE_URL="postgresql://username:password@host:port/database"
```

### Permission Denied

Make sure scripts are executable:

```bash
chmod +x scripts/db-dump.sh scripts/db-restore.sh
```
