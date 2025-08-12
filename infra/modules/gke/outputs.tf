# ================================================================================
# CLUSTER OUTPUTS
# ================================================================================

output "cluster_name" {
  description = "Name of the GKE cluster"
  value       = google_container_cluster.session_cluster.name
}

output "cluster_location" {
  description = "Location of the GKE cluster"
  value       = google_container_cluster.session_cluster.location
}

output "cluster_endpoint" {
  description = "Endpoint of the GKE cluster"
  value       = google_container_cluster.session_cluster.endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "Base64 encoded certificate data for the cluster"
  value       = google_container_cluster.session_cluster.master_auth[0].cluster_ca_certificate
  sensitive   = true
}

# ================================================================================
# SERVICE ACCOUNT OUTPUTS
# ================================================================================

output "workload_identity_binding" {
  description = "Workload identity binding for session pods"
  value       = google_service_account_iam_binding.workload_identity_binding.service_account_id
}
