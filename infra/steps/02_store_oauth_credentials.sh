#!/bin/bash

# Helper script to store OAuth credentials in Secret Manager
# This script is called from the Cloud Shell tutorial

# Exit on error
set -e

# Source common utilities and environment variables
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "${SCRIPT_DIR}/utils.sh"
source "${SCRIPT_DIR}/env.sh"

# Display banner
display_banner "Store OAuth Credentials" "Storing OAuth client credentials in Secret Manager"

# Get project details from argument or from gcloud config
PROJECT_ID=$(get_project_id "$1")

log_info "Project ID: ${COLOR_BOLD}${PROJECT_ID}${COLOR_RESET}"

# Store Frontend OAuth Client credentials
log_step "Frontend OAuth Client (Web Application)"

# Get client ID and secret from user
FRONTEND_CLIENT_ID=$(ask_required "Enter Frontend OAuth Client ID: " "Client ID is required.")
FRONTEND_CLIENT_SECRET=$(ask_required "Enter Frontend OAuth Client Secret: " "Client Secret is required.")

# Store in Secret Manager
log_info "Storing frontend client credentials in Secret Manager..."

# Create secrets if they don't exist, otherwise update
if ! gcloud secrets describe "$FRONTEND_CLIENT_ID_SECRET" --project="$PROJECT_ID" &>/dev/null; then
  gcloud secrets create "$FRONTEND_CLIENT_ID_SECRET" \
    --replication-policy="automatic" \
    --project="$PROJECT_ID"
fi

if ! gcloud secrets describe "$FRONTEND_CLIENT_SECRET_SECRET" --project="$PROJECT_ID" &>/dev/null; then
  gcloud secrets create "$FRONTEND_CLIENT_SECRET_SECRET" \
    --replication-policy="automatic" \
    --project="$PROJECT_ID"
fi

# Update secret values
echo -n "$FRONTEND_CLIENT_ID" | gcloud secrets versions add "$FRONTEND_CLIENT_ID_SECRET" \
  --data-file=- \
  --project="$PROJECT_ID"

echo -n "$FRONTEND_CLIENT_SECRET" | gcloud secrets versions add "$FRONTEND_CLIENT_SECRET_SECRET" \
  --data-file=- \
  --project="$PROJECT_ID"

log_success "Frontend OAuth credentials stored successfully."

# Store Backend OAuth Client credentials
log_step "Backend OAuth Client (Desktop Application)"

# Get client ID and secret from user
BACKEND_CLIENT_ID=$(ask_required "Enter Backend OAuth Client ID: " "Client ID is required.")
BACKEND_CLIENT_SECRET=$(ask_required "Enter Backend OAuth Client Secret: " "Client Secret is required.")

# Store in Secret Manager
log_info "Storing backend client credentials in Secret Manager..."

# Create secrets if they don't exist, otherwise update
if ! gcloud secrets describe "$BACKEND_CLIENT_ID_SECRET" --project="$PROJECT_ID" &>/dev/null; then
  gcloud secrets create "$BACKEND_CLIENT_ID_SECRET" \
    --replication-policy="automatic" \
    --project="$PROJECT_ID"
fi

if ! gcloud secrets describe "$BACKEND_CLIENT_SECRET_SECRET" --project="$PROJECT_ID" &>/dev/null; then
  gcloud secrets create "$BACKEND_CLIENT_SECRET_SECRET" \
    --replication-policy="automatic" \
    --project="$PROJECT_ID"
fi

# Update secret values
echo -n "$BACKEND_CLIENT_ID" | gcloud secrets versions add "$BACKEND_CLIENT_ID_SECRET" \
  --data-file=- \
  --project="$PROJECT_ID"

echo -n "$BACKEND_CLIENT_SECRET" | gcloud secrets versions add "$BACKEND_CLIENT_SECRET_SECRET" \
  --data-file=- \
  --project="$PROJECT_ID"

log_success "Backend OAuth credentials stored successfully."

# Final message
log_step "OAuth credentials setup completed successfully!"
log_info "Your OAuth credentials are now stored in Secret Manager for project ${COLOR_BOLD}${PROJECT_ID}${COLOR_RESET}."
log_info "You can now proceed to the next step."
