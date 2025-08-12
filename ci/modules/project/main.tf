/**
 * Project
 * 
 * This module enables GCP APIs and fetches the GCP project
 */

# Enable specified Google Cloud APIs
resource "google_project_service" "enabled_apis" {
  for_each = toset(local.apis_to_enable)

  project                    = var.project_id
  service                    = each.key
  disable_dependent_services = false
  disable_on_destroy         = false
}

# Data source to get project details
data "google_project" "project" {
  project_id = var.project_id
}
