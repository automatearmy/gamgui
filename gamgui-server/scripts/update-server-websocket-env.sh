#!/bin/bash
# Script to update the server environment variables for WebSocket support

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Updating Server WebSocket Environment Variables ===${NC}"

# Default values
SERVICE_NAME="gamgui-server"
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
WEBSOCKET_ENABLED="true"
WEBSOCKET_PROXY_SERVICE_URL="websocket-proxy.gamgui.svc.cluster.local"
WEBSOCKET_SESSION_CONNECTION_TEMPLATE="ws://websocket-proxy.gamgui.svc.cluster.local/ws/session/{{SESSION_ID}}/"
WEBSOCKET_SESSION_PATH_TEMPLATE="/ws/session/{{SESSION_ID}}/"
WEBSOCKET_MAX_SESSIONS="50"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --service)
      SERVICE_NAME="$2"
      shift
      shift
      ;;
    --project)
      PROJECT_ID="$2"
      shift
      shift
      ;;
    --region)
      REGION="$2"
      shift
      shift
      ;;
    --websocket-enabled)
      WEBSOCKET_ENABLED="$2"
      shift
      shift
      ;;
    --websocket-proxy-url)
      WEBSOCKET_PROXY_SERVICE_URL="$2"
      shift
      shift
      ;;
    --websocket-connection-template)
      WEBSOCKET_SESSION_CONNECTION_TEMPLATE="$2"
      shift
      shift
      ;;
    --websocket-path-template)
      WEBSOCKET_SESSION_PATH_TEMPLATE="$2"
      shift
      shift
      ;;
    --websocket-max-sessions)
      WEBSOCKET_MAX_SESSIONS="$2"
      shift
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --service NAME                  Cloud Run service name (default: gamgui-server)"
      echo "  --project ID                    Google Cloud project ID (default: current project)"
      echo "  --region REGION                 Google Cloud region (default: us-central1)"
      echo "  --websocket-enabled BOOL        Whether WebSocket sessions are enabled (default: true)"
      echo "  --websocket-proxy-url URL       WebSocket proxy service URL (default: websocket-proxy.gamgui.svc.cluster.local)"
      echo "  --websocket-connection-template TEMPLATE  WebSocket session connection template (default: ws://websocket-proxy.gamgui.svc.cluster.local/ws/session/{{SESSION_ID}}/)"
      echo "  --websocket-path-template TEMPLATE        WebSocket session path template (default: /ws/session/{{SESSION_ID}}/)"
      echo "  --websocket-max-sessions NUM    Maximum number of concurrent WebSocket sessions (default: 50)"
      echo "  --help                          Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${YELLOW}Service Name: ${SERVICE_NAME}${NC}"
echo -e "${YELLOW}Project ID: ${PROJECT_ID}${NC}"
echo -e "${YELLOW}Region: ${REGION}${NC}"
echo -e "${YELLOW}WebSocket Enabled: ${WEBSOCKET_ENABLED}${NC}"
echo -e "${YELLOW}WebSocket Proxy URL: ${WEBSOCKET_PROXY_SERVICE_URL}${NC}"
echo -e "${YELLOW}WebSocket Connection Template: ${WEBSOCKET_SESSION_CONNECTION_TEMPLATE}${NC}"
echo -e "${YELLOW}WebSocket Path Template: ${WEBSOCKET_SESSION_PATH_TEMPLATE}${NC}"
echo -e "${YELLOW}WebSocket Max Sessions: ${WEBSOCKET_MAX_SESSIONS}${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}Error: gcloud is not installed${NC}"
  exit 1
fi

# Check if the service exists
if ! gcloud run services describe $SERVICE_NAME --project=$PROJECT_ID --region=$REGION &> /dev/null; then
  echo -e "${RED}Error: Service ${SERVICE_NAME} does not exist in project ${PROJECT_ID} and region ${REGION}${NC}"
  exit 1
fi

# Get the current environment variables
echo -e "${YELLOW}Getting current environment variables...${NC}"
ENV_VARS=$(gcloud run services describe $SERVICE_NAME --project=$PROJECT_ID --region=$REGION --format="value(spec.template.spec.containers[0].env)")

# Create a temporary file for the environment variables
TEMP_FILE=$(mktemp)

# Parse the environment variables
echo "$ENV_VARS" | while IFS= read -r line; do
  if [[ $line =~ name:\ ([^,]+),\ value:\ (.+) ]]; then
    NAME="${BASH_REMATCH[1]}"
    VALUE="${BASH_REMATCH[2]}"
    
    # Skip WebSocket environment variables
    if [[ $NAME == WEBSOCKET_* ]]; then
      continue
    fi
    
    # Add the environment variable to the temporary file
    echo "$NAME=$VALUE" >> $TEMP_FILE
  fi
done

# Add the WebSocket environment variables
echo "WEBSOCKET_ENABLED=$WEBSOCKET_ENABLED" >> $TEMP_FILE
echo "WEBSOCKET_PROXY_SERVICE_URL=$WEBSOCKET_PROXY_SERVICE_URL" >> $TEMP_FILE
echo "WEBSOCKET_SESSION_CONNECTION_TEMPLATE=$WEBSOCKET_SESSION_CONNECTION_TEMPLATE" >> $TEMP_FILE
echo "WEBSOCKET_SESSION_PATH_TEMPLATE=$WEBSOCKET_SESSION_PATH_TEMPLATE" >> $TEMP_FILE
echo "WEBSOCKET_MAX_SESSIONS=$WEBSOCKET_MAX_SESSIONS" >> $TEMP_FILE

# Update the service with the new environment variables
echo -e "${YELLOW}Updating service with new environment variables...${NC}"
gcloud run services update $SERVICE_NAME \
  --project=$PROJECT_ID \
  --region=$REGION \
  --update-env-vars="$(cat $TEMP_FILE | tr '\n' ',')"

# Clean up
rm $TEMP_FILE

echo -e "${GREEN}=== Server WebSocket Environment Variables Updated Successfully ===${NC}"
echo -e "${YELLOW}Service: ${SERVICE_NAME}${NC}"
echo -e "${YELLOW}Project: ${PROJECT_ID}${NC}"
echo -e "${YELLOW}Region: ${REGION}${NC}"
echo -e "${YELLOW}WebSocket Enabled: ${WEBSOCKET_ENABLED}${NC}"
