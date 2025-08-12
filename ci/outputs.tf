/**
 * Outputs for gamgui-registry Terraform configuration
 */

# IAM Outputs
output "cloudbuild_service_account" {
  description = "Email address of the Cloud Build service account"
  value       = module.iam.cloudbuild_service_account_email
}

# Artifact Registry Outputs
output "production_repository_location" {
  description = "The location of the production artifact registry repository"
  value       = module.artifact_registry.production_repository_location
}

output "production_repository_name" {
  description = "The fully qualified name of the production artifact registry repository"
  value       = module.artifact_registry.production_repository_name
}

output "staging_repository_location" {
  description = "The location of the staging artifact registry repository"
  value       = module.artifact_registry.staging_repository_location
}

output "staging_repository_name" {
  description = "The fully qualified name of the staging artifact registry repository"
  value       = module.artifact_registry.staging_repository_name
}

# Cloud Build Triggers (Alphabetical by Component)
output "frontend_build_triggers" {
  description = "Cloud Build trigger IDs for Frontend component"
  value = {
    production = module.cloud_build.frontend_production_trigger_id
    staging    = module.cloud_build.frontend_staging_trigger_id
    validation = module.cloud_build.frontend_pr_validation_trigger_id
  }
}

output "backend_build_triggers" {
  description = "Cloud Build trigger IDs for Backend component"
  value = {
    production = module.cloud_build.backend_production_trigger_id
    staging    = module.cloud_build.backend_staging_trigger_id
    validation = module.cloud_build.backend_pr_validation_trigger_id
  }
}

output "session_build_triggers" {
  description = "Cloud Build trigger IDs for Session component"
  value = {
    production = module.cloud_build.session_production_trigger_id
    staging    = module.cloud_build.session_staging_trigger_id
    validation = module.cloud_build.session_pr_validation_trigger_id
  }
}
