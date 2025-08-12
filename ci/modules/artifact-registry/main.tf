/**
 * Artifact Registry Module
 * 
 * This module creates and manages Google Cloud Artifact Registry repositories for storing
 * both production and staging Docker images for the gamgui project.
 */

resource "google_artifact_registry_repository" "production" {
  provider      = google-beta
  location      = var.region
  repository_id = "gamgui"
  description   = "Production Docker repository for gamgui"
  format        = "DOCKER"
}

resource "google_artifact_registry_repository" "staging" {
  provider      = google-beta
  location      = var.region
  repository_id = "gamgui-staging"
  description   = "Staging Docker repository for gamgui"
  format        = "DOCKER"
}
