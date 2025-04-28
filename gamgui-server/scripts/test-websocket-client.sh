#!/bin/bash
# Script to test WebSocket connection to a GAM session using a Node.js client

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Testing WebSocket Connection ===${NC}"

# Default values
SERVER="ws://localhost:8080"
SESSION_ID="default"
PATH_TEMPLATE="/ws/session/{{SESSION_ID}}/"
VERBOSE=false

# Print the help message
print_help() {
  echo -e "Usage: $0 [options]"
  echo -e ""
  echo -e "Options:"
  echo -e "  --server URL         WebSocket server URL (default: ${SERVER})"
  echo -e "  --session-id ID      Session ID (default: ${SESSION_ID})"
  echo -e "  --path PATH          WebSocket path template (default: ${PATH_TEMPLATE})"
  echo -e "  --verbose            Enable verbose output"
  echo -e "  --help               Show this help message"
  echo -e ""
  echo -e "Example:"
  echo -e "  $0 --server ws://localhost:8080 --session-id user123"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --server)
      SERVER="$2"
      shift
      shift
      ;;
    --session-id)
      SESSION_ID="$2"
      shift
      shift
      ;;
    --path)
      PATH_TEMPLATE="$2"
      shift
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      print_help
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option $1${NC}"
      print_help
      exit 1
      ;;
  esac
done

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed${NC}"
  echo -e "${YELLOW}Please install Node.js to use this script:${NC}"
  echo -e "${GREEN}https://nodejs.org/en/download/${NC}"
  exit 1
fi

# Check if the required Node.js packages are installed
if ! command -v npm &> /dev/null; then
  echo -e "${RED}Error: npm is not installed${NC}"
  echo -e "${YELLOW}Please install npm to use this script:${NC}"
  echo -e "${GREEN}https://www.npmjs.com/get-npm${NC}"
  exit 1
fi

# Check if the WebSocket client script exists
if [ ! -f "$(dirname "$0")/test-websocket-client.js" ]; then
  echo -e "${RED}Error: WebSocket client script not found${NC}"
  echo -e "${YELLOW}Please make sure the script is in the same directory as this script${NC}"
  exit 1
fi

# Install required Node.js packages if they don't exist
if ! npm list -g ws &> /dev/null || ! npm list -g commander &> /dev/null; then
  echo -e "${YELLOW}Installing required Node.js packages...${NC}"
  npm install -g ws commander
fi

# Build the command
CMD="node $(dirname "$0")/test-websocket-client.js --server ${SERVER} --session-id ${SESSION_ID} --path ${PATH_TEMPLATE}"

if [ "$VERBOSE" = true ]; then
  CMD="${CMD} --verbose"
fi

# Run the WebSocket client
echo -e "${YELLOW}Running WebSocket client...${NC}"
echo -e "${YELLOW}Server: ${SERVER}${NC}"
echo -e "${YELLOW}Session ID: ${SESSION_ID}${NC}"
echo -e "${YELLOW}Path: ${PATH_TEMPLATE}${NC}"
echo -e "${YELLOW}Command: ${CMD}${NC}"
echo -e "${GREEN}=== WebSocket Client Started ===${NC}"

eval ${CMD}
