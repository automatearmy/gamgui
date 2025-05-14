#!/bin/bash
# Script to enable the mock container adapter for the GAMGUI server
# This is useful when the Kubernetes cluster is not available or for testing

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Enabling Mock Container Adapter for GAMGUI Server ===${NC}"
echo "This script will update the Cloud Run service to use the mock container adapter."
echo "This is useful when the Kubernetes cluster is not available or for testing."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud is not installed. Please install the Google Cloud SDK.${NC}"
    exit 1
fi

# Check if user is logged in to gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${RED}Error: You are not logged in to gcloud. Please run 'gcloud auth login'.${NC}"
    exit 1
fi

# Get the project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Could not determine project ID. Please set it with 'gcloud config set project YOUR_PROJECT_ID'.${NC}"
    exit 1
fi

# Get the region
REGION=$(gcloud config get-value run/region)
if [ -z "$REGION" ]; then
    REGION="us-central1"  # Default to us-central1
    echo -e "${YELLOW}Warning: Region not set. Using default region: ${REGION}${NC}"
fi

# Get the service name
SERVICE_NAME="gamgui-server"
echo -e "${YELLOW}Using service name: ${SERVICE_NAME}${NC}"

# Update the environment variables
echo -e "${YELLOW}Updating environment variables for ${SERVICE_NAME}...${NC}"
gcloud run services update ${SERVICE_NAME} \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --update-env-vars="USE_MOCK_CONTAINER_ADAPTER=true"

echo -e "${GREEN}=== Mock Container Adapter Enabled Successfully ===${NC}"
echo "The GAMGUI server is now using the mock container adapter."
echo "Users can now create sessions without connecting to a Kubernetes cluster."
echo ""
echo "To disable the mock container adapter, run:"
echo "gcloud run services update ${SERVICE_NAME} --region=${REGION} --project=${PROJECT_ID} --update-env-vars=USE_MOCK_CONTAINER_ADAPTER=false"
