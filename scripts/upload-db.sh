#!/bin/bash

# Upload database dump to VPS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="apifullstak"
VPS_PATH="/home/deploy/mmoplaya-app/backups"
LOCAL_BACKUP_DIR="./backups"

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}   Upload Database Dump to VPS${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Check if backups directory exists locally
if [ ! -d "$LOCAL_BACKUP_DIR" ]; then
  echo -e "${RED}Error: Local backups directory not found${NC}"
  echo "Please create a backup first: pnpm db:dump"
  exit 1
fi

# List available backups
echo -e "${YELLOW}Available backups:${NC}"
echo ""
ls -lht "$LOCAL_BACKUP_DIR" | grep -E "\.sql(\.gz)?$" | head -10
echo ""

# Check if backup file was provided
if [ -z "$1" ]; then
  echo -e "${YELLOW}Usage:${NC}"
  echo "  pnpm upload:db <backup-file>"
  echo ""
  echo "Examples:"
  echo "  pnpm upload:db backups/mmo_match_20250111_120000.sql.gz"
  echo "  pnpm upload:db backups/mmo_match_20250111_120000.sql"
  exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
  exit 1
fi

FILENAME=$(basename "$BACKUP_FILE")

echo -e "${YELLOW}Uploading:${NC} $BACKUP_FILE"
echo -e "${YELLOW}Target:${NC} ${VPS_HOST}:${VPS_PATH}/${FILENAME}"
echo ""

# Confirm upload
read -p "Continue with upload? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo -e "${YELLOW}Upload cancelled.${NC}"
  exit 0
fi

# Create backups directory on VPS if it doesn't exist
echo -e "${YELLOW}Creating backups directory on VPS...${NC}"
ssh ${VPS_HOST} "mkdir -p ${VPS_PATH}"

# Upload file using rsync
echo -e "${YELLOW}Uploading backup file...${NC}"
rsync -avz --progress "$BACKUP_FILE" ${VPS_HOST}:${VPS_PATH}/

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ Backup uploaded successfully!${NC}"
  echo ""
  echo -e "${YELLOW}To restore on VPS:${NC}"
  echo "  ssh ${VPS_HOST}"
  echo "  cd /home/deploy/mmoplaya-app"
  echo ""
  if [[ "$FILENAME" == *.gz ]]; then
    echo "  # Restore from compressed file:"
    echo "  gunzip -c backups/${FILENAME} | psql \$DATABASE_URL"
  else
    echo "  # Restore from SQL file:"
    echo "  psql \$DATABASE_URL < backups/${FILENAME}"
  fi
  echo ""
  echo "  # Or use the restore script:"
  echo "  ./scripts/db-restore.sh backups/${FILENAME}"
else
  echo ""
  echo -e "${RED}✗ Upload failed!${NC}"
  exit 1
fi
