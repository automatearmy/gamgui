# ================================================================================
# DNS MANAGED ZONE
# ================================================================================

# Private DNS Zone for Cloud Run
resource "google_dns_managed_zone" "private_zone" {
  project     = var.project_id
  name        = var.name
  dns_name    = var.zone_config.domain
  description = "Private DNS zone for ${var.zone_config.domain}"

  visibility = "private"

  private_visibility_config {
    dynamic "networks" {
      for_each = var.zone_config.private.client_networks
      content {
        network_url = networks.value
      }
    }
  }
}
