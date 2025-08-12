/**
 * Variables for the IAM module
 */

variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
}

variable "project_number" {
  description = "The Google Cloud project number"
  type        = string
}


variable "production_repository_location" {
  description = "The location of the production artifact registry repository"
  type        = string
}

variable "production_repository_name" {
  description = "The name of the production artifact registry repository"
  type        = string
}

variable "staging_repository_location" {
  description = "The location of the staging artifact registry repository"
  type        = string
}

variable "staging_repository_name" {
  description = "The name of the staging artifact registry repository"
  type        = string
}
