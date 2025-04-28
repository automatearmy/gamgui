#!/bin/bash
# Script to deploy the fixed server to Cloud Run

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Deploying Fixed Server to Cloud Run ===${NC}"

# Check if the fixed files exist
if [ ! -f "gamgui-server/services/container/KubernetesAdapter-fixed.js" ]; then
  echo -e "${RED}Error: Fixed KubernetesAdapter.js file not found${NC}"
  exit 1
fi

if [ ! -f "gamgui-server/utils/kubernetesClient-fixed.js" ]; then
  echo -e "${RED}Error: Fixed kubernetesClient.js file not found${NC}"
  exit 1
fi

if [ ! -f "../gamgui-terraform/scripts/manage-websocket-sessions-fixed.sh" ]; then
  echo -e "${RED}Error: Fixed manage-websocket-sessions.sh script not found${NC}"
  exit 1
fi

# Backup original files
echo -e "${YELLOW}Backing up original files...${NC}"
cp gamgui-server/services/container/KubernetesAdapter.js gamgui-server/services/container/KubernetesAdapter.js.bak
cp gamgui-server/utils/kubernetesClient.js gamgui-server/utils/kubernetesClient.js.bak
cp ../gamgui-terraform/scripts/manage-websocket-sessions.sh ../gamgui-terraform/scripts/manage-websocket-sessions.sh.bak

# Replace original files with fixed versions
echo -e "${YELLOW}Replacing original files with fixed versions...${NC}"
cp gamgui-server/services/container/KubernetesAdapter-fixed.js gamgui-server/services/container/KubernetesAdapter.js
cp gamgui-server/utils/kubernetesClient-fixed.js gamgui-server/utils/kubernetesClient.js
cp ../gamgui-terraform/scripts/manage-websocket-sessions-fixed.sh ../gamgui-terraform/scripts/manage-websocket-sessions.sh

# Make the script executable
chmod +x ../gamgui-terraform/scripts/manage-websocket-sessions.sh

# Build and deploy the server
echo -e "${YELLOW}Building and deploying the server...${NC}"
./build-and-push-server.sh

echo -e "${GREEN}=== Server Deployed Successfully ===${NC}"
echo -e "${YELLOW}The server has been deployed with the fixed WebSocket pod configuration.${NC}"
echo -e "${YELLOW}You can now create new sessions through the API and they should start successfully.${NC}"
