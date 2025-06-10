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
 * Outputs for the cloud-build module
 */

output "client_staging_trigger_id" {
  description = "The ID of the Client staging Cloud Build trigger"
  value       = google_cloudbuild_trigger.client_staging_trigger.id
}

output "client_production_trigger_id" {
  description = "The ID of the Client production Cloud Build trigger"
  value       = google_cloudbuild_trigger.client_production_trigger.id
}

output "server_staging_trigger_id" {
  description = "The ID of the Server staging Cloud Build trigger"
  value       = google_cloudbuild_trigger.server_staging_trigger.id
}

output "server_production_trigger_id" {
  description = "The ID of the Server production Cloud Build trigger"
  value       = google_cloudbuild_trigger.server_production_trigger.id
}

output "session_staging_trigger_id" {
  description = "The ID of the Session staging Cloud Build trigger"
  value       = google_cloudbuild_trigger.session_staging_trigger.id
}

output "session_production_trigger_id" {
  description = "The ID of the Session production Cloud Build trigger"
  value       = google_cloudbuild_trigger.session_production_trigger.id
}

output "client_pr_validation_trigger_id" {
  description = "The ID of the Client PR validation Cloud Build trigger"
  value       = google_cloudbuild_trigger.client_pr_validation.id
}

output "server_pr_validation_trigger_id" {
  description = "The ID of the Server PR validation Cloud Build trigger"
  value       = google_cloudbuild_trigger.server_pr_validation.id
}

output "session_pr_validation_trigger_id" {
  description = "The ID of the Session PR validation Cloud Build trigger"
  value       = google_cloudbuild_trigger.session_pr_validation.id
}
