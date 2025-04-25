#!/bin/bash
# Script to test a WebSocket session in Kubernetes

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Testing WebSocket Session ===${NC}"

# Default values
SESSION_ID="default"
NAMESPACE="gamgui"
COMMAND="info domain"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --id)
      SESSION_ID="$2"
      shift
      shift
      ;;
    --namespace)
      NAMESPACE="$2"
      shift
      shift
      ;;
    --command)
      COMMAND="$2"
      shift
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --id ID             Session ID to test (default: default)"
      echo "  --namespace NS      Kubernetes namespace (default: gamgui)"
      echo "  --command COMMAND   Command to execute (default: info domain)"
      echo "  --help              Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${YELLOW}Session ID: ${SESSION_ID}${NC}"
echo -e "${YELLOW}Namespace: ${NAMESPACE}${NC}"
echo -e "${YELLOW}Command: ${COMMAND}${NC}"

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

# Check if the session exists
if ! kubectl get deployment gam-session-${SESSION_ID} -n $NAMESPACE &> /dev/null; then
  echo -e "${RED}Error: Session ${SESSION_ID} does not exist${NC}"
  echo -e "${YELLOW}Create the session first:${NC}"
  echo -e "${GREEN}./scripts/create-websocket-session.sh --id ${SESSION_ID}${NC}"
  exit 1
fi

# Check if the service exists
if ! kubectl get service gam-session-${SESSION_ID} -n $NAMESPACE &> /dev/null; then
  echo -e "${RED}Error: Service for session ${SESSION_ID} does not exist${NC}"
  echo -e "${YELLOW}Create the session first:${NC}"
  echo -e "${GREEN}./scripts/create-websocket-session.sh --id ${SESSION_ID}${NC}"
  exit 1
fi

# Check if the WebSocket proxy exists
if ! kubectl get deployment websocket-proxy -n $NAMESPACE &> /dev/null; then
  echo -e "${RED}Error: WebSocket proxy does not exist${NC}"
  echo -e "${YELLOW}Deploy the WebSocket infrastructure first${NC}"
  exit 1
fi

# Create a temporary file for the test pod YAML
TEMP_FILE=$(mktemp)

cat > $TEMP_FILE << EOF
apiVersion: v1
kind: Pod
metadata:
  name: websocket-test-${SESSION_ID}
  namespace: ${NAMESPACE}
  labels:
    app: gamgui
    component: websocket-test
spec:
  containers:
  - name: websocket-test
    image: curlimages/curl:latest
    command: ["/bin/sh", "-c"]
    args:
    - |
      echo "Testing WebSocket connection to session ${SESSION_ID}..."
      echo "WebSocket URL: ws://websocket-proxy.${NAMESPACE}.svc.cluster.local/ws/session/${SESSION_ID}/"
      
      # Install websocat if not already installed
      if ! command -v websocat &> /dev/null; then
        echo "Installing websocat..."
        apk add --no-cache websocat
      fi
      
      # Test the WebSocket connection
      echo "Sending command: ${COMMAND}"
      echo "${COMMAND}" | websocat ws://websocket-proxy.${NAMESPACE}.svc.cluster.local/ws/session/${SESSION_ID}/
      
      # Keep the pod running for debugging
      echo "Test completed. Pod will terminate in 30 seconds."
      sleep 30
  restartPolicy: Never
EOF

# Apply the test pod
kubectl apply -f $TEMP_FILE

# Clean up
rm $TEMP_FILE

echo -e "${GREEN}=== WebSocket Test Pod Created ===${NC}"
echo -e "${YELLOW}To view the logs:${NC}"
echo -e "${GREEN}kubectl logs -f websocket-test-${SESSION_ID} -n ${NAMESPACE}${NC}"

# Wait for the pod to be ready
echo -e "${YELLOW}Waiting for test pod to be ready...${NC}"
kubectl wait --for=condition=Ready pod/websocket-test-${SESSION_ID} -n ${NAMESPACE} --timeout=60s

# Follow the logs
echo -e "${YELLOW}Following logs from test pod:${NC}"
kubectl logs -f websocket-test-${SESSION_ID} -n ${NAMESPACE}

# Clean up the test pod
echo -e "${YELLOW}Cleaning up test pod...${NC}"
kubectl delete pod websocket-test-${SESSION_ID} -n ${NAMESPACE}

echo -e "${GREEN}=== WebSocket Test Completed ===${NC}"
