# ================================================================================
# NETWORK OUTPUTS
# ================================================================================

output "network_id" {
  description = "The ID of the VPC network"
  value       = google_compute_network.vpc.id
}

output "network_name" {
  description = "The name of the VPC network"
  value       = google_compute_network.vpc.name
}

output "subnets" {
  description = "Map of subnet resources created"
  value       = google_compute_subnetwork.subnets
}

# ================================================================================
# NAT OUTPUTS
# ================================================================================

output "router_name" {
  description = "The name of the Cloud Router"
  value       = google_compute_router.router.name
}

output "nat_name" {
  description = "The name of the Cloud NAT"
  value       = google_compute_router_nat.nat.name
}

# ================================================================================
# CONVENIENCE OUTPUTS
# ================================================================================

output "network_info" {
  description = "Complete network configuration information"
  value = {
    network_id   = google_compute_network.vpc.id
    network_name = google_compute_network.vpc.name
    environment  = var.environment
    region       = var.region
    subnets = {
      for k, v in google_compute_subnetwork.subnets : k => {
        name          = v.name
        ip_cidr_range = v.ip_cidr_range
        id            = v.id
      }
    }
  }
}
