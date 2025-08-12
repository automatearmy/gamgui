#!/bin/bash

# This script runs Terraform to deploy GAMGUI infrastructure

# Exit on error
set -e

# Source common utilities and environment variables
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "${SCRIPT_DIR}/utils.sh"
source "${SCRIPT_DIR}/env.sh"

# Display banner
display_banner "Terraform Deployment" "Deploying GAMGUI infrastructure with Terraform"

# Get project details from argument or from gcloud config
PROJECT_ID=$(get_project_id "$1")

log_info "Project ID: ${COLOR_BOLD}${PROJECT_ID}${COLOR_RESET}"

# Prepare Terraform
log_step "Preparing Terraform"

BUCKET_NAME="${PROJECT_ID}-${TERRAFORM_STATE_BUCKET_SUFFIX}"

log_info "Working directory: $(pwd)"

# Initialize Terraform with backend configuration
log_step "Initializing Terraform"

terraform init -backend-config="bucket=${BUCKET_NAME}"

log_success "Terraform initialized successfully."

# Plan the deployment
log_step "Planning Terraform deployment"

terraform plan

log_success "Terraform plan completed successfully."

# Ask for confirmation
echo
if ask_confirmation "Do you want to proceed with the deployment?"; then
  # Apply the configuration
  log_step "Applying Terraform configuration"
  
  terraform apply -auto-approve
  
  log_success "Terraform deployment completed successfully."
  
  # Show outputs
  log_step "Deployment Results"
  
  echo
  log_info "GAMGUI has been deployed successfully!"
  log_info "Here are your deployment details:"
  echo
  terraform output
  
else
  log_info "Deployment cancelled by user."
  exit 0
fi

# Final message
log_step "GAMGUI deployment completed successfully!"
log_info "Your GAMGUI infrastructure is now deployed in project ${COLOR_BOLD}${PROJECT_ID}${COLOR_RESET}."
log_info "Check the outputs above for URLs and other important information."
