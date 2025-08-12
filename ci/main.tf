/**
 * Main Terraform configuration for gamgui-registry
 * 
 * This file sets up the Google Cloud infrastructure for the gamgui CI/CD pipeline
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
  depends_on = [module.project]
}

# Set up IAM permissions
module "iam" {
  source                         = "./modules/iam"
  project_id                     = var.project_id
  project_number                 = module.project.project_number
  production_repository_location = module.artifact_registry.production_repository_location
  production_repository_name     = module.artifact_registry.production_repository_name
  staging_repository_location    = module.artifact_registry.staging_repository_location
  staging_repository_name        = module.artifact_registry.staging_repository_name

  depends_on = [module.artifact_registry]
}

# Set up Cloud Build triggers
module "cloud_build" {
  source                     = "./modules/cloud-build"
  project_id                 = var.project_id
  region                     = var.region
  repository_name            = var.repository_name
  github_owner               = var.github_owner
  production_repository_name = module.artifact_registry.production_repository_id
  staging_repository_name    = module.artifact_registry.staging_repository_id
  cloudbuild_service_account = module.iam.cloudbuild_service_account_email
  github_app_installation_id = var.github_app_installation_id

  depends_on = [module.iam]
}
