#!/bin/bash
# Script to test the WebSocket proxy in Kubernetes

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Testing WebSocket Proxy ===${NC}"

# Default values
NAMESPACE="gamgui"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --namespace)
      NAMESPACE="$2"
      shift
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --namespace NS      Kubernetes namespace (default: gamgui)"
      echo "  --help              Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${YELLOW}Namespace: ${NAMESPACE}${NC}"

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
  echo -e "${RED}Error: kubectl is not installed${NC}"
  exit 1
fi

# Check if the namespace exists
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
  echo -e "${RED}Error: Namespace ${NAMESPACE} does not exist${NC}"
  exit 1
fi

# Check if the WebSocket proxy exists
if ! kubectl get deployment websocket-proxy -n $NAMESPACE &> /dev/null; then
  echo -e "${RED}Error: WebSocket proxy does not exist${NC}"
  echo -e "${YELLOW}Deploy the WebSocket infrastructure first${NC}"
  exit 1
fi

# Check if the WebSocket proxy service exists
if ! kubectl get service websocket-proxy -n $NAMESPACE &> /dev/null; then
  echo -e "${RED}Error: WebSocket proxy service does not exist${NC}"
  echo -e "${YELLOW}Deploy the WebSocket infrastructure first${NC}"
  exit 1
fi

# Create a temporary file for the test pod YAML
TEMP_FILE=$(mktemp)

cat > $TEMP_FILE << EOF
apiVersion: v1
kind: Pod
metadata:
  name: websocket-proxy-test
  namespace: ${NAMESPACE}
  labels:
    app: gamgui
    component: websocket-proxy-test
spec:
  containers:
  - name: websocket-proxy-test
    image: curlimages/curl:latest
    command: ["/bin/sh", "-c"]
    args:
    - |
      echo "Testing WebSocket proxy..."
      echo "WebSocket proxy URL: http://websocket-proxy.${NAMESPACE}.svc.cluster.local/"
      
      # Test the HTTP endpoint
      echo "Testing HTTP endpoint..."
      curl -v http://websocket-proxy.${NAMESPACE}.svc.cluster.local/
      
      # Install websocat if not already installed
      if ! command -v websocat &> /dev/null; then
        echo "Installing websocat..."
        apk add --no-cache websocat
      fi
      
      # Test the WebSocket endpoint with a non-existent session
      echo "Testing WebSocket endpoint with a non-existent session..."
      echo "info domain" | websocat ws://websocket-proxy.${NAMESPACE}.svc.cluster.local/ws/session/nonexistent/ || echo "Expected error for non-existent session"
      
      # Keep the pod running for debugging
      echo "Test completed. Pod will terminate in 30 seconds."
      sleep 30
  restartPolicy: Never
EOF

# Apply the test pod
kubectl apply -f $TEMP_FILE

# Clean up
rm $TEMP_FILE

echo -e "${GREEN}=== WebSocket Proxy Test Pod Created ===${NC}"
echo -e "${YELLOW}To view the logs:${NC}"
echo -e "${GREEN}kubectl logs -f websocket-proxy-test -n ${NAMESPACE}${NC}"

# Wait for the pod to be ready
echo -e "${YELLOW}Waiting for test pod to be ready...${NC}"
kubectl wait --for=condition=Ready pod/websocket-proxy-test -n ${NAMESPACE} --timeout=60s

# Follow the logs
echo -e "${YELLOW}Following logs from test pod:${NC}"
kubectl logs -f websocket-proxy-test -n ${NAMESPACE}

# Clean up the test pod
echo -e "${YELLOW}Cleaning up test pod...${NC}"
kubectl delete pod websocket-proxy-test -n ${NAMESPACE}

echo -e "${GREEN}=== WebSocket Proxy Test Completed ===${NC}"
