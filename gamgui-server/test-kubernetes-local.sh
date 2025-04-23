#!/bin/bash
# Script to test the Kubernetes integration locally without a real cluster

# Set error handling
set -e

echo "Testing Kubernetes integration locally (without a real cluster)..."

# Run the test
echo "Running local Kubernetes integration test..."
node test-kubernetes-local.js

# Check if the test was successful
if [ $? -eq 0 ]; then
  echo "Local Kubernetes integration test completed successfully!"
else
  echo "Local Kubernetes integration test failed."
  exit 1
fi
