/**
 * Outputs for the IAM module
 */

output "cloudbuild_service_account_email" {
  description = "The email of the Cloud Build service account"
  value       = google_service_account.cloudbuild_service_account.email
}

output "cloudbuild_service_account_id" {
  description = "The ID of the Cloud Build service account"
  value       = google_service_account.cloudbuild_service_account.id
}
