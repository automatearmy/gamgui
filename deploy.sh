#!/bin/bash
# Deployment script for GamGUI application

# Exit on error
set -e

echo "=== GamGUI Deployment Script ==="
echo "This script will build and deploy both the client and server applications."

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
read -p "Do you want to deploy both client and server? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Deploy server
echo -e "\n=== Deploying Server ==="
echo "Building and pushing server image..."
gcloud builds submit --config=gamgui-server/cloudbuild.yaml

# Deploy client
echo -e "\n=== Deploying Client ==="
echo "Building and pushing client image..."
gcloud builds submit --config=gamgui-client/cloudbuild.yaml

echo -e "\n=== Deployment Complete ==="
echo "Server: https://gamgui-server-1007518649235.us-central1.run.app"
echo "Client: https://gamgui-client-1007518649235.us-central1.run.app"
echo -e "\nPlease verify that the application is working correctly."
