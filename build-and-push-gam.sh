#!/bin/bash
# Script to build and push the GAM Docker image

# Exit on error
set -e

echo "=== GamGUI GAM Image Build and Push Script ==="
echo "This script will build the GAM Docker image and push it to the registry."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker."
    exit 1
fi

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud is not installed. Please install the Google Cloud SDK."
    exit 1
fi

# Check if user is logged in to gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo "Error: You are not logged in to gcloud. Please run 'gcloud auth login'."
    exit 1
fi

# Confirm build and push
read -p "Do you want to build and push the GAM Docker image? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

# Configure Docker to use gcloud as a credential helper
echo -e "\n=== Configuring Docker authentication ==="
gcloud auth configure-docker

# Build the Docker image locally
echo -e "\n=== Building GAM Docker image locally ==="
docker build \
  --platform=linux/amd64 \
  -t docker-gam7:latest \
  -f Dockerfile.gam .

echo "GAM Docker image built successfully."

# Tag the image for Google Container Registry
echo -e "\n=== Tagging image for Google Container Registry ==="
docker tag docker-gam7:latest us-central1.gcr.io/gamgui-registry/docker-gam7:latest

# Push the Docker image to the registry
echo -e "\n=== Pushing GAM Docker image to registry ==="
docker push us-central1.gcr.io/gamgui-registry/docker-gam7:latest

echo -e "\n=== Build and Push Complete ==="
echo "The GAM Docker image has been built and pushed to the registry."
echo "The image is now available at: us-central1.gcr.io/gamgui-registry/docker-gam7:latest"
echo ""
echo "Next steps:"
echo "1. Go to the gamgui-terraform repository"
echo "2. Update the Terraform configuration to use the new GAM image"
echo "3. Run 'terraform apply' to update the Cloud Run services"
echo "4. Verify that the application is working correctly"
