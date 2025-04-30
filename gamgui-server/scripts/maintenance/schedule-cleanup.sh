#!/bin/bash

# Script to schedule periodic cleanup of old sessions
# This script can be added to crontab to run at regular intervals

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"

echo -e "${GREEN}=== Scheduling cleanup of old sessions ===${NC}"
echo "Project root: $PROJECT_ROOT"

# Check if node is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed${NC}"
  exit 1
fi

# Set environment variables for the cleanup script
export MAX_SESSION_AGE_HOURS=${MAX_SESSION_AGE_HOURS:-24}  # Default: 24 hours
export DRY_RUN=${DRY_RUN:-false}                          # Default: false (actually delete)

echo -e "${YELLOW}Configuration:${NC}"
echo "MAX_SESSION_AGE_HOURS: $MAX_SESSION_AGE_HOURS"
echo "DRY_RUN: $DRY_RUN"

# Run the cleanup script
echo -e "${YELLOW}Running cleanup script...${NC}"
node "$PROJECT_ROOT/scripts/maintenance/cleanup-old-sessions.js"

# Check if the script ran successfully
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Cleanup completed successfully${NC}"
else
  echo -e "${RED}Cleanup failed${NC}"
  exit 1
fi

# Instructions for setting up cron job
echo -e "${YELLOW}To schedule this script to run automatically, add the following line to your crontab:${NC}"
echo "0 0 * * * $SCRIPT_DIR/schedule-cleanup.sh > /tmp/gamgui-cleanup.log 2>&1"
echo -e "${YELLOW}This will run the cleanup script every day at midnight.${NC}"
echo -e "${YELLOW}To edit your crontab, run:${NC}"
echo "crontab -e"
