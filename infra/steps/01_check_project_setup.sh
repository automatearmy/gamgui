#!/bin/bash

# This script verifies the Google Cloud project setup for GAMGUI deployment
# It checks for required permissions, billing status, and enables minimal APIs

# Exit immediately if a command exits with a non-zero status.
set -e

# Source common utilities and environment variables
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "${SCRIPT_DIR}/utils.sh"
source "${SCRIPT_DIR}/env.sh"

# Display banner
display_banner "GAMGUI Project Setup" "Verifying your Google Cloud project setup for GAMGUI deployment"

# Check required commands
check_command "gcloud"
check_command "jq"

# Get project details from argument or from gcloud config
PROJECT_ID=$(get_project_id "$1")
USER_EMAIL=$(get_user_email)

log_info "Project ID: ${COLOR_BOLD}${PROJECT_ID}${COLOR_RESET}"
log_info "User: ${COLOR_BOLD}${USER_EMAIL}${COLOR_RESET}"

# Check permissions
log_step "Checking required permissions"

# Get IAM policy
policy_json=$(gcloud projects get-iam-policy "$PROJECT_ID" --format=json)

# Check for Owner role or Editor role
has_sufficient_permissions=false
if echo "$policy_json" | jq -e --arg user "user:$USER_EMAIL" '.bindings[] | select(.role == "roles/owner") | .members[] | select(. == $user)' &>/dev/null; then
  log_success "User has 'roles/owner' role."
  has_sufficient_permissions=true
elif echo "$policy_json" | jq -e --arg user "user:$USER_EMAIL" '.bindings[] | select(.role == "roles/editor") | .members[] | select(. == $user)' &>/dev/null; then
  log_success "User has 'roles/editor' role."
  has_sufficient_permissions=true
fi

if ! $has_sufficient_permissions; then
  log_error "User '$USER_EMAIL' needs either 'roles/owner' or 'roles/editor' role on project '$PROJECT_ID'."
  log_info "Please grant the appropriate role to '$USER_EMAIL' in the IAM settings:"
  log_info "https://console.cloud.google.com/iam-admin/iam?project=$PROJECT_ID"
  exit 1
fi

# Check billing
log_step "Checking billing status"

# Check if billing is enabled
if gcloud billing projects describe "$PROJECT_ID" --format="value(billingEnabled)" 2>/dev/null | grep -q "True"; then
  log_success "Billing is enabled for project '$PROJECT_ID'."
else
  log_error "Billing is not enabled for project '$PROJECT_ID'."
  log_info "Please enable billing for the project in the Cloud Console:"
  log_info "https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
  exit 1
fi

# Enable required APIs for bootstrap
log_step "Enabling required APIs for bootstrap"

log_info "Enabling ${#BOOTSTRAP_APIS[@]} required APIs for setup..."

# Enable APIs
for api in "${BOOTSTRAP_APIS[@]}"; do
  log_info "Enabling $api..."
  gcloud services enable "$api" --project="$PROJECT_ID" &>/dev/null
done

log_success "Bootstrap APIs enabled successfully."

# Final message
log_step "Project setup check completed successfully!"
log_info "Your project ${COLOR_BOLD}${PROJECT_ID}${COLOR_RESET} is ready for GAMGUI deployment."
log_info "You can now proceed to the next step."
