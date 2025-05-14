#!/bin/bash
# Script to deploy the fixed Kubernetes client
# This script replaces the original kubernetesClient.js with the fixed version
# and deploys the updated server

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Deploying Fixed Kubernetes Client ===${NC}"

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Get the root directory of the project
PROJECT_DIR="$( cd "${SCRIPT_DIR}/../.." && pwd )"

# Check if the fixed file exists
FIXED_FILE="${PROJECT_DIR}/utils/kubernetesClient-fixed.js"
ORIGINAL_FILE="${PROJECT_DIR}/utils/kubernetesClient.js"
BACKUP_FILE="${PROJECT_DIR}/utils/kubernetesClient.js.bak"

if [ ! -f "${FIXED_FILE}" ]; then
    echo -e "${RED}Error: Fixed Kubernetes client file not found at ${FIXED_FILE}${NC}"
    exit 1
fi

# Create a backup of the original file
echo -e "${YELLOW}Creating backup of original Kubernetes client...${NC}"
if [ -f "${ORIGINAL_FILE}" ]; then
    cp "${ORIGINAL_FILE}" "${BACKUP_FILE}"
    echo -e "${GREEN}Backup created at ${BACKUP_FILE}${NC}"
else
    echo -e "${RED}Warning: Original Kubernetes client file not found at ${ORIGINAL_FILE}${NC}"
fi

# Replace the original file with the fixed version
echo -e "${YELLOW}Replacing Kubernetes client with fixed version...${NC}"
cp "${FIXED_FILE}" "${ORIGINAL_FILE}"
echo -e "${GREEN}Kubernetes client replaced successfully${NC}"

# Build and deploy the server
echo -e "${YELLOW}Building and deploying the server...${NC}"
cd "${PROJECT_DIR}/.."
./build-and-push-server.sh

echo -e "${GREEN}=== Fixed Kubernetes Client Deployed Successfully ===${NC}"
echo "The server has been updated with the fixed Kubernetes client."
echo "This should resolve the connection issues when creating sessions."
echo ""
echo "If you need to rollback to the original version, run:"
echo "cp ${BACKUP_FILE} ${ORIGINAL_FILE}"
echo "And then redeploy the server."
