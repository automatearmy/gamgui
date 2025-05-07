#!/bin/bash
# Script to check the content of KubernetesAdapter-cloud-run.js inside the Docker image

set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"gamgui-registry"}
IMAGE_NAME="gcr.io/${PROJECT_ID}/gamgui-server-image:latest"

echo "=== Checking KubernetesAdapter-cloud-run.js inside Docker image ==="
echo "Image Name: ${IMAGE_NAME}"

# Create a temporary container from the image
CONTAINER_ID=$(docker create ${IMAGE_NAME})

# Copy the file from the container to a temporary location
echo "Copying file from container..."
docker cp ${CONTAINER_ID}:/app/services/container/adapters/KubernetesAdapter-cloud-run.js /tmp/KubernetesAdapter-cloud-run.js

# Check the content of the file
echo "Checking file content..."
grep -A 5 "gcsfuse-sidecar" /tmp/KubernetesAdapter-cloud-run.js

# Clean up
echo "Cleaning up..."
docker rm ${CONTAINER_ID}
rm /tmp/KubernetesAdapter-cloud-run.js

echo "=== Check Complete ==="
