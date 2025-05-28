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
 * Outputs for the artifact-registry module
 */

output "production_repository_id" {
  description = "The ID of the production artifact registry repository"
  value       = google_artifact_registry_repository.production.repository_id
}

output "production_repository_name" {
  description = "The fully qualified name of the production artifact registry repository"
  value       = google_artifact_registry_repository.production.name
}

output "production_repository_location" {
  description = "The location of the production artifact registry repository"
  value       = google_artifact_registry_repository.production.location
}

output "staging_repository_id" {
  description = "The ID of the staging artifact registry repository"
  value       = google_artifact_registry_repository.staging.repository_id
}

output "staging_repository_name" {
  description = "The fully qualified name of the staging artifact registry repository"
  value       = google_artifact_registry_repository.staging.name
}

output "staging_repository_location" {
  description = "The location of the staging artifact registry repository"
  value       = google_artifact_registry_repository.staging.location
}
