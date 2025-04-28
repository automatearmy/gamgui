#!/bin/bash
# Script to verify WebSocket configuration in Kubernetes

# Set -e to exit on error
set -e

# Define variables
NAMESPACE=gamgui
PROXY_NAME=websocket-proxy

# Print header
echo "===== Verifying WebSocket Configuration ====="
echo "Namespace: ${NAMESPACE}"
echo "WebSocket Proxy: ${PROXY_NAME}"

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed"
    exit 1
fi

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud is not installed"
    exit 1
fi

# Configure kubectl to use the GKE cluster
echo "Configuring kubectl..."
gcloud container clusters get-credentials gamgui-cluster --region=us-central1 --project=gamgui-registry

# Check if the namespace exists
echo "Checking namespace..."
if ! kubectl get namespace ${NAMESPACE} &> /dev/null; then
    echo "Creating namespace ${NAMESPACE}..."
    kubectl create namespace ${NAMESPACE}
fi

# Check if the WebSocket proxy deployment exists
echo "Checking WebSocket proxy deployment..."
if ! kubectl get deployment ${PROXY_NAME} -n ${NAMESPACE} &> /dev/null; then
    echo "WebSocket proxy deployment not found!"
    echo "Applying WebSocket infrastructure..."
    
    # Check if the infrastructure file exists
    if [ -f "../gamgui-terraform/kubernetes/websocket-infrastructure.yaml" ]; then
        kubectl apply -f ../gamgui-terraform/kubernetes/websocket-infrastructure.yaml
    else
        echo "Error: WebSocket infrastructure file not found!"
        echo "Please check if the file exists at: ../gamgui-terraform/kubernetes/websocket-infrastructure.yaml"
        exit 1
    fi
else
    echo "WebSocket proxy deployment found."
    kubectl get deployment ${PROXY_NAME} -n ${NAMESPACE}
fi

# Check if the WebSocket proxy service exists
echo "Checking WebSocket proxy service..."
if ! kubectl get service ${PROXY_NAME} -n ${NAMESPACE} &> /dev/null; then
    echo "WebSocket proxy service not found!"
    echo "This is unusual as it should have been created with the deployment."
    echo "Please check the Kubernetes configuration."
    exit 1
else
    echo "WebSocket proxy service found."
    kubectl get service ${PROXY_NAME} -n ${NAMESPACE}
fi

# Check WebSocket proxy logs
echo "Checking WebSocket proxy logs..."
kubectl logs -l app=${PROXY_NAME} -n ${NAMESPACE} --tail=20

# Check if there are any pods in the namespace
echo "Checking for session pods..."
kubectl get pods -n ${NAMESPACE} -l component=gam-session

# Print summary
echo "===== WebSocket Configuration Verification Complete ====="
echo "WebSocket proxy status: $(kubectl get deployment ${PROXY_NAME} -n ${NAMESPACE} -o jsonpath='{.status.readyReplicas}')/$(kubectl get deployment ${PROXY_NAME} -n ${NAMESPACE} -o jsonpath='{.spec.replicas}') ready"
echo "To test the WebSocket connection, create a session and use the test-websocket-connection.js script."
