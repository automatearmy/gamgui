/**
 * Variables for the cloud-build module
 */

# ==================== PROJECT VARIABLES ====================

variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
}

variable "region" {
  description = "The Google Cloud region for Cloud Build"
  type        = string
}

# ==================== GITHUB VARIABLES ====================

variable "github_owner" {
  description = "The GitHub owner (username or organization)"
  type        = string
}

variable "repository_name" {
  description = "The name of the GitHub repository"
  type        = string
}

variable "github_app_installation_id" {
  description = "The GitHub app installation ID for Cloud Build connection"
  type        = string
}

# ==================== ARTIFACT REGISTRY VARIABLES ====================

variable "production_repository_name" {
  description = "The repository name (ID) of the production artifact registry repository"
  type        = string
}

variable "staging_repository_name" {
  description = "The repository name (ID) of the staging artifact registry repository"  
  type        = string
}

# ==================== SERVICE ACCOUNT VARIABLES ====================

variable "cloudbuild_service_account" {
  description = "The email of the Cloud Build service account"
  type        = string
}
