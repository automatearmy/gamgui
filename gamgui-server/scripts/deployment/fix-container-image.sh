#!/bin/bash

# Script to fix the container image issue in Cloud Run

set -e

echo "=== Fixing container image issue in Cloud Run ==="

# Verify gcloud authentication
echo "Verifying gcloud authentication..."
ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
if [ -z "$ACCOUNT" ]; then
  echo "❌ No authenticated gcloud account. Run 'gcloud auth login' first."
  exit 1
fi
echo "✅ Authenticated as: $ACCOUNT"

# Verify project configuration
echo "Verifying project configuration..."
PROJECT=$(gcloud config get-value project)
if [ -z "$PROJECT" ]; then
  echo "❌ No project configured. Run 'gcloud config set project PROJECT_ID' first."
  exit 1
fi
echo "✅ Using project: $PROJECT"

# Get the current Cloud Run revision
echo "Getting the current Cloud Run revision..."
CURRENT_REVISION=$(gcloud run services describe gamgui-server --region=us-central1 --project=$PROJECT --format="value(status.traffic[0].revisionName)")
echo "✅ Current revision: $CURRENT_REVISION"

# Build the container image with the specific platform
echo "Building the container image with the specific platform..."
cd gamgui-app/gamgui-server
docker build --platform linux/amd64 -t gcr.io/$PROJECT/gamgui-server-image:amd64 .
echo "✅ Image built successfully."

# Push the image to Container Registry
echo "Pushing the image to Container Registry..."
docker push gcr.io/$PROJECT/gamgui-server-image:amd64
echo "✅ Image pushed successfully."

# Update the Cloud Run service to use the new image
echo "Updating the Cloud Run service to use the new image..."
gcloud run services update gamgui-server \
  --region=us-central1 \
  --project=$PROJECT \
  --image=gcr.io/$PROJECT/gamgui-server-image:amd64

echo "=== Fix completed ==="
echo "Now Cloud Run should be using a compatible container image."
echo "Test session creation again."
