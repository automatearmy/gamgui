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
 * Variables for the cloud-build module
 */

variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
}

variable "region" {
  description = "The Google Cloud region for Cloud Build"
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

variable "production_repository_id" {
  description = "The ID of the production artifact registry repository"
  type        = string
}

variable "production_repository_name" {
  description = "The fully qualified name of the production artifact registry repository"
  type        = string
}

variable "staging_repository_id" {
  description = "The ID of the staging artifact registry repository"
  type        = string
}

variable "staging_repository_name" {
  description = "The fully qualified name of the staging artifact registry repository"
  type        = string
}

variable "cloudbuild_service_account" {
  description = "The email of the Cloud Build service account"
  type        = string
}

variable "github_app_installation_id" {
  description = "The GitHub app installation ID for Cloud Build connection"
  type        = string
}
