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
  description  = "Service account used by Cloud Build for the gamgui repository"
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

# Make production artifact registry repository publicly readable
resource "google_artifact_registry_repository_iam_member" "production_public_reader" {
  provider   = google-beta
  location   = var.production_repository_location
  repository = var.production_repository_name
  role       = "roles/artifactregistry.reader"
  member     = "allUsers"
}

# Make staging artifact registry repository publicly readable
resource "google_artifact_registry_repository_iam_member" "staging_public_reader" {
  provider   = google-beta
  location   = var.staging_repository_location
  repository = var.staging_repository_name
  role       = "roles/artifactregistry.reader"
  member     = "allUsers"
}
