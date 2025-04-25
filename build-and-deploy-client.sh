#!/bin/bash
# Script to build and deploy the client application

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Building and Deploying Client ===${NC}"

# Default values
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
SERVICE_NAME="gamgui-client"
IMAGE_NAME="gcr.io/${PROJECT_ID}/gamgui-client"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
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
    --service)
      SERVICE_NAME="$2"
      shift
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --project ID        Google Cloud project ID (default: current project)"
      echo "  --region REGION     Google Cloud region (default: us-central1)"
      echo "  --service NAME      Cloud Run service name (default: gamgui-client)"
      echo "  --help              Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${YELLOW}Project ID: ${PROJECT_ID}${NC}"
echo -e "${YELLOW}Region: ${REGION}${NC}"
echo -e "${YELLOW}Service Name: ${SERVICE_NAME}${NC}"
echo -e "${YELLOW}Image Name: ${IMAGE_NAME}${NC}"

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

# Build the client
echo -e "${YELLOW}Building client...${NC}"
cd gamgui-client
npm install
npm run build

# Build the Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t ${IMAGE_NAME} .

# Push the Docker image
echo -e "${YELLOW}Pushing Docker image...${NC}"
docker push ${IMAGE_NAME}

# Deploy to Cloud Run
echo -e "${YELLOW}Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --project ${PROJECT_ID}

echo -e "${GREEN}=== Client Built and Deployed Successfully ===${NC}"
echo -e "${YELLOW}Service URL: $(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --project ${PROJECT_ID} --format='value(status.url)')${NC}"
