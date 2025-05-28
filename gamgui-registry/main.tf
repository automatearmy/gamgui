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
 * Main Terraform configuration for gamgui-registry
 * 
 * This file sets up the Google Cloud infrastructure for the gamgui-app CI/CD pipeline
 * including Artifact Registry repositories, Cloud Build triggers, and IAM permissions.
 */

# Set up project and enable APIs
module "project" {
  source     = "./modules/project"
  project_id = var.project_id
}

# Set up Artifact Registry repositories
module "artifact_registry" {
  source     = "./modules/artifact-registry"
  project_id = var.project_id
  region     = var.region
  depends_on = [ module.project ]
}

# Set up IAM permissions
module "iam" {
  source                     = "./modules/iam"
  project_id                 = var.project_id
  project_number             = module.project.project_number
  artifact_registry_location = module.artifact_registry.production_repository_location
  production_repository_name = module.artifact_registry.production_repository_name
  
  # Default empty list, to be populated with customer service accounts as needed
  customer_service_accounts = var.customer_service_accounts

  depends_on = [ module.project, module.artifact_registry ]
}

# Set up Cloud Build triggers
module "cloud_build" {
  source                      = "./modules/cloud-build"
  project_id                  = var.project_id
  region                      = var.region
  repository_name             = var.repository_name
  github_owner                = var.github_owner
  production_repository_id    = module.artifact_registry.production_repository_id
  production_repository_name  = module.artifact_registry.production_repository_name
  staging_repository_id       = module.artifact_registry.staging_repository_id
  staging_repository_name     = module.artifact_registry.staging_repository_name
  cloudbuild_service_account  = module.iam.cloudbuild_service_account_email
  github_app_installation_id  = var.github_app_installation_id

  depends_on = [ module.project, module.artifact_registry, module.iam ]
}
