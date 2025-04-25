#!/bin/bash
# Script to create a WebSocket session in Kubernetes

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Creating WebSocket Session ===${NC}"

# Default values
SESSION_ID="default"
COMMAND="info domain"
NAMESPACE="gamgui"
CREDENTIALS_SECRET="gam-credentials"
GAM_IMAGE="gcr.io/gamgui-registry/docker-gam7:latest"

# Parse command line arguments
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
    --namespace)
      NAMESPACE="$2"
      shift
      shift
      ;;
    --credentials)
      CREDENTIALS_SECRET="$2"
      shift
      shift
      ;;
    --image)
      GAM_IMAGE="$2"
      shift
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --id ID             Session ID (default: default)"
      echo "  --command COMMAND   Command to execute (default: info domain)"
      echo "  --namespace NS      Kubernetes namespace (default: gamgui)"
      echo "  --credentials SEC   Credentials secret (default: gam-credentials)"
      echo "  --image IMAGE       GAM Docker image (default: gcr.io/gamgui-registry/docker-gam7:latest)"
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
echo -e "${YELLOW}Command: ${COMMAND}${NC}"
echo -e "${YELLOW}Namespace: ${NAMESPACE}${NC}"
echo -e "${YELLOW}Credentials Secret: ${CREDENTIALS_SECRET}${NC}"
echo -e "${YELLOW}GAM Image: ${GAM_IMAGE}${NC}"

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
  echo -e "${RED}Error: kubectl is not installed${NC}"
  exit 1
fi

# Check if the namespace exists
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
  echo -e "${YELLOW}Creating namespace ${NAMESPACE}...${NC}"
  kubectl create namespace $NAMESPACE
fi

# Check if the service account exists
if ! kubectl get serviceaccount gam-service-account -n $NAMESPACE &> /dev/null; then
  echo -e "${YELLOW}Creating service account gam-service-account...${NC}"
  kubectl create serviceaccount gam-service-account -n $NAMESPACE
fi

# Check if the credentials secret exists
if ! kubectl get secret $CREDENTIALS_SECRET -n $NAMESPACE &> /dev/null; then
  echo -e "${RED}Error: Credentials secret ${CREDENTIALS_SECRET} does not exist${NC}"
  echo -e "${YELLOW}Please create the secret with your GAM credentials:${NC}"
  echo -e "${GREEN}kubectl create secret generic ${CREDENTIALS_SECRET} --from-file=oauth2.txt --from-file=client_secrets.json --from-file=oauth2service.json -n ${NAMESPACE}${NC}"
  exit 1
fi

# Check if the gam-config ConfigMap exists
if ! kubectl get configmap gam-config -n $NAMESPACE &> /dev/null; then
  echo -e "${YELLOW}Creating gam-config ConfigMap...${NC}"
  kubectl create configmap gam-config --from-literal=gam.cfg="[DEFAULT]
customer_id = my_customer
domain = automatearmy.com
oauth2_txt = /root/.gam/oauth2.txt
oauth2service_json = /root/.gam/oauth2service.json
client_secrets_json = /root/.gam/client_secrets.json" -n $NAMESPACE
fi

# Create the deployment
echo -e "${YELLOW}Creating deployment for session ${SESSION_ID}...${NC}"

# Create a temporary file for the deployment YAML
TEMP_FILE=$(mktemp)

cat > $TEMP_FILE << EOF
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
      - name: gam-container
        image: ${GAM_IMAGE}
        command: ["/bin/bash", "-c"]
        args:
        - |
          # Create credentials directory
          mkdir -p /root/.gam/credentials
          cp /root/.gam/* /root/.gam/credentials/ 2>/dev/null || true
          
          # Log the session start
          echo "Starting GAM session ${SESSION_ID}"
          echo "Command: ${COMMAND}"
          
          # Execute the initial command
          /gam/gam7/gam ${COMMAND} || echo "Command failed"
          
          # Keep the container running
          echo "Waiting for WebSocket commands..."
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
          mountPath: /root/.gam
        - name: gam-uploads
          mountPath: /gam/uploads
        - name: gam-config
          mountPath: /root/.gam/gam.cfg
          subPath: gam.cfg
      volumes:
      - name: gam-credentials
        secret:
          secretName: ${CREDENTIALS_SECRET}
      - name: gam-uploads
        emptyDir: {}
      - name: gam-config
        configMap:
          name: gam-config
EOF

# Apply the deployment
kubectl apply -f $TEMP_FILE

# Create the service
echo -e "${YELLOW}Creating service for session ${SESSION_ID}...${NC}"

# Create a temporary file for the service YAML
cat > $TEMP_FILE << EOF
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

# Apply the service
kubectl apply -f $TEMP_FILE

# Clean up
rm $TEMP_FILE

echo -e "${GREEN}=== WebSocket Session Created Successfully ===${NC}"
echo -e "${YELLOW}Session ID: ${SESSION_ID}${NC}"
echo -e "${YELLOW}WebSocket URL: ws://websocket-proxy.${NAMESPACE}.svc.cluster.local/ws/session/${SESSION_ID}/${NC}"
echo -e "${YELLOW}To test the session, run:${NC}"
echo -e "${GREEN}kubectl exec -it deployment/gam-session-${SESSION_ID} -n ${NAMESPACE} -- /gam/gam7/gam info domain${NC}"
