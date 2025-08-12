# ================================================================================
# OUTPUTS
# ================================================================================

# Frontend OAuth Secrets
output "frontend_client_id_secret_name" {
  description = "The name of the Frontend OAuth Client ID secret"
  value       = data.google_secret_manager_secret.frontend_client_id.secret_id
}

output "frontend_client_secret_secret_name" {
  description = "The name of the Frontend OAuth Client Secret secret"
  value       = data.google_secret_manager_secret.frontend_client_secret.secret_id
}

# Backend OAuth Secrets
output "backend_client_id_secret_name" {
  description = "The name of the Backend OAuth Client ID secret"
  value       = data.google_secret_manager_secret.backend_client_id.secret_id
}

output "backend_client_secret_secret_name" {
  description = "The name of the Backend OAuth Client Secret secret"
  value       = data.google_secret_manager_secret.backend_client_secret.secret_id
}

# All OAuth secret names in a map for easy reference
output "oauth_secret_names" {
  description = "Map of all OAuth secret names"
  value = {
    frontend_client_id     = data.google_secret_manager_secret.frontend_client_id.secret_id
    frontend_client_secret = data.google_secret_manager_secret.frontend_client_secret.secret_id
    backend_client_id      = data.google_secret_manager_secret.backend_client_id.secret_id
    backend_client_secret  = data.google_secret_manager_secret.backend_client_secret.secret_id
  }
}

# All OAuth secret IDs in a map for easy reference
output "oauth_secret_ids" {
  description = "Map of all OAuth secret IDs"
  value = {
    frontend_client_id     = data.google_secret_manager_secret.frontend_client_id.id
    frontend_client_secret = data.google_secret_manager_secret.frontend_client_secret.id
    backend_client_id      = data.google_secret_manager_secret.backend_client_id.id
    backend_client_secret  = data.google_secret_manager_secret.backend_client_secret.id
  }
}
