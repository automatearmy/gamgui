#!/bin/bash
# Script to deploy and test the Kubernetes integration in the cloud

# Set error handling
set -e

# Configuration
PROJECT_ID="gamgui-registry"
REGION="us-central1"
CLUSTER_NAME="gamgui-cluster"
NAMESPACE="gamgui"
SERVICE_ACCOUNT="gam-service-account"
GAM_IMAGE="gcr.io/gamgui-registry/docker-gam7:latest"
SERVER_IMAGE="gcr.io/gamgui-registry/gamgui-server-image:latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Function to print section header
print_section() {
  echo -e "\n${YELLOW}=== $1 ===${NC}\n"
}

# Function to print success message
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error message
print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_section "Checking Prerequisites"

if ! command_exists gcloud; then
  print_error "gcloud is not installed. Please install the Google Cloud SDK."
  exit 1
else
  print_success "gcloud is installed"
fi

if ! command_exists kubectl; then
  print_error "kubectl is not installed. Please install kubectl."
  exit 1
else
  print_success "kubectl is installed"
fi

if ! command_exists docker; then
  print_error "docker is not installed. Please install Docker."
  exit 1
else
  print_success "docker is installed"
fi

# Authenticate with Google Cloud
print_section "Authenticating with Google Cloud"
gcloud auth login --quiet

# Set the project
print_section "Setting Project"
gcloud config set project $PROJECT_ID
print_success "Project set to $PROJECT_ID"

# Check if the cluster exists
print_section "Checking GKE Cluster"
if gcloud container clusters list --region=$REGION --filter="name=$CLUSTER_NAME" | grep -q $CLUSTER_NAME; then
  print_success "Cluster $CLUSTER_NAME exists"
else
  print_error "Cluster $CLUSTER_NAME does not exist"
  
  # Ask if the user wants to create the cluster
  read -p "Do you want to create the cluster? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_section "Creating GKE Cluster"
    gcloud container clusters create $CLUSTER_NAME \
      --region=$REGION \
      --num-nodes=1 \
      --machine-type=e2-standard-2
    print_success "Cluster $CLUSTER_NAME created"
  else
    print_error "Cluster is required for testing. Exiting."
    exit 1
  fi
fi

# Configure kubectl to use the cluster
print_section "Configuring kubectl"
gcloud container clusters get-credentials $CLUSTER_NAME --region=$REGION --project=$PROJECT_ID
print_success "kubectl configured to use cluster $CLUSTER_NAME"

# Check if the namespace exists
print_section "Checking Namespace"
if kubectl get namespace $NAMESPACE 2>/dev/null; then
  print_success "Namespace $NAMESPACE exists"
else
  print_section "Creating Namespace"
  kubectl create namespace $NAMESPACE
  print_success "Namespace $NAMESPACE created"
fi

# Check if the service account exists
print_section "Checking Service Account"
if kubectl get serviceaccount -n $NAMESPACE $SERVICE_ACCOUNT 2>/dev/null; then
  print_success "Service account $SERVICE_ACCOUNT exists"
else
  print_section "Creating Service Account"
  kubectl create serviceaccount -n $NAMESPACE $SERVICE_ACCOUNT
  print_success "Service account $SERVICE_ACCOUNT created"
  
  # Create a role and role binding for the service account
  print_section "Creating Role and Role Binding"
  kubectl create role gam-role \
    --verb=get,list,watch,create,update,patch,delete \
    --resource=pods,pods/exec,pods/log \
    -n $NAMESPACE
  
  kubectl create rolebinding gam-role-binding \
    --role=gam-role \
    --serviceaccount=$NAMESPACE:$SERVICE_ACCOUNT \
    -n $NAMESPACE
  
  print_success "Role and role binding created"
fi

# Check if the GAM image exists
print_section "Checking GAM Image"
if gcloud container images list-tags gcr.io/gamgui-registry/docker-gam7 2>/dev/null | grep -q latest; then
  print_success "GAM image exists"
else
  print_error "GAM image does not exist"
  
  # Ask if the user wants to build and push the GAM image
  read -p "Do you want to build and push the GAM image? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_section "Building and Pushing GAM Image"
    ./build-and-push-gam.sh
    print_success "GAM image built and pushed"
  else
    print_error "GAM image is required for testing. Exiting."
    exit 1
  fi
fi

# Check if the server image exists
print_section "Checking Server Image"
if gcloud container images list-tags gcr.io/gamgui-registry/gamgui-server-image 2>/dev/null | grep -q latest; then
  print_success "Server image exists"
else
  print_error "Server image does not exist"
  
  # Ask if the user wants to build and push the server image
  read -p "Do you want to build and push the server image? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_section "Building and Pushing Server Image"
    ./build-and-push-server.sh
    print_success "Server image built and pushed"
  else
    print_error "Server image is required for testing. Exiting."
    exit 1
  fi
fi

# Deploy the server to Cloud Run
print_section "Deploying Server to Cloud Run"
gcloud run deploy gamgui-server \
  --image=$SERVER_IMAGE \
  --platform=managed \
  --region=$REGION \
  --set-env-vars="GKE_CLUSTER_NAME=$CLUSTER_NAME,GKE_CLUSTER_LOCATION=$REGION,K8S_NAMESPACE=$NAMESPACE,K8S_SERVICE_ACCOUNT=$SERVICE_ACCOUNT,GAM_IMAGE=$GAM_IMAGE" \
  --allow-unauthenticated

print_success "Server deployed to Cloud Run"

# Get the server URL
SERVER_URL=$(gcloud run services describe gamgui-server --region=$REGION --format="value(status.url)")
print_success "Server URL: $SERVER_URL"

# Test the server
print_section "Testing Server"
echo "To test the server, follow these steps:"
echo "1. Open the server URL in your browser: $SERVER_URL"
echo "2. Create a new session"
echo "3. Run the following command to check if a pod was created:"
echo "   kubectl get pods -n $NAMESPACE"
echo "4. Run the following command to check the logs of the pod:"
echo "   kubectl logs -n $NAMESPACE <pod-name>"
echo "5. Execute some GAM commands in the session"
echo "6. Check the logs again to see if the commands were executed"
echo "7. Close the session"
echo "8. Check if the pod was deleted:"
echo "   kubectl get pods -n $NAMESPACE"

# Cleanup
print_section "Cleanup"
echo "To clean up the resources, run the following commands:"
echo "1. Delete the Cloud Run service:"
echo "   gcloud run services delete gamgui-server --region=$REGION"
echo "2. Delete the namespace:"
echo "   kubectl delete namespace $NAMESPACE"
echo "3. Delete the cluster:"
echo "   gcloud container clusters delete $CLUSTER_NAME --region=$REGION"

print_section "Done"
echo "The Kubernetes integration has been deployed and is ready for testing."
