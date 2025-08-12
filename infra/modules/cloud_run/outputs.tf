# ================================================================================
# BACKEND SERVICE OUTPUTS
# ================================================================================

output "backend_service_url" {
  description = "URL of the deployed backend service"
  value       = google_cloud_run_v2_service.backend.uri
}

output "backend_service_name" {
  description = "Name of the deployed backend service"
  value       = google_cloud_run_v2_service.backend.name
}

output "backend_service_location" {
  description = "Location of the deployed backend service"
  value       = google_cloud_run_v2_service.backend.location
}

output "backend_service_id" {
  description = "ID of the deployed backend service"
  value       = google_cloud_run_v2_service.backend.id
}

# ================================================================================
# FRONTEND SERVICE OUTPUTS
# ================================================================================

output "frontend_service_url" {
  description = "URL of the deployed frontend service"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "frontend_service_name" {
  description = "Name of the deployed frontend service"
  value       = google_cloud_run_v2_service.frontend.name
}

output "frontend_service_location" {
  description = "Location of the deployed frontend service"
  value       = google_cloud_run_v2_service.frontend.location
}

output "frontend_service_id" {
  description = "ID of the deployed frontend service"
  value       = google_cloud_run_v2_service.frontend.id
}

# ================================================================================
# CONVENIENCE OUTPUTS
# ================================================================================

output "service_urls" {
  description = "Map of all service URLs"
  value = {
    backend  = google_cloud_run_v2_service.backend.uri
    frontend = google_cloud_run_v2_service.frontend.uri
  }
}

output "service_names" {
  description = "Map of all service names"
  value = {
    backend  = google_cloud_run_v2_service.backend.name
    frontend = google_cloud_run_v2_service.frontend.name
  }
}

output "service_ids" {
  description = "Map of all service IDs"
  value = {
    backend  = google_cloud_run_v2_service.backend.id
    frontend = google_cloud_run_v2_service.frontend.id
  }
}
