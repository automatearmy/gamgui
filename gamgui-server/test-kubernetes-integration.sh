#!/bin/bash
# Script to test the Kubernetes integration

# Set error handling
set -e

echo "Testing Kubernetes integration..."

# Set environment variables for testing
export GKE_CLUSTER_NAME="test-cluster"
export GKE_CLUSTER_LOCATION="test-location"
export K8S_NAMESPACE="test-namespace"
export K8S_SERVICE_ACCOUNT="test-service-account"
export GAM_IMAGE="test-image"

# Run the test
echo "Running Kubernetes integration test..."
node test-kubernetes-integration.js

# Check if the test was successful
if [ $? -eq 0 ]; then
  echo "Kubernetes integration test completed successfully!"
else
  echo "Kubernetes integration test failed."
  exit 1
fi
