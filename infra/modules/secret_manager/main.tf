/*
 * This module assumes that the following OAuth secrets have been previously created:
 * - Frontend OAuth Client ID (Web Application)
 * - Frontend OAuth Client Secret (Web Application)
 * - Backend OAuth Client ID (Desktop Application)
 * - Backend OAuth Client Secret (Desktop Application)
 *
 * These secrets must be created manually through the Google Cloud Console
 * as they contain OAuth credentials from the OAuth consent screen.
 */

# ================================================================================
# OAUTH SECRETS DATA SOURCES
# ================================================================================

# Frontend OAuth Client ID Secret
data "google_secret_manager_secret" "frontend_client_id" {
  project   = var.project_id
  secret_id = local.oauth_secrets.frontend_client_id.secret_name
}

# Frontend OAuth Client Secret
data "google_secret_manager_secret" "frontend_client_secret" {
  project   = var.project_id
  secret_id = local.oauth_secrets.frontend_client_secret.secret_name
}

# Backend OAuth Client ID Secret
data "google_secret_manager_secret" "backend_client_id" {
  project   = var.project_id
  secret_id = local.oauth_secrets.backend_client_id.secret_name
}

# Backend OAuth Client Secret
data "google_secret_manager_secret" "backend_client_secret" {
  project   = var.project_id
  secret_id = local.oauth_secrets.backend_client_secret.secret_name
}

# ================================================================================
# OAUTH SECRETS IAM BINDINGS
# ================================================================================

# OAuth secrets access bindings (using flattened structure from locals)
resource "google_secret_manager_secret_iam_member" "oauth_secret_access" {
  for_each = {
    for binding in local.oauth_secret_accessors : binding.binding_key => binding
  }

  project   = var.project_id
  secret_id = each.value.secret_name
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${each.value.accessor}"

  depends_on = [
    data.google_secret_manager_secret.frontend_client_id,
    data.google_secret_manager_secret.frontend_client_secret,
    data.google_secret_manager_secret.backend_client_id,
    data.google_secret_manager_secret.backend_client_secret
  ]
}
