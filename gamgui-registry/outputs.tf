# * Copyright 2025 Infinite Developer Theorem Inc
# *
# * Licensed under the Apache License, Version 2.0 (the "License");
# * you may not use this file except in compliance with the License.
# * You may obtain a copy of the License at
# *
# *      http://www.apache.org/licenses/LICENSE-2.0
# *
# * Unless required by applicable law or agreed to in writing, software
# * distributed under the License is distributed on an "AS IS" BASIS,
# * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# * See the License for the specific language governing permissions and
# * limitations under the License.

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
output "client_build_triggers" {
  description = "Cloud Build trigger IDs for Client component"
  value = {
    production = module.cloud_build.client_production_trigger_id
    staging    = module.cloud_build.client_staging_trigger_id
    validation = module.cloud_build.client_pr_validation_trigger_id
  }
}

output "gam_docker_build_triggers" {
  description = "Cloud Build trigger IDs for GAM Docker component"
  value = {
    production = module.cloud_build.gam_docker_production_trigger_id
    staging    = module.cloud_build.gam_docker_staging_trigger_id
    validation = module.cloud_build.gam_docker_pr_validation_trigger_id
  }
}

output "server_build_triggers" {
  description = "Cloud Build trigger IDs for Server component"
  value = {
    production = module.cloud_build.server_production_trigger_id
    staging    = module.cloud_build.server_staging_trigger_id
    validation = module.cloud_build.server_pr_validation_trigger_id
  }
}
