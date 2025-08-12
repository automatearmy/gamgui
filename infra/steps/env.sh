#!/bin/bash

# This file contains environment variables and configuration for GAMGUI deployment

# --- GAMGUI Secret Names ---
# These are the names of the secrets that will be created in Secret Manager
FRONTEND_CLIENT_ID_SECRET="gamgui-frontend-client-id"
FRONTEND_CLIENT_SECRET_SECRET="gamgui-frontend-client-secret"
BACKEND_CLIENT_ID_SECRET="gamgui-backend-client-id"
BACKEND_CLIENT_SECRET_SECRET="gamgui-backend-client-secret"

# --- Bootstrap APIs ---
# Minimal APIs needed for the bootstrap process (Terraform will enable the rest)
BOOTSTRAP_APIS=(
  "secretmanager.googleapis.com"
  "storage.googleapis.com"
  "iam.googleapis.com"
  "cloudresourcemanager.googleapis.com"
)

# --- Terraform State Bucket ---
TERRAFORM_STATE_BUCKET_SUFFIX="gamgui-terraform-state"

# --- Terraform Configuration Secret ---
TF_VARS_SECRET_NAME="gamgui-terraform-tfvars"

# --- Default Configuration Values ---
DEFAULT_REGION="us-central1"
DEFAULT_REGISTRY_PROJECT="gamgui-registry"
DEFAULT_REGISTRY_REGION="us-central1"
DEFAULT_REGISTRY_REPOSITORY="gamgui-app"
