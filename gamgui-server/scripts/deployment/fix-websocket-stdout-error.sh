#!/bin/bash
# Script to fix the "TypeError: stdout.write is not a function" error in WebSocketHandler

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Script to fix WebSocketHandler.handleStandardStreams error ===${NC}"
echo "This script fixes the 'TypeError: stdout.write is not a function' error in KubernetesAdapter."

# Configuration
PROJECT_ID=${PROJECT_ID:-"gamgui-registry"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME=${SERVICE_NAME:-"gamgui-server"}
TAG="websocket-fix-$(date +%Y%m%d%H%M%S)"

echo -e "${YELLOW}Configuration:${NC}"
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service Name: ${SERVICE_NAME}"
echo "Tag: ${TAG}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}Error: gcloud is not installed${NC}"
  exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
  echo -e "${RED}Error: docker is not installed${NC}"
  exit 1
fi

# Check if the user is authenticated in gcloud
if ! gcloud auth print-access-token &> /dev/null; then
  echo -e "${RED}Error: You are not authenticated in gcloud${NC}"
  echo -e "${YELLOW}Run 'gcloud auth login' to authenticate${NC}"
  exit 1
fi

# Check if the project is configured
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [[ -z "${CURRENT_PROJECT}" ]]; then
  echo -e "${RED}Error: No Google Cloud project configured${NC}"
  echo -e "${YELLOW}Run 'gcloud config set project ${PROJECT_ID}' to configure the project${NC}"
  exit 1
fi

if [[ "${CURRENT_PROJECT}" != "${PROJECT_ID}" ]]; then
  echo -e "${YELLOW}Warning: The current project (${CURRENT_PROJECT}) is different from the specified project (${PROJECT_ID})${NC}"
  read -p "Do you want to continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Operation canceled by the user${NC}"
    exit 1
  fi
fi

# Check if the service exists
echo -e "${YELLOW}Checking if the service ${SERVICE_NAME} exists...${NC}"
if ! gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --project ${PROJECT_ID} &> /dev/null; then
  echo -e "${RED}Error: The service ${SERVICE_NAME} does not exist in project ${PROJECT_ID}, region ${REGION}${NC}"
  exit 1
fi

# Navigate to the server directory
echo -e "${YELLOW}Navigating to the server directory...${NC}"
cd $(dirname "$0")/../../

# Build the Docker image
echo -e "${YELLOW}Building the Docker image...${NC}"
docker build --platform=linux/amd64 -t gcr.io/${PROJECT_ID}/${SERVICE_NAME}:${TAG} .

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Error building the Docker image${NC}"
  exit 1
fi

# Push the image to Container Registry
echo -e "${YELLOW}Pushing the image to Container Registry...${NC}"
docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}:${TAG}

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Error pushing the image to Container Registry${NC}"
  exit 1
fi

# Update the Cloud Run service to use the new image
echo -e "${YELLOW}Updating the Cloud Run service to use the new image...${NC}"
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME}:${TAG} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID}

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Error updating the Cloud Run service${NC}"
  exit 1
fi

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --project ${PROJECT_ID} --format="value(status.url)")

echo -e "${GREEN}=== Fix applied successfully ===${NC}"
echo -e "Service URL: ${SERVICE_URL}"
echo -e "${YELLOW}The fix for the 'TypeError: stdout.write is not a function' error has been applied.${NC}"
echo -e "${YELLOW}Now the KubernetesAdapter uses StreamWrapper for stdout and stderr callbacks.${NC}"
echo -e "${YELLOW}You can check the service status at: ${SERVICE_URL}${NC}"
