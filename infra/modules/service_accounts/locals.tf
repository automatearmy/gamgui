# ================================================================================
# Locals
# ================================================================================

locals {
  # Environment suffix for service account names
  env_suffix = "-${var.environment}"

  # Service account IDs with environment support (shortened to fit 30 char limit)
  backend_account_id  = "sa-gamgui-be${local.env_suffix}"
  frontend_account_id = "sa-gamgui-fe${local.env_suffix}"
  session_account_id  = "sa-gamgui-session${local.env_suffix}"

  # Backend service account default roles
  backend_default_roles = [
    "roles/container.developer",
    "roles/container.admin",
    "roles/logging.logWriter",
    "roles/logging.viewer",
    "roles/monitoring.metricWriter",
    "roles/datastore.user",
    "roles/storage.admin",
    "roles/serviceusage.serviceUsageConsumer",
    "roles/iam.serviceAccountTokenCreator",
    "roles/secretmanager.secretAccessor",
    "roles/secretmanager.secretVersionAdder",
    "roles/secretmanager.admin"
  ]

  # Frontend service account default roles
  frontend_default_roles = [
    "roles/logging.logWriter",
    "roles/run.servicesInvoker",
    "roles/serviceusage.serviceUsageConsumer",
    "roles/iam.serviceAccountTokenCreator"
  ]

  # Session service account default roles
  session_default_roles = [
    "roles/storage.objectViewer",
    "roles/secretmanager.secretAccessor",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/datastore.user"
  ]

  # Combined roles (default + additional)
  backend_service_account_roles  = distinct(concat(local.backend_default_roles, var.additional_backend_roles))
  frontend_service_account_roles = distinct(concat(local.frontend_default_roles, var.additional_frontend_roles))
  session_service_account_roles  = distinct(concat(local.session_default_roles, var.additional_session_roles))

  # Service account configurations for easier management
  service_accounts = {
    backend = {
      account_id   = local.backend_account_id
      display_name = "Service Account for GAMGUI backend (${title(var.environment)})"
      description  = "Used by the GAMGUI backend service in ${var.environment} (terraform managed)"
      roles        = local.backend_service_account_roles
    }
    frontend = {
      account_id   = local.frontend_account_id
      display_name = "Service Account for GAMGUI frontend (${title(var.environment)})"
      description  = "Used by the GAMGUI frontend service in ${var.environment} (terraform managed)"
      roles        = local.frontend_service_account_roles
    }
    session = {
      account_id   = local.session_account_id
      display_name = "Service Account for GAMGUI Session Pods (${title(var.environment)})"
      description  = "Used by session pods to authenticate with GCP services in ${var.environment} (terraform managed)"
      roles        = local.session_service_account_roles
    }
  }
}
