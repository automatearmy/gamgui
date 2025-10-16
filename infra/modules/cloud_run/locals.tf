locals {
  # Service names without environment suffix
  # This ensures standard Cloud Run URL format: https://[service]-[project-id]-[region].a.run.app
  backend_service_name  = "gamgui-backend"
  frontend_service_name = "gamgui-frontend"

  # Container image paths
  backend_image_path  = "${var.registry_region}-docker.pkg.dev/${var.registry_project_id}/${var.registry_repository_name}/${var.backend_image_name}"
  frontend_image_path = "${var.registry_region}-docker.pkg.dev/${var.registry_project_id}/${var.registry_repository_name}/${var.frontend_image_name}"
  session_image_path  = "${var.registry_region}-docker.pkg.dev/${var.registry_project_id}/${var.registry_repository_name}/${var.session_image_name}"

  # Default labels applied to all services
  default_labels = merge({
    managed-by  = "terraform"
    module      = "cloud-run"
    project     = var.project_id
    environment = var.environment
  }, var.labels)

  # Default environment variables for Cloud Run services
  default_env_vars = {
    PROJECT_ID               = var.project_id
    PROJECT_NUMBER           = var.project_number
    ENVIRONMENT              = var.environment
    REGION                   = var.region
    REGISTRY_PROJECT_ID      = var.registry_project_id
    REGISTRY_REGION          = var.registry_region
    REGISTRY_REPOSITORY_NAME = var.registry_repository_name
    BACKEND_IMAGE_NAME       = var.backend_image_name
    FRONTEND_IMAGE_NAME      = var.frontend_image_name
    SESSION_IMAGE_NAME       = var.session_image_name
  }

  # Backend service configuration (WebSocket optimized)
  backend_config = {
    name            = local.backend_service_name
    image           = local.backend_image_path
    service_account = var.backend_service_account_email
    timeout         = "3600s"  # Max timeout for WebSocket connections
    ingress         = "INGRESS_TRAFFIC_INTERNAL_ONLY"
    labels          = local.default_labels
  }

  # Frontend service configuration
  frontend_config = {
    name            = local.frontend_service_name
    image           = local.frontend_image_path
    service_account = var.frontend_service_account_email
    timeout         = "3600s"  # Max timeout for WebSocket connections
    ingress         = "INGRESS_TRAFFIC_ALL"
    labels          = local.default_labels
  }
}
