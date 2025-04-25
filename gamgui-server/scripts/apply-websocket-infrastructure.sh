#!/bin/bash
# Script to apply the WebSocket infrastructure to Kubernetes

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Applying WebSocket Infrastructure ===${NC}"

# Default values
NAMESPACE="gamgui"
CREATE_DEFAULT_SESSION=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --namespace)
      NAMESPACE="$2"
      shift
      shift
      ;;
    --no-default-session)
      CREATE_DEFAULT_SESSION=false
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --namespace NS      Kubernetes namespace (default: gamgui)"
      echo "  --no-default-session Don't create a default session"
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
echo -e "${YELLOW}Create default session: ${CREATE_DEFAULT_SESSION}${NC}"

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
if ! kubectl get secret gam-credentials -n $NAMESPACE &> /dev/null; then
  echo -e "${RED}Error: Credentials secret gam-credentials does not exist${NC}"
  echo -e "${YELLOW}Please create the secret with your GAM credentials:${NC}"
  echo -e "${GREEN}kubectl create secret generic gam-credentials --from-file=oauth2.txt --from-file=client_secrets.json --from-file=oauth2service.json -n ${NAMESPACE}${NC}"
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

# Create a temporary file for the WebSocket proxy YAML
TEMP_FILE=$(mktemp)

cat > $TEMP_FILE << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: websocket-proxy
  namespace: ${NAMESPACE}
  labels:
    app: gamgui
    component: websocket-proxy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: websocket-proxy
  template:
    metadata:
      labels:
        app: websocket-proxy
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
          name: http
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "250m"
            memory: "256Mi"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: nginx-config
        configMap:
          name: nginx-config
---
apiVersion: v1
kind: Service
metadata:
  name: websocket-proxy
  namespace: ${NAMESPACE}
  labels:
    app: gamgui
    component: websocket-proxy
spec:
  selector:
    app: websocket-proxy
  ports:
  - port: 80
    targetPort: 80
    name: http
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  namespace: ${NAMESPACE}
  labels:
    app: gamgui
    component: websocket-proxy-config
data:
  nginx.conf: |
    worker_processes 1;
    events { worker_connections 1024; }

    http {
      default_type  application/octet-stream;
      sendfile        on;

      # Define resolver for Kubernetes DNS
      resolver kube-dns.kube-system.svc.cluster.local valid=5s;

      map \$http_upgrade \$connection_upgrade {
        default upgrade;
        ''      close;
      }

      server {
        listen 80;

        # Default route - return a simple response
        location / {
          return 200 "WebSocket proxy is running";
        }

        # Route for WebSocket sessions
        location ~ ^/ws/session/([^/]+)/ {
          set \$session_id \$1;
          set \$backend_service "gam-session-\$session_id.${NAMESPACE}.svc.cluster.local:8080";
          
          # Proxy to the appropriate GAM session service
          proxy_pass http://\$backend_service/;
          
          # WebSocket support
          proxy_http_version 1.1;
          proxy_set_header Upgrade \$http_upgrade;
          proxy_set_header Connection \$connection_upgrade;
          proxy_set_header Host \$host;
          proxy_set_header X-Real-IP \$remote_addr;
          proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto \$scheme;
          proxy_read_timeout 86400;
          proxy_send_timeout 86400;
        }
      }
    }
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: session-cleanup
  namespace: ${NAMESPACE}
  labels:
    app: gamgui
    component: session-cleanup
spec:
  schedule: "*/10 * * * *"  # Run every 10 minutes
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: gamgui
            component: session-cleanup-job
        spec:
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command: ["/bin/bash", "-c"]
            args:
            - |
              # Get the list of sessions
              SESSIONS=\$(kubectl get deployments -n ${NAMESPACE} -l app=gamgui,component=gam-session -o jsonpath='{.items[*].metadata.labels.session_id}')
              
              # Loop through each session
              for SESSION_ID in \$SESSIONS; do
                # Skip the default session
                if [ "\$SESSION_ID" == "default" ]; then
                  continue
                fi
                
                # Get the last activity time
                LAST_ACTIVITY=\$(kubectl get deployment -n ${NAMESPACE} -l session_id=\$SESSION_ID -o jsonpath='{.items[0].metadata.annotations.last_activity}')
                
                # If the last activity is not set, skip
                if [ -z "\$LAST_ACTIVITY" ]; then
                  continue
                fi
                
                # Calculate the time difference
                NOW=\$(date +%s)
                LAST_ACTIVITY_SECONDS=\$(date -d "\$LAST_ACTIVITY" +%s)
                DIFF=\$((NOW - LAST_ACTIVITY_SECONDS))
                
                # If the session is inactive for more than 1 hour, delete it
                if [ \$DIFF -gt 3600 ]; then
                  echo "Deleting inactive session: \$SESSION_ID"
                  kubectl delete deployment -n ${NAMESPACE} -l session_id=\$SESSION_ID
                  kubectl delete service -n ${NAMESPACE} -l session_id=\$SESSION_ID
                fi
              done
          restartPolicy: OnFailure
EOF

# Apply the WebSocket infrastructure
echo -e "${YELLOW}Applying WebSocket infrastructure...${NC}"
kubectl apply -f $TEMP_FILE

# Clean up
rm $TEMP_FILE

# Create a default session if requested
if [ "$CREATE_DEFAULT_SESSION" = true ]; then
  echo -e "${YELLOW}Creating default session...${NC}"
  ./scripts/create-websocket-session.sh --id default --namespace $NAMESPACE
fi

echo -e "${GREEN}=== WebSocket Infrastructure Applied Successfully ===${NC}"
echo -e "${YELLOW}WebSocket proxy URL: http://websocket-proxy.${NAMESPACE}.svc.cluster.local/${NC}"
echo -e "${YELLOW}To test the WebSocket proxy:${NC}"
echo -e "${GREEN}./scripts/test-websocket-proxy.sh --namespace ${NAMESPACE}${NC}"
echo -e "${YELLOW}To create a new session:${NC}"
echo -e "${GREEN}./scripts/create-websocket-session.sh --id <session-id> --namespace ${NAMESPACE}${NC}"
echo -e "${YELLOW}To test a session:${NC}"
echo -e "${GREEN}./scripts/test-websocket-session.sh --id <session-id> --namespace ${NAMESPACE}${NC}"
