#!/bin/bash
# Script to build and deploy the server to Cloud Run with the Cloud Run Adapter Fix

set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"gamgui-registry"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME=${SERVICE_NAME:-"gamgui-server"}
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Building and Deploying ${SERVICE_NAME} to Cloud Run ===${NC}"
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service Name: ${SERVICE_NAME}"
echo "Image Name: ${IMAGE_NAME}"

# Build the Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t ${IMAGE_NAME} .

# Push the image to Container Registry
echo -e "${YELLOW}Pushing image to Container Registry...${NC}"
docker push ${IMAGE_NAME}

# Deploy to Cloud Run
echo -e "${YELLOW}Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --allow-unauthenticated \
  --update-env-vars "CLOUD_RUN_REVISION=true" \
  --memory 512Mi \
  --cpu 1 \
  --port 3001

# Get the URL of the deployed service
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --project ${PROJECT_ID} --format="value(status.url)")

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo "Service URL: ${SERVICE_URL}"
echo -e "${YELLOW}Note: The CLOUD_RUN_REVISION environment variable has been set to ensure the KubernetesAdapter is used.${NC}"
