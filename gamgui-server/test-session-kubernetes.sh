#!/bin/bash
# Script to test the session routes with Kubernetes integration

# Set error handling
set -e

echo "Testing session routes with Kubernetes integration..."

# Set environment variables for testing
export GKE_CLUSTER_NAME="test-cluster"
export GKE_CLUSTER_LOCATION="test-location"
export K8S_NAMESPACE="test-namespace"
export K8S_SERVICE_ACCOUNT="test-service-account"
export GAM_IMAGE="test-image"

# Run the test
echo "Running session routes test with Kubernetes integration..."
node test-session-kubernetes.js

# Check if the test was successful
if [ $? -eq 0 ]; then
  echo "Session routes test with Kubernetes integration completed successfully!"
else
  echo "Session routes test with Kubernetes integration failed."
  exit 1
fi
