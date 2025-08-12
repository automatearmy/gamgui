locals {
  # OAuth secret names
  frontend_client_id_secret_name     = var.custom_frontend_client_id_secret_name != "" ? var.custom_frontend_client_id_secret_name : "gamgui-frontend-client-id"
  frontend_client_secret_secret_name = var.custom_frontend_client_secret_secret_name != "" ? var.custom_frontend_client_secret_secret_name : "gamgui-frontend-client-secret"
  backend_client_id_secret_name      = var.custom_backend_client_id_secret_name != "" ? var.custom_backend_client_id_secret_name : "gamgui-backend-client-id"
  backend_client_secret_secret_name  = var.custom_backend_client_secret_secret_name != "" ? var.custom_backend_client_secret_secret_name : "gamgui-backend-client-secret"

  # OAuth secrets configuration for easier management
  oauth_secrets = {
    frontend_client_id = {
      secret_name = local.frontend_client_id_secret_name
      accessors   = var.accessors.frontend
      description = "OAuth Client ID for GAMGUI Frontend (${title(var.environment)})"
    }
    frontend_client_secret = {
      secret_name = local.frontend_client_secret_secret_name
      accessors   = var.accessors.frontend
      description = "OAuth Client Secret for GAMGUI Frontend (${title(var.environment)})"
    }
    backend_client_id = {
      secret_name = local.backend_client_id_secret_name
      accessors   = var.accessors.backend
      description = "OAuth Client ID for GAMGUI Backend (${title(var.environment)})"
    }
    backend_client_secret = {
      secret_name = local.backend_client_secret_secret_name
      accessors   = var.accessors.backend
      description = "OAuth Client Secret for GAMGUI Backend (${title(var.environment)})"
    }
  }

  # Flatten accessor lists for IAM bindings
  oauth_secret_accessors = flatten([
    for secret_key, secret_config in local.oauth_secrets : [
      for accessor in secret_config.accessors : {
        secret_key  = secret_key
        secret_name = secret_config.secret_name
        accessor    = accessor
        binding_key = "${secret_key}-${replace(accessor, "@", "-at-")}"
      }
    ]
  ])
}
