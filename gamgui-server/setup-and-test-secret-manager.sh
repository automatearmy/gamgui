#!/bin/bash
# Setup and test Secret Manager integration

# Set project ID
export PROJECT_ID=${PROJECT_ID:-"gamgui-tf-1"}
echo "Using project: $PROJECT_ID"

# Install dependencies
echo "Installing dependencies..."
npm install @google-cloud/secret-manager

# Run the test
echo "Running Secret Manager integration test..."
node test-secret-manager.js
