#!/bin/bash

# Database backup script for MMOPLAYA - Games Only
# Creates timestamped SQL dumps of game-related tables only

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/games_${TIMESTAMP}.sql"

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
# Format: postgresql://user:password@host:port/database
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

echo -e "${YELLOW}Starting games database backup...${NC}"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""
echo -e "${YELLOW}Tables to backup:${NC}"
echo "  - GameCategory (categories)"
echo "  - Game (games with embeddings)"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Perform the backup
export PGPASSWORD="$DB_PASS"

echo -e "${YELLOW}Creating backup: $BACKUP_FILE${NC}"

# Dump only game-related tables
pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=plain \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
--table='"GameCategory"' \
--table='"Game"' \
--file="$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo -e "${GREEN}✓ Backup completed successfully!${NC}"
  echo "File: $BACKUP_FILE"
  echo "Size: $BACKUP_SIZE"
  echo ""

  # Also create a compressed version
  COMPRESSED_FILE="${BACKUP_FILE}.gz"
  echo -e "${YELLOW}Compressing backup...${NC}"
  gzip -c "$BACKUP_FILE" > "$COMPRESSED_FILE"
  COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
  echo -e "${GREEN}✓ Compressed backup created!${NC}"
  echo "File: $COMPRESSED_FILE"
  echo "Size: $COMPRESSED_SIZE"
  echo ""

  # List recent game backups
  echo -e "${YELLOW}Recent game backups:${NC}"
  ls -lht "$BACKUP_DIR" | grep "games_" | head -6

else
  echo -e "${RED}✗ Backup failed!${NC}"
  exit 1
fi

unset PGPASSWORD
