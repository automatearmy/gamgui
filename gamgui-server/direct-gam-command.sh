#!/bin/bash
# Script to execute GAM commands directly in a Kubernetes pod without using Docker

set -e

# Function to display usage information
usage() {
  echo "Usage: $0 [options] <command>"
  echo "Options:"
  echo "  -s, --session-id ID  Session ID to use (default: test-direct-gam)"
  echo "  -n, --namespace NS   Kubernetes namespace (default: gamgui)"
  echo "  -h, --help           Display this help message"
  echo "Example:"
  echo "  $0 version"
  echo "  $0 --session-id my-session info domain"
  exit 1
}

# Default values
SESSION_ID="test-direct-gam"
NAMESPACE="gamgui"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -s|--session-id)
      SESSION_ID="$2"
      shift 2
      ;;
    -n|--namespace)
      NAMESPACE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      break
      ;;
  esac
done

# Check if a command was provided
if [ $# -eq 0 ]; then
  echo "Error: No GAM command provided"
  usage
fi

# Combine the remaining arguments into the GAM command
GAM_COMMAND="$*"

echo "=== Executing GAM Command ==="
echo "Session ID: $SESSION_ID"
echo "Namespace: $NAMESPACE"
echo "Command: $GAM_COMMAND"
echo "===================================="

# Check if the session pod exists
POD_NAME=$(kubectl get pods -n $NAMESPACE -l session_id=$SESSION_ID -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [ -z "$POD_NAME" ]; then
  echo "Session pod not found. Creating a new session..."
  
  # Create a new session
  ./scripts/create-websocket-session.sh --id $SESSION_ID --command "serve"
  
  # Wait for the pod to be ready
  echo "Waiting for pod to be ready..."
  sleep 5
  
  # Get the pod name again
  POD_NAME=$(kubectl get pods -n $NAMESPACE -l session_id=$SESSION_ID -o jsonpath='{.items[0].metadata.name}')
  
  if [ -z "$POD_NAME" ]; then
    echo "Error: Failed to create session pod"
    exit 1
  fi
fi

echo "Using pod: $POD_NAME"

# Execute the GAM command directly in the pod
echo "Executing command: $GAM_COMMAND"
kubectl exec -n $NAMESPACE $POD_NAME -- /gam/gam7/gam $GAM_COMMAND

echo "===================================="
echo "Command execution completed"
echo "===================================="
