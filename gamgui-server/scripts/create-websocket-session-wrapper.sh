#!/bin/bash
# Wrapper script to create a WebSocket session

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Define variables
NAMESPACE=gamgui
SESSION_ID=""
COMMAND="info domain"

# Function to display help
function print_help {
  echo "Usage: $0 [options] [session_id] [command]"
  echo ""
  echo "Options:"
  echo "  --id ID         Session ID (required if not provided as positional argument)"
  echo "  --command CMD   GAM command to execute (default: info domain)"
  echo "  --help          Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 --id my-session --command \"info domain\""
  echo "  $0 my-session \"info domain\"  # Legacy format"
}

# Parse command line arguments
# First check if using positional arguments (legacy mode)
if [[ $# -gt 0 && $1 != --* ]]; then
  # Legacy mode with positional arguments
  SESSION_ID=$1
  if [ ! -z "$2" ]; then
    COMMAND=$2
  fi
else
  # Parse named arguments
  while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
      --id)
        SESSION_ID="$2"
        shift
        shift
        ;;
      --command)
        COMMAND="$2"
        shift
        shift
        ;;
      --help)
        print_help
        exit 0
        ;;
      *)
        echo -e "${RED}Error: Unknown option $1${NC}"
        print_help
        exit 1
        ;;
    esac
  done
fi

# Check if session ID was provided
if [ -z "$SESSION_ID" ]; then
  echo -e "${RED}Error: Session ID is required${NC}"
  print_help
  exit 1
fi

echo -e "${GREEN}Creating WebSocket session...${NC}"
echo -e "${YELLOW}Session ID: ${SESSION_ID}${NC}"
echo -e "${YELLOW}Command: ${COMMAND}${NC}"

# Configure kubectl to use the GKE cluster
echo "Configuring kubectl..."
gcloud container clusters get-credentials gamgui-cluster --region=us-central1 --project=gamgui-registry

# Create the session using kubectl directly
echo "Creating session using kubectl..."

# Create the deployment
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gam-session-${SESSION_ID}
  namespace: ${NAMESPACE}
  labels:
    app: gamgui
    component: gam-session
    session_id: ${SESSION_ID}
  annotations:
    last_activity: "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: gamgui
      component: gam-session
      session_id: ${SESSION_ID}
  template:
    metadata:
      labels:
        app: gamgui
        component: gam-session
        session_id: ${SESSION_ID}
    spec:
      serviceAccountName: gam-service-account
      containers:
      - name: gam
        image: gcr.io/gamgui-registry/docker-gam7:latest
        command: ["/bin/bash", "-c"]
        args:
        - |
          echo "Starting GAM session ${SESSION_ID}..."

          # Create GAM config directory
          mkdir -p /root/.gam

          # Create a new gam.cfg file with correct paths
          cat > /root/.gam/gam.cfg << GAMCFG
          [DEFAULT]
          customer_id = my_customer
          domain = automatearmy.com
          oauth2_txt = /root/.gam/oauth2.txt
          oauth2service_json = /root/.gam/oauth2service.json
          client_secrets_json = /root/.gam/client_secrets.json
          GAMCFG

          # Copy credentials to the expected location
          cp /root/.gam/credentials/oauth2.txt /root/.gam/oauth2.txt
          cp /root/.gam/credentials/oauth2service.json /root/.gam/oauth2service.json
          cp /root/.gam/credentials/client_secrets.json /root/.gam/client_secrets.json

          # Make sure permissions are correct
          chmod 600 /root/.gam/oauth2.txt
          chmod 600 /root/.gam/oauth2service.json
          chmod 600 /root/.gam/client_secrets.json

          # Test GAM command
          echo "Testing GAM command: ${COMMAND}"
          /gam/gam7/gam ${COMMAND} || echo "Command failed"

          # Start a simple HTTP server to handle WebSocket requests
          echo "Starting HTTP server on port 8080..."
          cd /gam
          python3 -m http.server 8080 &

          # Keep the container running
          echo "GAM session is ready. Waiting for commands..."
          while true; do sleep 30; done
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: GAM_CONFIG_DIR
          value: /root/.gam
        - name: SESSION_ID
          value: "${SESSION_ID}"
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "250m"
            memory: "256Mi"
        volumeMounts:
        - name: gam-credentials
          mountPath: /root/.gam/credentials
          readOnly: true
        - name: gam-uploads
          mountPath: /gam/uploads
      volumes:
      - name: gam-credentials
        secret:
          secretName: gam-credentials
      - name: gam-uploads
        emptyDir: {}
EOF

# Create the service
kubectl apply -f - << EOF
apiVersion: v1
kind: Service
metadata:
  name: gam-session-${SESSION_ID}
  namespace: ${NAMESPACE}
  labels:
    app: gamgui
    component: gam-session
    session_id: ${SESSION_ID}
spec:
  selector:
    app: gamgui
    component: gam-session
    session_id: ${SESSION_ID}
  ports:
  - port: 8080
    targetPort: 8080
    name: http
EOF

echo "WebSocket session created successfully"
echo "Session ID: $SESSION_ID"
echo "WebSocket URL: ws://websocket-proxy.${NAMESPACE}.svc.cluster.local/ws/session/${SESSION_ID}/"
