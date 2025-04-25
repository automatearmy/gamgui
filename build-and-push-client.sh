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

# Get the server URL
echo -e "\n=== Getting Server URL ==="
echo "Please enter the server URL (e.g., https://gamgui-server-2fdozy6y5a-uc.a.run.app):"
echo "Tip: You can get this URL by running 'terraform output server_url' in the gamgui-terraform repository."
read SERVER_URL

if [ -z "$SERVER_URL" ]; then
    echo "Error: Server URL is required."
    exit 1
fi

# Remove quotes if present (terraform output often includes quotes)
SERVER_URL=$(echo $SERVER_URL | sed 's/"//g')

# Validate URL format
if [[ ! $SERVER_URL =~ ^https?:// ]]; then
    echo "Error: Server URL must start with http:// or https://"
    exit 1
fi

echo "Using server URL: $SERVER_URL"

# Configure Docker to use gcloud as a credential helper
echo -e "\n=== Configuring Docker authentication ==="
gcloud auth configure-docker

# Build the Docker image locally
echo -e "\n=== Building Docker image locally ==="
echo "Building image with server URL: $SERVER_URL"

docker build \
  --platform=linux/amd64 \
  --build-arg VITE_API_URL="${SERVER_URL}/api" \
  --build-arg VITE_SOCKET_URL="${SERVER_URL}" \
  -t us-central1.gcr.io/gamgui-registry/gamgui-client-image:latest \
  ./gamgui-client

# Push the Docker image to the registry
echo -e "\n=== Pushing Docker image to registry ==="
docker push us-central1.gcr.io/gamgui-registry/gamgui-client-image:latest

echo -e "\n=== Build and Push Complete ==="
echo "The client Docker image has been built with the correct server URL and pushed to the registry."
echo "Next steps:"
echo "1. Go to the gamgui-terraform repository"
echo "2. Run 'terraform apply' to update the Cloud Run services"
echo "3. Verify that the application is working correctly"
