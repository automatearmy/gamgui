#!/bin/bash
# Deployment script for GamGUI client with environment variables

# Exit on error
set -e

echo "=== GamGUI Client Deployment Script ==="
echo "This script will build and deploy the client application with the correct environment variables."

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

# Confirm deployment
read -p "Do you want to deploy the client with environment variables? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Get the server URL from Terraform output
echo -e "\n=== Getting Server URL ==="
echo "Please enter the server URL (e.g., https://gamgui-server-2fdozy6y5a-uc.a.run.app):"
read SERVER_URL

if [ -z "$SERVER_URL" ]; then
    echo "Error: Server URL is required."
    exit 1
fi

# Update cloudbuild.yaml with the correct server URL
echo -e "\n=== Updating cloudbuild.yaml ==="
sed -i '' "s|VITE_API_URL=.*|VITE_API_URL=${SERVER_URL}/api',|" gamgui-client/cloudbuild.yaml
sed -i '' "s|VITE_SOCKET_URL=.*|VITE_SOCKET_URL=${SERVER_URL}',|" gamgui-client/cloudbuild.yaml

echo "cloudbuild.yaml updated with server URL: $SERVER_URL"

# Deploy client
echo -e "\n=== Deploying Client ==="
echo "Building and pushing client image..."
gcloud builds submit --config=gamgui-client/cloudbuild.yaml

echo -e "\n=== Deployment Complete ==="
echo "Client has been deployed with the correct environment variables."
echo "Please verify that the application is working correctly by accessing the client URL."
