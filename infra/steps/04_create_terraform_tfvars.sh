#!/bin/bash

# This script creates the terraform.tfvars file for GAMGUI deployment

# Exit on error
set -e

# Source common utilities and environment variables
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "${SCRIPT_DIR}/utils.sh"
source "${SCRIPT_DIR}/env.sh"

# Display banner
display_banner "Terraform Configuration" "Creating terraform.tfvars file for GAMGUI deployment"

# Get project details from argument or from gcloud config
PROJECT_ID=$(get_project_id "$1")

log_info "Project ID: ${COLOR_BOLD}${PROJECT_ID}${COLOR_RESET}"

# Collect configuration variables
log_step "Collecting configuration variables"

# Domain
DOMAIN=$(ask_with_default "Enter your Google Workspace domain" "example.com" "This is used for authentication")
validate_domain "$DOMAIN"

# Environment
ENVIRONMENT=$(ask_with_default "Enter environment" "staging" "Valid options: development, staging, production")
validate_environment "$ENVIRONMENT"

# Region
REGION=$(ask_with_default "Enter deployment region" "$DEFAULT_REGION" "Google Cloud region where resources will be deployed")

# Create terraform.tfvars file
log_step "Creating terraform.tfvars file"

TFVARS_FILE="./terraform.tfvars"

cat > "$TFVARS_FILE" << EOF
# GAMGUI Terraform Configuration
domain = "$DOMAIN"
environment = "$ENVIRONMENT"
region = "$REGION"
project_id = "$PROJECT_ID"
EOF

log_success "terraform.tfvars file created successfully."

# Store terraform.tfvars in Secret Manager
log_step "Storing terraform.tfvars in Secret Manager"

if gcloud secrets describe "${TF_VARS_SECRET_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
  log_info "Secret ${TF_VARS_SECRET_NAME} already exists. Adding a new version..."
  gcloud secrets versions add "${TF_VARS_SECRET_NAME}" --data-file="$TFVARS_FILE" --project="${PROJECT_ID}"
  log_success "New version added to secret ${TF_VARS_SECRET_NAME}."
else
  log_info "Secret ${TF_VARS_SECRET_NAME} does not exist. Creating new secret..."
  gcloud secrets create "${TF_VARS_SECRET_NAME}" --replication-policy="automatic" --data-file="$TFVARS_FILE" --project="${PROJECT_ID}"
  log_success "Secret ${TF_VARS_SECRET_NAME} created and initial version added."
fi

# Display file contents
log_info "Configuration file contents:"
echo "----------------------------------------"
cat "$TFVARS_FILE"
echo "----------------------------------------"

# Final message
log_step "Terraform configuration setup completed successfully!"
log_info "Your terraform.tfvars file has been created and stored in Secret Manager for project ${COLOR_BOLD}${PROJECT_ID}${COLOR_RESET}."
log_info "You can now proceed to the next step."
