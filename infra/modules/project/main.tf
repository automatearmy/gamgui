# ================================================================================
# PROJECT DATA SOURCE
# ================================================================================

# Data source to get project details and validate project exists
data "google_project" "project" {
  project_id = var.project_id
}

# ================================================================================
# API SERVICES
# ================================================================================

# Enable required Google Cloud APIs with proper configuration
resource "google_project_service" "enabled_apis" {
  for_each = toset(local.apis_to_enable)

  project                    = var.project_id
  service                    = each.key
  disable_dependent_services = var.disable_dependent_services
  disable_on_destroy         = var.disable_services_on_destroy

  # Ensure proper timing for API enablement
  timeouts {
    create = "20m"
    update = "20m"
    delete = "20m"
  }
}
