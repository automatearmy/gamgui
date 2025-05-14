#!/bin/bash
# Script to update the AUTHORIZED_DOMAINS environment variable in the Cloud Run service

set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"gamgui-registry"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME=${SERVICE_NAME:-"gamgui-server"}
AUTHORIZED_DOMAINS="automatearmy.com;gedu.demo.automatearmy.com"



# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Updating AUTHORIZED_DOMAINS for ${SERVICE_NAME} on Cloud Run ===${NC}"
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service Name: ${SERVICE_NAME}"
echo "Authorized Domains: ${AUTHORIZED_DOMAINS}"

# Check if service exists
if ! gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} > /dev/null 2>&1; then
  echo -e "${RED}Service ${SERVICE_NAME} not found in project ${PROJECT_ID}.${NC}"
  exit 1
fi

# Display current environment variables (optional)
echo -e "${YELLOW}Current environment variables:${NC}"
gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format="table[box](spec.template.spec.containers[0].env)"

# Update the environment variable
echo -e "${YELLOW}Updating AUTHORIZED_DOMAINS environment variable...${NC}"
gcloud run services update ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --update-env-vars="AUTHORIZED_DOMAINS=${AUTHORIZED_DOMAINS}"

echo -e "${GREEN}=== Update Complete ===${NC}"
echo "AUTHORIZED_DOMAINS updated to: ${AUTHORIZED_DOMAINS}"
echo -e "${YELLOW}Note: It may take a few moments for the changes to take effect.${NC}"
