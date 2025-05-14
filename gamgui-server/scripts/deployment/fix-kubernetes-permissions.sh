#!/bin/bash

# Script to fix Kubernetes permissions for the Cloud Run service account
# This script creates the service account in the gamgui namespace and grants the necessary permissions

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Fixing Kubernetes permissions for the Cloud Run service account ===${NC}"

# Configuration
PROJECT_ID=${PROJECT_ID:-"gamgui-registry"}
GKE_CLUSTER_NAME=${GKE_CLUSTER_NAME:-"gamgui-cluster"}
GKE_CLUSTER_LOCATION=${GKE_CLUSTER_LOCATION:-"us-central1"}
K8S_NAMESPACE=${K8S_NAMESPACE:-"gamgui"}
SERVICE_ACCOUNT=${SERVICE_ACCOUNT:-"gamgui-server-sa"}

echo "Current configuration:"
echo "Project ID: ${PROJECT_ID}"
echo "GKE Cluster Name: ${GKE_CLUSTER_NAME}"
echo "GKE Cluster Location: ${GKE_CLUSTER_LOCATION}"
echo "Kubernetes Namespace: ${K8S_NAMESPACE}"
echo "Service Account: ${SERVICE_ACCOUNT}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}Error: gcloud is not installed${NC}"
  exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
  echo -e "${RED}Error: kubectl is not installed${NC}"
  exit 1
fi

# Check if the user is authenticated in gcloud
if ! gcloud auth print-access-token &> /dev/null; then
  echo -e "${RED}Error: You are not authenticated in gcloud${NC}"
  echo -e "${YELLOW}Run 'gcloud auth login' to authenticate${NC}"
  exit 1
fi

# Check if the project is configured
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [[ -z "${CURRENT_PROJECT}" ]]; then
  echo -e "${RED}Error: No Google Cloud project configured${NC}"
  echo -e "${YELLOW}Run 'gcloud config set project ${PROJECT_ID}' to configure the project${NC}"
  exit 1
fi

if [[ "${CURRENT_PROJECT}" != "${PROJECT_ID}" ]]; then
  echo -e "${YELLOW}Warning: The current project (${CURRENT_PROJECT}) is different from the specified project (${PROJECT_ID})${NC}"
  read -p "Do you want to continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Operation canceled by the user${NC}"
    exit 1
  fi
fi

# Check if the GKE cluster exists
echo -e "${YELLOW}Checking if the GKE cluster ${GKE_CLUSTER_NAME} exists...${NC}"
if ! gcloud container clusters describe ${GKE_CLUSTER_NAME} --region ${GKE_CLUSTER_LOCATION} --project ${PROJECT_ID} &> /dev/null; then
  echo -e "${RED}Error: The GKE cluster ${GKE_CLUSTER_NAME} does not exist in project ${PROJECT_ID}, region ${GKE_CLUSTER_LOCATION}${NC}"
  exit 1
fi

# Configure kubectl to access the GKE cluster
echo -e "${YELLOW}Configuring kubectl to access the GKE cluster...${NC}"
gcloud container clusters get-credentials ${GKE_CLUSTER_NAME} --region ${GKE_CLUSTER_LOCATION} --project ${PROJECT_ID}

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Error configuring kubectl to access the GKE cluster${NC}"
  exit 1
fi

# Check if the namespace exists
echo -e "${YELLOW}Checking if the namespace ${K8S_NAMESPACE} exists...${NC}"
if ! kubectl get namespace ${K8S_NAMESPACE} &> /dev/null; then
  echo -e "${YELLOW}Namespace ${K8S_NAMESPACE} does not exist. Creating...${NC}"
  kubectl create namespace ${K8S_NAMESPACE}
  
  if [[ $? -ne 0 ]]; then
    echo -e "${RED}Error creating namespace ${K8S_NAMESPACE}${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}Namespace ${K8S_NAMESPACE} exists${NC}"
fi

# Check if the service account exists in the namespace
echo -e "${YELLOW}Checking if the service account ${SERVICE_ACCOUNT} exists in namespace ${K8S_NAMESPACE}...${NC}"
if ! kubectl get serviceaccount ${SERVICE_ACCOUNT} -n ${K8S_NAMESPACE} &> /dev/null; then
  echo -e "${YELLOW}Service account ${SERVICE_ACCOUNT} does not exist in namespace ${K8S_NAMESPACE}. Creating...${NC}"
  
  # Apply the service account YAML file
  kubectl apply -f $(dirname "$0")/../../kubernetes/gamgui-server-sa.yaml
  
  if [[ $? -ne 0 ]]; then
    echo -e "${RED}Error creating service account ${SERVICE_ACCOUNT} in namespace ${K8S_NAMESPACE}${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}Service account ${SERVICE_ACCOUNT} exists in namespace ${K8S_NAMESPACE}${NC}"
fi

# Apply the Role Binding
echo -e "${YELLOW}Applying Role Binding for the service account ${SERVICE_ACCOUNT}...${NC}"
kubectl apply -f $(dirname "$0")/../../kubernetes/gamgui-server-sa-role-binding.yaml

if [[ $? -ne 0 ]]; then
  echo -e "${RED}Error applying Role Binding for the service account ${SERVICE_ACCOUNT}${NC}"
  exit 1
fi

# Check if the service account now has permissions
echo -e "${YELLOW}Checking if the service account ${SERVICE_ACCOUNT} has permissions to create pods...${NC}"
if kubectl auth can-i create pods --namespace=${K8S_NAMESPACE} --as=system:serviceaccount:${K8S_NAMESPACE}:${SERVICE_ACCOUNT} | grep -q "yes"; then
  echo -e "${GREEN}The service account ${SERVICE_ACCOUNT} has permissions to create pods in namespace ${K8S_NAMESPACE}${NC}"
else
  echo -e "${RED}The service account ${SERVICE_ACCOUNT} still does not have permissions to create pods in namespace ${K8S_NAMESPACE}${NC}"
  echo -e "${YELLOW}Check if the Role Binding was applied correctly${NC}"
  exit 1
fi

echo -e "${GREEN}=== Kubernetes permissions fixed successfully ===${NC}"
echo -e "${YELLOW}Now Cloud Run should be able to create pods in the GKE cluster${NC}"
