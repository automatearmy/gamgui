#!/bin/bash
# Script to check WebSocket configuration in the server

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Checking WebSocket Configuration ===${NC}"

# Check if the .env file exists
if [ ! -f .env ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  echo -e "${YELLOW}Make sure you are in the gamgui-server directory${NC}"
  exit 1
fi

# Check if the WebSocket environment variables are set
echo -e "${YELLOW}Checking WebSocket environment variables...${NC}"

# Check WEBSOCKET_ENABLED
WEBSOCKET_ENABLED=$(grep "^WEBSOCKET_ENABLED=" .env | cut -d= -f2)
if [ -z "${WEBSOCKET_ENABLED}" ]; then
  echo -e "${RED}Error: WEBSOCKET_ENABLED is not set in .env${NC}"
  echo -e "${YELLOW}Add WEBSOCKET_ENABLED=true to .env${NC}"
else
  echo -e "${GREEN}WEBSOCKET_ENABLED=${WEBSOCKET_ENABLED}${NC}"
fi

# Check WEBSOCKET_PROXY_SERVICE_URL
WEBSOCKET_PROXY_SERVICE_URL=$(grep "^WEBSOCKET_PROXY_SERVICE_URL=" .env | cut -d= -f2)
if [ -z "${WEBSOCKET_PROXY_SERVICE_URL}" ]; then
  echo -e "${RED}Error: WEBSOCKET_PROXY_SERVICE_URL is not set in .env${NC}"
  echo -e "${YELLOW}Add WEBSOCKET_PROXY_SERVICE_URL=websocket-proxy.gamgui.svc.cluster.local to .env${NC}"
else
  echo -e "${GREEN}WEBSOCKET_PROXY_SERVICE_URL=${WEBSOCKET_PROXY_SERVICE_URL}${NC}"
fi

# Check WEBSOCKET_SESSION_CONNECTION_TEMPLATE
WEBSOCKET_SESSION_CONNECTION_TEMPLATE=$(grep "^WEBSOCKET_SESSION_CONNECTION_TEMPLATE=" .env | cut -d= -f2)
if [ -z "${WEBSOCKET_SESSION_CONNECTION_TEMPLATE}" ]; then
  echo -e "${RED}Error: WEBSOCKET_SESSION_CONNECTION_TEMPLATE is not set in .env${NC}"
  echo -e "${YELLOW}Add WEBSOCKET_SESSION_CONNECTION_TEMPLATE=ws://websocket-proxy.gamgui.svc.cluster.local/ws/session/{{SESSION_ID}}/ to .env${NC}"
else
  echo -e "${GREEN}WEBSOCKET_SESSION_CONNECTION_TEMPLATE=${WEBSOCKET_SESSION_CONNECTION_TEMPLATE}${NC}"
fi

# Check WEBSOCKET_SESSION_PATH_TEMPLATE
WEBSOCKET_SESSION_PATH_TEMPLATE=$(grep "^WEBSOCKET_SESSION_PATH_TEMPLATE=" .env | cut -d= -f2)
if [ -z "${WEBSOCKET_SESSION_PATH_TEMPLATE}" ]; then
  echo -e "${RED}Error: WEBSOCKET_SESSION_PATH_TEMPLATE is not set in .env${NC}"
  echo -e "${YELLOW}Add WEBSOCKET_SESSION_PATH_TEMPLATE=/ws/session/{{SESSION_ID}}/ to .env${NC}"
else
  echo -e "${GREEN}WEBSOCKET_SESSION_PATH_TEMPLATE=${WEBSOCKET_SESSION_PATH_TEMPLATE}${NC}"
fi

# Check WEBSOCKET_MAX_SESSIONS
WEBSOCKET_MAX_SESSIONS=$(grep "^WEBSOCKET_MAX_SESSIONS=" .env | cut -d= -f2)
if [ -z "${WEBSOCKET_MAX_SESSIONS}" ]; then
  echo -e "${RED}Error: WEBSOCKET_MAX_SESSIONS is not set in .env${NC}"
  echo -e "${YELLOW}Add WEBSOCKET_MAX_SESSIONS=50 to .env${NC}"
else
  echo -e "${GREEN}WEBSOCKET_MAX_SESSIONS=${WEBSOCKET_MAX_SESSIONS}${NC}"
fi

# Check if the server is using the WebSocket configuration
echo -e "${YELLOW}Checking server code for WebSocket usage...${NC}"

# Check if the server is importing the WebSocket configuration
if ! grep -q "WEBSOCKET_ENABLED" server.js; then
  echo -e "${RED}Error: server.js is not importing WEBSOCKET_ENABLED${NC}"
else
  echo -e "${GREEN}server.js is importing WEBSOCKET_ENABLED${NC}"
fi

# Check if the server is using the WebSocket configuration
if ! grep -q "WEBSOCKET_PROXY_SERVICE_URL" server.js; then
  echo -e "${RED}Error: server.js is not using WEBSOCKET_PROXY_SERVICE_URL${NC}"
else
  echo -e "${GREEN}server.js is using WEBSOCKET_PROXY_SERVICE_URL${NC}"
fi

# Check if the server is using the WebSocket configuration
if ! grep -q "WEBSOCKET_SESSION_CONNECTION_TEMPLATE" server.js; then
  echo -e "${RED}Error: server.js is not using WEBSOCKET_SESSION_CONNECTION_TEMPLATE${NC}"
else
  echo -e "${GREEN}server.js is using WEBSOCKET_SESSION_CONNECTION_TEMPLATE${NC}"
fi

# Check if the server is using the WebSocket configuration
if ! grep -q "WEBSOCKET_SESSION_PATH_TEMPLATE" server.js; then
  echo -e "${RED}Error: server.js is not using WEBSOCKET_SESSION_PATH_TEMPLATE${NC}"
else
  echo -e "${GREEN}server.js is using WEBSOCKET_SESSION_PATH_TEMPLATE${NC}"
fi

# Check if the server is using the WebSocket configuration
if ! grep -q "WEBSOCKET_MAX_SESSIONS" server.js; then
  echo -e "${RED}Error: server.js is not using WEBSOCKET_MAX_SESSIONS${NC}"
else
  echo -e "${GREEN}server.js is using WEBSOCKET_MAX_SESSIONS${NC}"
fi

# Check if the server is using the WebSocket configuration in the session service
echo -e "${YELLOW}Checking session service for WebSocket usage...${NC}"

# Check if the session service is using the WebSocket configuration
if ! grep -q "websocketPath" services/session/SessionService.js; then
  echo -e "${RED}Error: SessionService.js is not using websocketPath${NC}"
else
  echo -e "${GREEN}SessionService.js is using websocketPath${NC}"
fi

# Check if the session service is using the WebSocket configuration
if ! grep -q "getWebsocketInfo" services/session/SessionService.js; then
  echo -e "${RED}Error: SessionService.js is not implementing getWebsocketInfo${NC}"
else
  echo -e "${GREEN}SessionService.js is implementing getWebsocketInfo${NC}"
fi

# Check if the session routes are exposing the WebSocket information
echo -e "${YELLOW}Checking session routes for WebSocket usage...${NC}"

# Check if the session routes are exposing the WebSocket information
if ! grep -q "websocketInfo" routes/sessionRoutes.js; then
  echo -e "${RED}Error: sessionRoutes.js is not exposing websocketInfo${NC}"
else
  echo -e "${GREEN}sessionRoutes.js is exposing websocketInfo${NC}"
fi

# Check if the session routes are exposing the WebSocket information
if ! grep -q "/:id/websocket" routes/sessionRoutes.js; then
  echo -e "${RED}Error: sessionRoutes.js is not implementing /:id/websocket endpoint${NC}"
else
  echo -e "${GREEN}sessionRoutes.js is implementing /:id/websocket endpoint${NC}"
fi

echo -e "${GREEN}=== WebSocket Configuration Check Completed ===${NC}"
echo -e "${YELLOW}If you see any errors, fix them and restart the server.${NC}"
echo -e "${YELLOW}If all checks pass, the WebSocket configuration should be correct.${NC}"
