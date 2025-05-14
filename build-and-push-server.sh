#!/bin/bash
# Script to build and push the server Docker image

# Exit on error
set -e

echo "=== GamGUI Server Image Build and Push Script ==="
echo "This script will build the server Docker image and push it to the registry."

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
read -p "Do you want to build and push the server Docker image? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

# Configure Docker to use gcloud as a credential helper
echo -e "\n=== Configuring Docker authentication ==="
gcloud auth configure-docker

# Build the Docker image locally
echo -e "\n=== Building server Docker image locally ==="
cd gamgui-server
docker build \
  --no-cache \
  --platform=linux/amd64 \
  -t gamgui-server-image:latest \
  -f Dockerfile .
cd ..

echo "Server Docker image built successfully."

# Generate a unique tag based on timestamp
TAG=$(date +%Y%m%d%H%M%S)
echo -e "\n=== Generating unique tag: $TAG ==="

# Tag the image for Google Container Registry with both latest and timestamp tags
echo -e "\n=== Tagging image for Google Container Registry ==="
docker tag gamgui-server-image:latest gcr.io/gamgui-registry/gamgui-server-image:latest
docker tag gamgui-server-image:latest gcr.io/gamgui-registry/gamgui-server-image:$TAG

# Push the Docker images to the registry
echo -e "\n=== Pushing server Docker images to registry ==="
docker push gcr.io/gamgui-registry/gamgui-server-image:latest
docker push gcr.io/gamgui-registry/gamgui-server-image:$TAG

# Update the terraform.tfvars file with the new tag
echo -e "\n=== Updating terraform.tfvars with new tag ==="
sed -i '' "s|server_image = \"gcr.io/gamgui-registry/gamgui-server-image:.*\"|server_image = \"gcr.io/gamgui-registry/gamgui-server-image:$TAG\"|" ../gamgui-terraform/terraform.tfvars

echo -e "\n=== Build and Push Complete ==="
echo "The server Docker image has been built and pushed to the registry."
echo "The images are now available at:"
echo "- gcr.io/gamgui-registry/gamgui-server-image:latest"
echo "- gcr.io/gamgui-registry/gamgui-server-image:$TAG"
echo ""
echo "Next steps:"
echo "1. Go to the gamgui-terraform repository"
echo "2. Run 'terraform apply' to update the Cloud Run services"
echo "3. Verify that the application is working correctly"
