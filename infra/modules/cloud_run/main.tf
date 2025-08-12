# ================================================================================
# CLOUD RUN SERVICES
# ================================================================================

# Backend Service (Internal Only)
resource "google_cloud_run_v2_service" "backend" {
  name                = local.backend_config.name
  location            = var.region
  project             = var.project_id
  ingress             = local.backend_config.ingress
  launch_stage        = "GA"
  deletion_protection = false
  labels              = local.backend_config.labels

  template {
    service_account = local.backend_config.service_account
    timeout         = local.backend_config.timeout
    labels          = local.backend_config.labels

    # WebSocket optimization - Session affinity for sticky sessions
    session_affinity = true

    # VPC network configuration
    vpc_access {
      egress = var.vpc_egress_setting
      network_interfaces {
        network    = var.network
        subnetwork = var.subnet
      }
    }

    # Container configuration
    containers {
      image = local.backend_config.image

      # Default environment variables
      dynamic "env" {
        for_each = local.default_env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      # Service-specific environment variables
      env {
        name  = "BACKEND_SERVICE_ACCOUNT_EMAIL"
        value = var.backend_service_account_email
      }

      # OAuth credentials from Secret Manager
      env {
        name = "BACKEND_OAUTH_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = var.backend_client_id_secret_name
            version = "latest"
          }
        }
      }

      env {
        name = "BACKEND_OAUTH_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = var.backend_client_secret_secret_name
            version = "latest"
          }
        }
      }

      # Frontend OAuth credentials (for backend to validate frontend requests)
      env {
        name = "FRONTEND_OAUTH_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = var.frontend_client_id_secret_name
            version = "latest"
          }
        }
      }

      env {
        name = "FRONTEND_OAUTH_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = var.frontend_client_secret_secret_name
            version = "latest"
          }
        }
      }
    }
  }
}

# Frontend Service (Public with IAP)
resource "google_cloud_run_v2_service" "frontend" {
  provider            = google-beta
  name                = local.frontend_config.name
  location            = var.region
  project             = var.project_id
  ingress             = local.frontend_config.ingress
  launch_stage        = "BETA"
  deletion_protection = false
  iap_enabled         = true
  labels              = local.frontend_config.labels

  template {
    service_account = local.frontend_config.service_account
    timeout         = local.frontend_config.timeout
    labels          = local.frontend_config.labels

    # WebSocket optimization - Session affinity for sticky sessions
    session_affinity = true

    # VPC network configuration
    vpc_access {
      egress = var.vpc_egress_setting
      network_interfaces {
        network    = var.network
        subnetwork = var.subnet
      }
    }

    # Container configuration
    containers {
      image = local.frontend_config.image

      # Default environment variables
      dynamic "env" {
        for_each = local.default_env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      # Service-specific environment variables
      env {
        name  = "FRONTEND_SERVICE_ACCOUNT_EMAIL"
        value = var.frontend_service_account_email
      }

      env {
        name  = "BACKEND_URL"
        value = google_cloud_run_v2_service.backend.uri
      }

      # OAuth credentials from Secret Manager
      env {
        name = "FRONTEND_OAUTH_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = var.frontend_client_id_secret_name
            version = "latest"
          }
        }
      }

      env {
        name = "FRONTEND_OAUTH_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = var.frontend_client_secret_secret_name
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [google_cloud_run_v2_service.backend]
}

# ================================================================================
# IAM BINDINGS
# ================================================================================

# Allow unauthenticated access to the backend API service
resource "google_cloud_run_service_iam_member" "backend_invoker" {
  location = var.region
  project  = var.project_id
  service  = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"

  depends_on = [google_cloud_run_v2_service.backend]
}

# Allow public access to the frontend service (protected by IAP)
resource "google_cloud_run_service_iam_member" "frontend_invoker" {
  location = var.region
  project  = var.project_id
  service  = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"

  depends_on = [google_cloud_run_v2_service.frontend]
}
