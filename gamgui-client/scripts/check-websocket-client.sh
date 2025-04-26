#!/bin/bash
# Script to check WebSocket configuration in the client

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Checking WebSocket Client Configuration ===${NC}"

# Check if the src directory exists
if [ ! -d src ]; then
  echo -e "${RED}Error: src directory not found${NC}"
  echo -e "${YELLOW}Make sure you are in the gamgui-client directory${NC}"
  exit 1
fi

# Check if the socket.ts file exists
if [ ! -f src/lib/socket.ts ]; then
  echo -e "${RED}Error: src/lib/socket.ts file not found${NC}"
  exit 1
fi

# Check if the api.ts file exists
if [ ! -f src/lib/api.ts ]; then
  echo -e "${RED}Error: src/lib/api.ts file not found${NC}"
  exit 1
fi

# Check if the [id].tsx file exists
if [ ! -f src/pages/sessions/[id].tsx ]; then
  echo -e "${RED}Error: src/pages/sessions/[id].tsx file not found${NC}"
  exit 1
fi

# Check if the socket.ts file is using the WebSocket configuration
echo -e "${YELLOW}Checking socket.ts for WebSocket usage...${NC}"

# Check if the socket.ts file is implementing createSessionWebsocket
if ! grep -q "createSessionWebsocket" src/lib/socket.ts; then
  echo -e "${RED}Error: socket.ts is not implementing createSessionWebsocket${NC}"
else
  echo -e "${GREEN}socket.ts is implementing createSessionWebsocket${NC}"
fi

# Check if the socket.ts file is using the WebSocket configuration
if ! grep -q "getSocketUrl" src/lib/socket.ts; then
  echo -e "${RED}Error: socket.ts is not using getSocketUrl${NC}"
else
  echo -e "${GREEN}socket.ts is using getSocketUrl${NC}"
fi

# Check if the api.ts file is implementing getSessionWebsocketInfo
echo -e "${YELLOW}Checking api.ts for WebSocket usage...${NC}"

# Check if the api.ts file is implementing getSessionWebsocketInfo
if ! grep -q "getSessionWebsocketInfo" src/lib/api.ts; then
  echo -e "${RED}Error: api.ts is not implementing getSessionWebsocketInfo${NC}"
else
  echo -e "${GREEN}api.ts is implementing getSessionWebsocketInfo${NC}"
fi

# Check if the api.ts file is implementing getSocketUrl
if ! grep -q "getSocketUrl" src/lib/api.ts; then
  echo -e "${RED}Error: api.ts is not implementing getSocketUrl${NC}"
else
  echo -e "${GREEN}api.ts is implementing getSocketUrl${NC}"
fi

# Check if the [id].tsx file is using the WebSocket configuration
echo -e "${YELLOW}Checking [id].tsx for WebSocket usage...${NC}"

# Check if the [id].tsx file is using createSessionWebsocket
if ! grep -q "createSessionWebsocket" src/pages/sessions/[id].tsx; then
  echo -e "${RED}Error: [id].tsx is not using createSessionWebsocket${NC}"
else
  echo -e "${GREEN}[id].tsx is using createSessionWebsocket${NC}"
fi

# Check if the [id].tsx file is using getSessionWebsocketInfo
if ! grep -q "getSessionWebsocketInfo" src/pages/sessions/[id].tsx; then
  echo -e "${RED}Error: [id].tsx is not using getSessionWebsocketInfo${NC}"
else
  echo -e "${GREEN}[id].tsx is using getSessionWebsocketInfo${NC}"
fi

# Check if the [id].tsx file is handling WebSocket errors
if ! grep -q "websocketInfo.error" src/pages/sessions/[id].tsx; then
  echo -e "${RED}Error: [id].tsx is not handling WebSocket errors${NC}"
else
  echo -e "${GREEN}[id].tsx is handling WebSocket errors${NC}"
fi

# Check if the [id].tsx file is checking for WebSocket info
if ! grep -q "websocketInfo.kubernetes" src/pages/sessions/[id].tsx; then
  echo -e "${RED}Error: [id].tsx is not checking for WebSocket info${NC}"
else
  echo -e "${GREEN}[id].tsx is checking for WebSocket info${NC}"
fi

# Check if the [id].tsx file is checking for WebSocket path
if ! grep -q "websocketInfo.websocketPath" src/pages/sessions/[id].tsx; then
  echo -e "${RED}Error: [id].tsx is not checking for WebSocket path${NC}"
else
  echo -e "${GREEN}[id].tsx is checking for WebSocket path${NC}"
fi

echo -e "${GREEN}=== WebSocket Client Configuration Check Completed ===${NC}"
echo -e "${YELLOW}If you see any errors, fix them and rebuild the client.${NC}"
echo -e "${YELLOW}If all checks pass, the WebSocket client configuration should be correct.${NC}"
