#!/bin/bash

# This script configures IAP (Identity-Aware Proxy) access for the current user
# Grants necessary roles to access the GAMGUI frontend

# Exit on error
set -e

# Source common utilities and environment variables
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "${SCRIPT_DIR}/utils.sh"
source "${SCRIPT_DIR}/env.sh"

# Display banner
display_banner "Configure IAP Access" "Grant yourself access to the GAMGUI frontend"

# Get project details from argument or from gcloud config
PROJECT_ID=$(get_project_id "$1")
PROJECT_NUMBER=$(get_project_number "$PROJECT_ID")
USER_EMAIL=$(get_user_email)

log_info "Project ID: ${COLOR_BOLD}${PROJECT_ID}${COLOR_RESET}"
log_info "Project Number: ${COLOR_BOLD}${PROJECT_NUMBER}${COLOR_RESET}"
log_info "Your Email: ${COLOR_BOLD}${USER_EMAIL}${COLOR_RESET}"

# Read region from terraform.tfvars
log_step "Reading Deployment Configuration"

if [ -f "terraform.tfvars" ]; then
  REGION=$(grep "^region" terraform.tfvars | cut -d'=' -f2 | tr -d ' "')
  log_info "Region from terraform.tfvars: ${COLOR_BOLD}${REGION}${COLOR_RESET}"
else
  log_warning "terraform.tfvars not found. Using default region."
  REGION="${DEFAULT_REGION}"
fi

# Construct frontend URL
FRONTEND_URL="https://gamgui-frontend-${PROJECT_NUMBER}.${REGION}.run.app"

echo
log_info "GAMGUI Frontend URL: ${COLOR_BOLD}${FRONTEND_URL}${COLOR_RESET}"
echo

# Grant access to current user
log_step "Granting Access to Your Account"
log_info "Granting access to: ${COLOR_BOLD}${USER_EMAIL}${COLOR_RESET}"
echo

# Grant IAP HTTPS Resource Accessor role
log_info "Granting IAP HTTPS Resource Accessor role..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="user:${USER_EMAIL}" \
  --role="roles/iap.httpsResourceAccessor" \
  --condition=None \
  >/dev/null 2>&1

log_success "✓ Granted roles/iap.httpsResourceAccessor"

# Grant Cloud Run Invoker role for the frontend service
log_info "Granting Cloud Run Invoker role for frontend service..."
gcloud run services add-iam-policy-binding gamgui-frontend \
  --region="${REGION}" \
  --member="user:${USER_EMAIL}" \
  --role="roles/run.invoker" \
  --project="$PROJECT_ID" \
  >/dev/null 2>&1

log_success "✓ Granted roles/run.invoker for gamgui-frontend service"

echo
log_success "Access granted successfully!"
log_info "You can now access GAMGUI at: ${COLOR_BOLD}${FRONTEND_URL}${COLOR_RESET}"
echo

# Final message
log_step "Next Steps"
log_info "Your account (${COLOR_BOLD}${USER_EMAIL}${COLOR_RESET}) now has access to the GAMGUI application."
log_info "To grant access to other users in your organization, see the tutorial for instructions."
