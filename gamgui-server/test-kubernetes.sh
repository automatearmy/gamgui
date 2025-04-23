#!/bin/bash
# Script to test the Kubernetes integration

# Set error handling
set -e

# Check if kubectl is configured
if ! kubectl cluster-info &>/dev/null; then
  echo "Error: kubectl is not configured or the cluster is not accessible."
  echo "Please configure kubectl to access your GKE cluster first."
  echo "You can use the following command to configure kubectl:"
  echo "gcloud container clusters get-credentials <cluster-name> --region <region> --project <project-id>"
  exit 1
fi

# Get the current namespace
CURRENT_NAMESPACE=$(kubectl config view --minify --output 'jsonpath={..namespace}')
if [ -z "$CURRENT_NAMESPACE" ]; then
  CURRENT_NAMESPACE="default"
fi

echo "Current Kubernetes namespace: $CURRENT_NAMESPACE"

# Set environment variables for testing
export GKE_CLUSTER_NAME=${GKE_CLUSTER_NAME:-"gamgui-cluster"}
export GKE_CLUSTER_LOCATION=${GKE_CLUSTER_LOCATION:-"us-central1"}
export K8S_NAMESPACE=${K8S_NAMESPACE:-"gamgui"}
export K8S_SERVICE_ACCOUNT=${K8S_SERVICE_ACCOUNT:-"gam-service-account"}
export GAM_IMAGE=${GAM_IMAGE:-"gcr.io/gamgui-registry/docker-gam7:latest"}

echo "Using the following environment variables:"
echo "GKE_CLUSTER_NAME: $GKE_CLUSTER_NAME"
echo "GKE_CLUSTER_LOCATION: $GKE_CLUSTER_LOCATION"
echo "K8S_NAMESPACE: $K8S_NAMESPACE"
echo "K8S_SERVICE_ACCOUNT: $K8S_SERVICE_ACCOUNT"
echo "GAM_IMAGE: $GAM_IMAGE"

# Check if the namespace exists
if ! kubectl get namespace $K8S_NAMESPACE &>/dev/null; then
  echo "Namespace $K8S_NAMESPACE does not exist. Creating it..."
  kubectl create namespace $K8S_NAMESPACE
fi

# Check if the service account exists
if ! kubectl get serviceaccount -n $K8S_NAMESPACE $K8S_SERVICE_ACCOUNT &>/dev/null; then
  echo "Service account $K8S_SERVICE_ACCOUNT does not exist in namespace $K8S_NAMESPACE."
  echo "Creating a temporary service account for testing..."
  kubectl create serviceaccount -n $K8S_NAMESPACE $K8S_SERVICE_ACCOUNT
  
  # Create a role and role binding for the service account
  echo "Creating a role and role binding for the service account..."
  kubectl create role gam-role \
    --verb=get,list,watch,create,update,patch,delete \
    --resource=pods,pods/exec,pods/log \
    -n $K8S_NAMESPACE
  
  kubectl create rolebinding gam-role-binding \
    --role=gam-role \
    --serviceaccount=$K8S_NAMESPACE:$K8S_SERVICE_ACCOUNT \
    -n $K8S_NAMESPACE
fi

# Run the test
echo "Running Kubernetes integration test..."
node test-kubernetes.js

# Check if the test was successful
if [ $? -eq 0 ]; then
  echo "Kubernetes integration test completed successfully!"
else
  echo "Kubernetes integration test failed."
  exit 1
fi
