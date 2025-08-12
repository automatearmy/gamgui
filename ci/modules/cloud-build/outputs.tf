/**
 * Outputs for the cloud-build module
 */

# ==================== FRONTEND OUTPUTS ====================

output "frontend_staging_trigger_id" {
  description = "The ID of the Frontend staging Cloud Build trigger"
  value       = google_cloudbuild_trigger.frontend_staging_trigger.id
}

output "frontend_production_trigger_id" {
  description = "The ID of the Frontend production Cloud Build trigger"
  value       = google_cloudbuild_trigger.frontend_production_trigger.id
}

output "frontend_pr_validation_trigger_id" {
  description = "The ID of the Frontend PR validation Cloud Build trigger"
  value       = google_cloudbuild_trigger.frontend_pr_validation.id
}

# ==================== BACKEND OUTPUTS ====================

output "backend_staging_trigger_id" {
  description = "The ID of the Backend staging Cloud Build trigger"
  value       = google_cloudbuild_trigger.backend_staging_trigger.id
}

output "backend_production_trigger_id" {
  description = "The ID of the Backend production Cloud Build trigger"
  value       = google_cloudbuild_trigger.backend_production_trigger.id
}

output "backend_pr_validation_trigger_id" {
  description = "The ID of the Backend PR validation Cloud Build trigger"
  value       = google_cloudbuild_trigger.backend_pr_validation.id
}

# ==================== SESSION OUTPUTS ====================

output "session_staging_trigger_id" {
  description = "The ID of the Session staging Cloud Build trigger"
  value       = google_cloudbuild_trigger.session_staging_trigger.id
}

output "session_production_trigger_id" {
  description = "The ID of the Session production Cloud Build trigger"
  value       = google_cloudbuild_trigger.session_production_trigger.id
}

output "session_pr_validation_trigger_id" {
  description = "The ID of the Session PR validation Cloud Build trigger"
  value       = google_cloudbuild_trigger.session_pr_validation.id
}
