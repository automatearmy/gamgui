/**
 * Variables for Terraform configuration
 */

variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
}

variable "region" {
  description = "The Google Cloud region to deploy resources to"
  type        = string
}

variable "repository_name" {
  description = "The name of the GitHub repository"
  type        = string
}

variable "github_owner" {
  description = "The GitHub owner (username or organization)"
  type        = string
}

variable "github_app_installation_id" {
  description = "The GitHub app installation ID for Cloud Build connection"
  type        = string
}
