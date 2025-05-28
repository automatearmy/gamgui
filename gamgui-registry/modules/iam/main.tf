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
 * IAM Module
 * 
 * This module creates service accounts and IAM permissions needed for the CI/CD pipeline
 * and manages customer access to artifact registry repositories.
 */

# Cloud Build Service Account
resource "google_service_account" "cloudbuild_service_account" {
  account_id   = "gamgui-registry-cloud-builder"
  display_name = "Cloud Build Service Account"
  description  = "Service account used by Cloud Build for the gamgui-app repository"
  project      = var.project_id
}

# IAM permissions for Cloud Build Service Account
resource "google_project_iam_member" "cloudbuild_roles" {
  for_each = toset([
    "roles/cloudbuild.builds.builder",
    "roles/artifactregistry.writer",
    "roles/iam.serviceAccountUser",
    "roles/logging.logWriter",
    "roles/storage.admin",
    "roles/secretmanager.secretAccessor"
  ])
  
  role    = each.key
  member  = "serviceAccount:${google_service_account.cloudbuild_service_account.email}"
  project = var.project_id
}

# Grant access to Cloud Build service account to access the GitHub PAT secret
resource "google_secret_manager_secret_iam_member" "cloudbuild_secretaccess" {
  project   = var.project_id
  secret_id = "github-pat"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:service-${var.project_number}@gcp-sa-cloudbuild.iam.gserviceaccount.com"
}

# Grant artifact registry reader permissions to customer service accounts
# This assumes the customer service accounts already exist in the project
resource "google_artifact_registry_repository_iam_member" "customer_readers" {
  for_each = toset(var.customer_service_accounts)
  
  provider   = google-beta
  location   = var.artifact_registry_location
  repository = var.production_repository_name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${each.value}"
}
