# Database Backup & Restore Scripts

Shell scripts for backing up and restoring your PostgreSQL database.

## Prerequisites

- PostgreSQL client tools (`pg_dump` and `psql`) must be installed
- `.env` file must be configured with `DATABASE_URL`

## Usage

### Creating a Backup

Create a SQL dump of your database:

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
