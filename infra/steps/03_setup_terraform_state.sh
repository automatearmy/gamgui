#!/bin/bash

# This script sets up the Terraform state bucket for GAMGUI deployment

# Exit on error
set -e

# Source common utilities and environment variables
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "${SCRIPT_DIR}/utils.sh"
source "${SCRIPT_DIR}/env.sh"

# Display banner
display_banner "Terraform State Setup" "Creating Terraform state bucket for GAMGUI deployment"

# Get project details from argument or from gcloud config
PROJECT_ID=$(get_project_id "$1")

log_info "Project ID: ${COLOR_BOLD}${PROJECT_ID}${COLOR_RESET}"

# Create Terraform state bucket
log_step "Creating Terraform state bucket"

BUCKET_NAME="${PROJECT_ID}-${TERRAFORM_STATE_BUCKET_SUFFIX}"

# Check if bucket already exists
if gsutil ls -b gs://"$BUCKET_NAME" &>/dev/null; then
  log_success "Terraform state bucket already exists: gs://${BUCKET_NAME}"
else
  log_info "Creating Terraform state bucket: gs://${BUCKET_NAME}"
  
  # Create bucket
  gsutil mb -p "$PROJECT_ID" -l "$DEFAULT_REGION" gs://"$BUCKET_NAME"
  
  # Enable versioning for state file history
  gsutil versioning set on gs://"$BUCKET_NAME"
  
  log_success "Terraform state bucket created successfully."
fi

# Final message
log_step "Terraform state setup completed successfully!"
log_info "Your Terraform state bucket is ready for project ${COLOR_BOLD}${PROJECT_ID}${COLOR_RESET}."
log_info "You can now proceed to the next step."
