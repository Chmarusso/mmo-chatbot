#!/bin/bash

# Deployment script for MMOPLAYA
# Syncs files to VPS using rsync

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_USER="deploy"
VPS_HOST="apifullstak"
VPS_PATH="/home/deploy/mmoplaya-app"
VPS_PORT="22"

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}   MMOPLAYA Deployment Script${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Test SSH connection
echo -e "${YELLOW}Testing SSH connection to ${VPS_HOST}...${NC}"
if ! ssh -q -o BatchMode=yes -o ConnectTimeout=5 ${VPS_HOST} exit; then
  echo -e "${RED}Error: Cannot connect to ${VPS_HOST}${NC}"
  echo "Make sure 'apifullstak' is configured in your ~/.ssh/config"
  exit 1
fi
echo -e "${GREEN}✓ SSH connection successful${NC}"
echo ""

echo -e "${YELLOW}Target:${NC} ${VPS_USER}@${VPS_HOST}:${VPS_PATH}"
echo ""

# Confirm deployment
read -p "Continue with deployment? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo -e "${YELLOW}Deployment cancelled.${NC}"
  exit 0
fi

echo -e "${YELLOW}Step 1: Building production bundle...${NC}"
pnpm build

echo ""
echo -e "${YELLOW}Step 2: Syncing files to VPS...${NC}"

# Sync files using rsync
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env*' \
  --exclude 'backups' \
  --exclude 'logs' \
  --exclude 'public/uploads' \
  --exclude 'test-results' \
  --exclude 'playwright-report' \
  --exclude '.claude' \
  -e "ssh" \
  ./ ${VPS_HOST}:${VPS_PATH}/

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ Files synced successfully!${NC}"
else
  echo ""
  echo -e "${RED}✗ Sync failed!${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Installing dependencies on VPS...${NC}"

ssh ${VPS_HOST} << 'ENDSSH'
cd /home/deploy/mmoplaya-app
echo "Installing dependencies..."
pnpm install --frozen-lockfile
echo "Dependencies installed."
ENDSSH

echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}   Deployment completed!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "${YELLOW}Next steps on VPS:${NC}"
echo "  1. Set up .env file with production values"
echo "  2. Run database migrations: pnpm prisma migrate deploy"
echo "  3. Seed the database: pnpm db:seed"
echo "  4. Start the application: pnpm start"
echo ""
