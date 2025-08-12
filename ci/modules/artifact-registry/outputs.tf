/**
 * Outputs for the artifact-registry module
 */

output "production_repository_id" {
  description = "The ID of the production artifact registry repository"
  value       = google_artifact_registry_repository.production.repository_id
}

output "production_repository_name" {
  description = "The fully qualified name of the production artifact registry repository"
  value       = google_artifact_registry_repository.production.name
}

output "production_repository_location" {
  description = "The location of the production artifact registry repository"
  value       = google_artifact_registry_repository.production.location
}

output "staging_repository_id" {
  description = "The ID of the staging artifact registry repository"
  value       = google_artifact_registry_repository.staging.repository_id
}

output "staging_repository_name" {
  description = "The fully qualified name of the staging artifact registry repository"
  value       = google_artifact_registry_repository.staging.name
}

output "staging_repository_location" {
  description = "The location of the staging artifact registry repository"
  value       = google_artifact_registry_repository.staging.location
}
