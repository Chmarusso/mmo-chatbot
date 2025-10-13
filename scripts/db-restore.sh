#!/bin/bash

# Database restore script for MMO Match
# Restores a SQL dump to the PostgreSQL database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups"

# Parse DATABASE_URL from .env
if [ -f .env ]; then
  # Only export DATABASE_URL, avoiding issues with other env vars
  DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d '=' -f 2- | tr -d '"')
  export DATABASE_URL
else
  echo -e "${RED}Error: .env file not found${NC}"
  exit 1
fi

# Extract database connection details from DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}Error: DATABASE_URL not found in .env${NC}"
  exit 1
fi

# Parse the DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Check if backup file was provided
if [ -z "$1" ]; then
  echo -e "${YELLOW}Available backups:${NC}"
  echo ""
  ls -lht "$BACKUP_DIR" | grep -E "\.sql(\.gz)?$" | head -10
  echo ""
  echo -e "${YELLOW}Usage:${NC}"
  echo "  ./scripts/db-restore.sh <backup-file>"
  echo ""
  echo "Examples:"
  echo "  ./scripts/db-restore.sh backups/mmo_match_20250101_120000.sql"
  echo "  ./scripts/db-restore.sh backups/mmo_match_20250101_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
  exit 1
fi

echo -e "${RED}⚠️  WARNING: This will OVERWRITE the current database!${NC}"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo -e "${YELLOW}Restore cancelled.${NC}"
  exit 0
fi

export PGPASSWORD="$DB_PASS"

echo -e "${YELLOW}Starting database restore...${NC}"

# Check if file is compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo -e "${YELLOW}Decompressing and restoring...${NC}"
  gunzip -c "$BACKUP_FILE" | psql \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --quiet
else
  echo -e "${YELLOW}Restoring from SQL file...${NC}"
  psql \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --file="$BACKUP_FILE" \
    --quiet
fi

# Check if restore was successful
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Database restored successfully!${NC}"
else
  echo -e "${RED}✗ Restore failed!${NC}"
  exit 1
fi

unset PGPASSWORD
