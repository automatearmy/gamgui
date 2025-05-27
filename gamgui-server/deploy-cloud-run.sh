#!/bin/bash
# Script to build and deploy the server to Cloud Run with the Cloud Run Adapter Fix

set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"gamgui-registry"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME=${SERVICE_NAME:-"gamgui-server"}
IMAGE_NAME="gcr.io/${PROJECT_ID}/gamgui-server-image:latest"

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

# Build the Docker image with platform specified for Cloud Run
echo -e "${YELLOW}Building Docker image for platform linux/amd64...${NC}"
docker build --platform=linux/amd64 -t ${IMAGE_NAME} .

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
  --update-env-vars="CLOUD_RUN_REVISION=true,WEBSOCKET_ENABLED=true,WEBSOCKET_PROXY_SERVICE_URL=websocket-proxy.gamgui.svc.cluster.local,WEBSOCKET_SESSION_CONNECTION_TEMPLATE=ws://websocket-proxy.gamgui.svc.cluster.local/ws/session/{{SESSION_ID}}/,WEBSOCKET_SESSION_PATH_TEMPLATE=/ws/session/{{SESSION_ID}}/,WEBSOCKET_MAX_SESSIONS=50,EXTERNAL_WEBSOCKET_URL_TEMPLATE=wss://api.gamgui.example.com/ws/session/{{SESSION_ID}}/,AUTHORIZED_DOMAINS=automatearmy.com,gedu.demo.automatearmy.com" \
  --memory 512Mi \
  --cpu 1 \
  --port 3001

# Get the URL of the deployed service
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --project ${PROJECT_ID} --format="value(status.url)")

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo "Service URL: ${SERVICE_URL}"
echo -e "${YELLOW}Note: The CLOUD_RUN_REVISION environment variable has been set to ensure the KubernetesAdapter is used.${NC}"
