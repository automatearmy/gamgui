#!/bin/bash
# Script to clean up duplicate versions in Secret Manager
# This script will keep only the latest version of each secret and disable older versions

# Configuration
PROJECT_ID="gamgui-tf-1"
SECRETS=("client-secrets" "oauth2" "oauth2service")
KEEP_LATEST=1  # Keep only the latest version

echo "=== Secret Manager Duplicate Version Cleanup ==="
echo "Project: $PROJECT_ID"
echo "Keeping latest $KEEP_LATEST version of each secret"

for SECRET in "${SECRETS[@]}"; do
  echo -e "\nProcessing secret: $SECRET"
  
  # Get all versions
  ALL_VERSIONS=$(gcloud secrets versions list $SECRET --project=$PROJECT_ID --format="value(name)")
  
  # Get latest version
  LATEST_VERSION=$(gcloud secrets versions list $SECRET --project=$PROJECT_ID --sort-by=~created --limit=$KEEP_LATEST --format="value(name)")
  
  echo "Latest version: $LATEST_VERSION"
  
  # Process each version
  for VERSION in $ALL_VERSIONS; do
    # Check if this version is the latest version
    if echo "$LATEST_VERSION" | grep -q "^$VERSION$"; then
      echo "  Keeping version $VERSION of $SECRET (latest)"
    else
      echo "  Disabling version $VERSION of $SECRET"
      gcloud secrets versions disable $VERSION --secret=$SECRET --project=$PROJECT_ID
    fi
  done
done

echo -e "\n=== Secret Manager Cleanup Complete ==="
echo "Latest version of each secret is now enabled"
echo "Older versions have been disabled"
