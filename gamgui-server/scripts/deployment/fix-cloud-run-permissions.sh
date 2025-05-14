#!/bin/bash

# Script to verify and fix Cloud Run permissions to access the GKE cluster

set -e

echo "=== Verifying and fixing Cloud Run permissions for GKE ==="

# Verify gcloud authentication
echo "Verifying gcloud authentication..."
ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
if [ -z "$ACCOUNT" ]; then
  echo "❌ No authenticated gcloud account. Run 'gcloud auth login' first."
  exit 1
fi
echo "✅ Authenticated as: $ACCOUNT"

# Verify project configuration
echo "Verifying project configuration..."
PROJECT=$(gcloud config get-value project)
if [ -z "$PROJECT" ]; then
  echo "❌ No project configured. Run 'gcloud config set project PROJECT_ID' first."
  exit 1
fi
echo "✅ Using project: $PROJECT"

# Get GKE cluster information
echo "Getting GKE cluster information..."
CLUSTERS=$(gcloud container clusters list --format="value(name)")
if [ -z "$CLUSTERS" ]; then
  echo "❌ No GKE cluster found in project $PROJECT."
  exit 1
fi

# If there's more than one cluster, use the first one
CLUSTER_NAME=$(echo "$CLUSTERS" | head -n 1)
CLUSTER_LOCATION=$(gcloud container clusters list --filter="name=$CLUSTER_NAME" --format="value(location)")
echo "✅ Using cluster: $CLUSTER_NAME in $CLUSTER_LOCATION"

# Get the Cloud Run service account
echo "Getting Cloud Run service account..."
SERVICE_ACCOUNT=$(gcloud run services describe gamgui-server --region=us-central1 --project=$PROJECT --format="value(spec.template.spec.serviceAccountName)")
if [ -z "$SERVICE_ACCOUNT" ]; then
  echo "❌ Could not get the Cloud Run service account."
  exit 1
fi
echo "✅ Cloud Run service account: $SERVICE_ACCOUNT"

# Check if the service account already has the cluster viewer role
echo "Checking current service account permissions..."
HAS_CLUSTER_VIEWER=$(gcloud projects get-iam-policy $PROJECT --format="json(bindings)" | grep -A 10 "roles/container.clusterViewer" | grep -c "$SERVICE_ACCOUNT" || true)
HAS_CLUSTER_ADMIN=$(gcloud projects get-iam-policy $PROJECT --format="json(bindings)" | grep -A 10 "roles/container.admin" | grep -c "$SERVICE_ACCOUNT" || true)
HAS_CONTAINER_DEVELOPER=$(gcloud projects get-iam-policy $PROJECT --format="json(bindings)" | grep -A 10 "roles/container.developer" | grep -c "$SERVICE_ACCOUNT" || true)

# Add necessary roles
echo "Adding necessary roles to the service account..."

# Add cluster viewer role if it doesn't have it
if [ "$HAS_CLUSTER_VIEWER" -eq "0" ]; then
  echo "Adding cluster viewer role (container.clusterViewer)..."
  gcloud projects add-iam-policy-binding $PROJECT \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/container.clusterViewer"
else
  echo "✅ The service account already has the cluster viewer role."
fi

# Add container developer role if it doesn't have it
if [ "$HAS_CONTAINER_DEVELOPER" -eq "0" ]; then
  echo "Adding container developer role (container.developer)..."
  gcloud projects add-iam-policy-binding $PROJECT \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/container.developer"
else
  echo "✅ The service account already has the container developer role."
fi

# Add cluster admin role if it doesn't have it (may be necessary for some operations)
if [ "$HAS_CLUSTER_ADMIN" -eq "0" ]; then
  echo "Adding cluster admin role (container.admin)..."
  gcloud projects add-iam-policy-binding $PROJECT \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/container.admin"
else
  echo "✅ The service account already has the cluster admin role."
fi

# Check if the service account has permission to use the Kubernetes API
echo "Checking if the service account has permission to use the Kubernetes API..."
gcloud container clusters get-credentials $CLUSTER_NAME --region=$CLUSTER_LOCATION --project=$PROJECT

# Create a ClusterRoleBinding for the service account
echo "Creating ClusterRoleBinding for the service account..."
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cloud-run-gke-access
subjects:
- kind: User
  name: $SERVICE_ACCOUNT
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
EOF

# Restart the Cloud Run service to apply the changes
echo "Restarting the Cloud Run service to apply the changes..."
gcloud run services update gamgui-server --region=us-central1 --project=$PROJECT --no-traffic

# Restore traffic to the Cloud Run service
echo "Restoring traffic to the Cloud Run service..."
gcloud run services update-traffic gamgui-server --region=us-central1 --project=$PROJECT --to-latest

echo "=== Permissions fixed successfully ==="
echo "Now Cloud Run should have the necessary permissions to access the GKE cluster."
echo "Test session creation again."
