#!/bin/bash
# Script to build and push the client Docker image locally

# Exit on error
set -e

echo "=== GamGUI Client Local Build and Push Script ==="
echo "This script will build the client Docker image locally and push it to the registry."

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
read -p "Do you want to build and push the client Docker image? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

# Get the Google OAuth Client ID for gamgui-tf1-edu project
echo -e "\n=== Getting Google OAuth Client ID ==="
echo "Please enter the Google OAuth Client ID for gamgui-tf1-edu project:"
echo "Default: 1381612022-cc57j2tq7ur5t8nimcd4aq66kud0ako4.apps.googleusercontent.com"
read GOOGLE_CLIENT_ID

# Use default if empty
if [ -z "$GOOGLE_CLIENT_ID" ]; then
    GOOGLE_CLIENT_ID="1381612022-cc57j2tq7ur5t8nimcd4aq66kud0ako4.apps.googleusercontent.com"
    echo "Using default Google OAuth Client ID for gamgui-tf1-edu"
else
    echo "Using provided Google OAuth Client ID"
fi

# Set the API URLs for gamgui-tf1-edu project
API_URL="https://gamgui-server-1381612022.us-central1.run.app/api"
SOCKET_URL="wss://gamgui-server-1381612022.us-central1.run.app"

echo -e "\n=== Using Production URL Configuration ==="
echo "API URL: $API_URL"
echo "Socket URL: $SOCKET_URL"
echo "Google Client ID: $GOOGLE_CLIENT_ID"

# Configure Docker to use gcloud as a credential helper for shared registry
echo -e "\n=== Configuring Docker authentication ==="
gcloud auth configure-docker gcr.io

# Generate a unique tag based on timestamp
TAG=$(date +%Y%m%d%H%M%S)
echo -e "\n=== Generating unique tag: $TAG ==="

# Build the Docker image locally with production configuration
echo -e "\n=== Building Docker image locally ==="
echo "Building image with production URLs and Google OAuth Client ID"

docker build \
  --platform=linux/amd64 \
  --build-arg VITE_API_URL="${API_URL}" \
  --build-arg VITE_SOCKET_URL="${SOCKET_URL}" \
  --build-arg VITE_GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}" \
  -t gcr.io/gamgui-registry/gamgui-client-image:latest \
  ./gamgui-client

# Tag with timestamp
echo -e "\n=== Tagging image with timestamp ==="
docker tag gcr.io/gamgui-registry/gamgui-client-image:latest gcr.io/gamgui-registry/gamgui-client-image:$TAG

# Push the Docker images to shared registry
echo -e "\n=== Pushing Docker images to shared registry ==="
docker push gcr.io/gamgui-registry/gamgui-client-image:latest
docker push gcr.io/gamgui-registry/gamgui-client-image:$TAG

# Update the stage.tfvars file with the new tag
echo -e "\n=== Updating stage.tfvars with new tag ==="
sed -i '' "s|client_image = \".*\"|client_image = \"gcr.io/gamgui-registry/gamgui-client-image:$TAG\"|" ../gamgui-terraform/environments/stage.tfvars

echo -e "\n=== Build and Push Complete ==="
echo "The client Docker image has been built with dynamic URL configuration and pushed to the shared registry."
echo "The images are now available at:"
echo "- gcr.io/gamgui-registry/gamgui-client-image:latest"
echo "- gcr.io/gamgui-registry/gamgui-client-image:$TAG"
echo "Next steps:"
echo "1. Go to the gamgui-terraform repository"
echo "2. Run './apply-terraform.sh stage' to update the Cloud Run services"
echo "3. Verify that the application is working with dynamic URL auto-discovery"
