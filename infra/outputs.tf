# ================================================================================
# PROJECT INFORMATION
# ================================================================================

output "project" {
  description = "Project configuration details"
  value = {
    id          = var.project_id
    region      = var.region
    environment = var.environment
  }
}

# ================================================================================
# NETWORK INFORMATION
# ================================================================================

output "network" {
  description = "Network configuration details"
  value = {
    vpc_id    = module.networking.network_id
    subnet_id = module.networking.subnets["kube"].id
  }
}

# ================================================================================
# SERVICE ACCOUNT INFORMATION
# ================================================================================

output "service_accounts" {
  description = "Service account configuration details"
  value = {
    frontend = module.service_accounts.frontend_service_account_email
    backend  = module.service_accounts.backend_service_account_email
    session  = module.service_accounts.session_service_account_email
  }
}

# ================================================================================
# CLOUD RUN SERVICES INFORMATION
# ================================================================================

output "cloud_run_services" {
  description = "Cloud Run services configuration details"
  value = {
    backend_url  = module.cloud_run.backend_service_url
    frontend_url = module.cloud_run.frontend_service_url
    backend_id   = module.cloud_run.backend_service_id
    frontend_id  = module.cloud_run.frontend_service_id
  }
}

output "frontend_service_url" {
  description = "URL of the frontend service (with IAP enabled)"
  value       = module.cloud_run.frontend_service_url
}

output "backend_service_url" {
  description = "URL of the backend service (internal only)"
  value       = module.cloud_run.backend_service_url
}

# ================================================================================
# GKE CLUSTER INFORMATION
# ================================================================================

output "gke_cluster" {
  description = "GKE cluster configuration details"
  sensitive   = true
  value = {
    name     = module.gke.cluster_name
    location = module.gke.cluster_location
    endpoint = module.gke.cluster_endpoint
  }
}

# ================================================================================
# SECRET MANAGER INFORMATION
# ================================================================================

output "oauth_secrets" {
  description = "OAuth secret names in Secret Manager"
  value = {
    frontend_client_id     = module.secret_manager.frontend_client_id_secret_name
    frontend_client_secret = module.secret_manager.frontend_client_secret_secret_name
    backend_client_id      = module.secret_manager.backend_client_id_secret_name
    backend_client_secret  = module.secret_manager.backend_client_secret_secret_name
  }
}
