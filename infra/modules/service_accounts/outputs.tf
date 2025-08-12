# ================================================================================
# OUTPUTS
# ================================================================================

# Backend Service Account Outputs
output "backend_service_account_email" {
  description = "The email address of the backend service account"
  value       = google_service_account.backend_service_account.email
}

# Frontend Service Account Outputs
output "frontend_service_account_email" {
  description = "The email address of the frontend service account"
  value       = google_service_account.frontend_service_account.email
}

# Session Service Account Outputs
output "session_service_account_email" {
  description = "The email address of the Session service account"
  value       = google_service_account.session_service_account.email
}

# All service account emails in a map for easy reference
output "service_account_emails" {
  description = "Map of all service account emails"
  value = {
    backend  = google_service_account.backend_service_account.email
    frontend = google_service_account.frontend_service_account.email
    session  = google_service_account.session_service_account.email
  }
}

# All service account IDs in a map for easy reference
output "service_account_ids" {
  description = "Map of all service account unique IDs"
  value = {
    backend  = google_service_account.backend_service_account.unique_id
    frontend = google_service_account.frontend_service_account.unique_id
    session  = google_service_account.session_service_account.unique_id
  }
}

# Role assignments for documentation and verification
output "assigned_roles" {
  description = "Map of service accounts and their assigned roles"
  value = {
    backend  = local.service_accounts.backend.roles
    frontend = local.service_accounts.frontend.roles
    session  = local.service_accounts.session.roles
  }
}
