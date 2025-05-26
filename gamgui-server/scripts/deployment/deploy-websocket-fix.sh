#!/bin/bash
# Script to deploy WebSocket fix to Cloud Run

# Exit on error
set -e

echo "=== GamGUI WebSocket Fix Deployment Script ==="
echo "This script will deploy the WebSocket fix to Cloud Run."

# Set the correct project
PROJECT_ID="gamgui-tf1-edu"
echo "Using project ID: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Build and push the server Docker image
echo -e "\n=== Building and pushing server Docker image ==="
cd ../../..  # Volta para o diretório gamgui-app
./build-and-push-server.sh

# Apply Terraform changes
echo -e "\n=== Applying Terraform changes ==="
cd ../gamgui-terraform  # Vai para o diretório gamgui-terraform a partir de gamgui-app
./apply-terraform.sh

echo -e "\n=== Deployment Complete ==="
echo "The WebSocket fix has been deployed to Cloud Run."
echo "Please verify that the application is working correctly."
