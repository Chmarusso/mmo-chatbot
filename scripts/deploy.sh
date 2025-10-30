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
if ! ssh -q -o BatchMode=yes -o ConnectTimeout=5 ${VPS_USER}@${VPS_HOST} exit; then
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
  -e "ssh -p ${VPS_PORT}" \
  ./ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/

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

ssh -T -p "${VPS_PORT}" ${VPS_USER}@${VPS_HOST} <<'ENDSSH'
set -e
cd /home/deploy/mmoplaya-app

# Load user environment so nvm/pnpm are available for non-login sessions
if [ -f "$HOME/.bash_profile" ]; then
  . "$HOME/.bash_profile"
elif [ -f "$HOME/.profile" ]; then
  . "$HOME/.profile"
elif [ -f "$HOME/.bashrc" ]; then
  . "$HOME/.bashrc"
fi

# Ensure nvm (if installed) exports node/npm
if [ -f "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
fi

PACKAGE_MANAGER=""
INSTALL_CMD=""
BUILD_CMD=""

if command -v pnpm >/dev/null 2>&1; then
  PACKAGE_MANAGER="pnpm"
  INSTALL_CMD="pnpm install --frozen-lockfile --prod"
  BUILD_CMD="pnpm build"
elif command -v npm >/dev/null 2>&1; then
  PACKAGE_MANAGER="npm"
  INSTALL_CMD="npm install"
  BUILD_CMD="npm run build"
else
  echo "Error: Neither pnpm nor npm is available on the remote host."
  exit 1
fi

echo "-> $(date '+%Y-%m-%d %H:%M:%S') Using ${PACKAGE_MANAGER} to install production dependencies..."
eval "${INSTALL_CMD}"

echo "-> $(date '+%Y-%m-%d %H:%M:%S') Building production bundle on VPS..."
eval "${BUILD_CMD}"

echo "-> $(date '+%Y-%m-%d %H:%M:%S') Restarting PM2 process..."
pm2 reload mmoplaya-app || pm2 restart mmoplaya-app

echo "-> $(date '+%Y-%m-%d %H:%M:%S') Deployment tasks completed."
ENDSSH

echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}   Deployment completed!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "${YELLOW}Next steps on VPS:${NC}"
echo "  1. Ensure the .env file is updated with production values"
echo "  2. Run database migrations: npx prisma migrate deploy"
echo "  3. Seed the database if needed: npm run db:seed"
echo "  4. Confirm PM2 status: pm2 status mmoplaya-app"
echo ""
