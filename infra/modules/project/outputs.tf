# ================================================================================
# PROJECT OUTPUTS
# ================================================================================

output "project_id" {
  description = "The ID of the Google Cloud project"
  value       = data.google_project.project.project_id
}

output "project_number" {
  description = "The numeric identifier of the Google Cloud project"
  value       = data.google_project.project.number
}

output "project_name" {
  description = "The display name of the Google Cloud project"
  value       = data.google_project.project.name
}

output "enabled_apis" {
  description = "List of APIs enabled by this module"
  value       = keys(google_project_service.enabled_apis)
}

# ================================================================================
# CONVENIENCE OUTPUTS
# ================================================================================

output "project_info" {
  description = "Complete project information including metadata"
  value = {
    project_id     = data.google_project.project.project_id
    project_number = data.google_project.project.number
    project_name   = data.google_project.project.name
    labels         = data.google_project.project.labels
    enabled_apis   = keys(google_project_service.enabled_apis)
  }
}
