/**
 * Outputs for the project module
 */

output "project_id" {
  description = "The ID of the Google Cloud project."
  value       = data.google_project.project.project_id
}

output "project_number" {
  description = "The number of the Google Cloud project."
  value       = data.google_project.project.number
}

output "enabled_api_ids" {
  description = "List of APIs enabled by this module."
  value       = keys(google_project_service.enabled_apis)
}
