#!/bin/bash
# Script to configure kubectl to access the GKE cluster

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Configuring kubectl for GKE access ===${NC}"

# Get cluster information from environment variables
CLUSTER_NAME=${GKE_CLUSTER_NAME:-"gamgui-cluster"}
CLUSTER_LOCATION=${GKE_CLUSTER_LOCATION:-"us-central1"}
PROJECT_ID=${PROJECT_ID:-"gamgui-registry"}

echo -e "${YELLOW}Cluster Name: ${CLUSTER_NAME}${NC}"
echo -e "${YELLOW}Cluster Location: ${CLUSTER_LOCATION}${NC}"
echo -e "${YELLOW}Project ID: ${PROJECT_ID}${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}Error: gcloud is not installed${NC}"
  exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
  echo -e "${RED}Error: kubectl is not installed${NC}"
  exit 1
fi

# Create .kube directory if it doesn't exist
mkdir -p ~/.kube

# Configure kubectl to use the GKE cluster
echo -e "${YELLOW}Configuring kubectl to use the GKE cluster...${NC}"
gcloud container clusters get-credentials ${CLUSTER_NAME} --region=${CLUSTER_LOCATION} --project=${PROJECT_ID}

# Verify that kubectl can access the cluster
echo -e "${YELLOW}Verifying kubectl access...${NC}"
kubectl cluster-info

echo -e "${GREEN}=== kubectl configured successfully ===${NC}"
