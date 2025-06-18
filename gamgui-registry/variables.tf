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
 * Variables for gamgui-registry Terraform configuration
 */

variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
  default = "gamgui-registry"
}

variable "region" {
  description = "The Google Cloud region to deploy resources to"
  type        = string
  default     = "us-central1"
}

variable "repository_name" {
  description = "The name of the GitHub repository"
  type        = string
  default     = "gamgui"
}

variable "github_owner" {
  description = "The GitHub owner (username or organization)"
  type        = string
  default = "automatearmy"
}

variable "customer_service_accounts" {
  description = "List of customer service account emails to grant artifact registry reader permissions"
  type        = list(string)
  default     = []
}

variable "github_app_installation_id" {
  description = "The GitHub app installation ID for Cloud Build connection"
  type        = string
  default     = "54757105"
}
