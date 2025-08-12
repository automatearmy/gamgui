# ================================================================================
# DNS ZONE OUTPUTS
# ================================================================================

output "name" {
  description = "The name of the DNS managed zone"
  value       = google_dns_managed_zone.private_zone.name
}

output "dns_name" {
  description = "The DNS name of the managed zone"
  value       = google_dns_managed_zone.private_zone.dns_name
}

output "id" {
  description = "The ID of the DNS managed zone"
  value       = google_dns_managed_zone.private_zone.id
}
