# ================================================================================
# GKE CLUSTER
# ================================================================================

# GKE Autopilot Cluster for Session Management
resource "google_container_cluster" "session_cluster" {
  name     = var.cluster_name
  location = var.region
  project  = var.project_id

  # Enable Autopilot mode
  enable_autopilot = true
  
  # Allow cluster deletion
  deletion_protection = false

  # Network configuration
  network    = var.network
  subnetwork = var.subnetwork

  # IP allocation for pods and services
  ip_allocation_policy {
    cluster_secondary_range_name  = var.secondary_range_pods
    services_secondary_range_name = var.secondary_range_services
  }

  # Private cluster configuration
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  # Maintenance window - Schedule maintenance during off-peak hours
  maintenance_policy {
    recurring_window {
      start_time = "2024-01-01T02:00:00Z"
      end_time   = "2024-01-01T10:00:00Z"
      recurrence = "FREQ=WEEKLY;BYDAY=SA,SU"
    }
  }
}

# ================================================================================
# IAM BINDINGS
# ================================================================================

# Grant required role to default node service account for Autopilot cluster
resource "google_project_iam_member" "default_node_service_account_role" {
  project = var.project_id
  role    = "roles/container.defaultNodeServiceAccount"
  member  = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"

  depends_on = [google_container_cluster.session_cluster]
}

# ================================================================================
# KUBERNETES SERVICE ACCOUNTS
# ================================================================================

# Create the Kubernetes service account for session pods
resource "kubernetes_service_account" "session_ksa" {
  metadata {
    name      = "session-ksa"
    namespace = "default"
    annotations = {
      "iam.gke.io/gcp-service-account" = var.session_service_account_email
    }
  }

  depends_on = [google_container_cluster.session_cluster]
}

# ================================================================================
# WORKLOAD IDENTITY
# ================================================================================

# Workload Identity binding for session pods
resource "google_service_account_iam_binding" "workload_identity_binding" {
  service_account_id = "projects/${var.project_id}/serviceAccounts/${var.session_service_account_email}"
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "serviceAccount:${var.project_id}.svc.id.goog[default/session-ksa]"
  ]
  
  depends_on = [kubernetes_service_account.session_ksa]
}
