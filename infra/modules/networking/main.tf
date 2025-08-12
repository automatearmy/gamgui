# ================================================================================
# VPC NETWORK
# ================================================================================

resource "google_compute_network" "vpc" {
  project                 = var.project_id
  name                    = var.network_name
  auto_create_subnetworks = false
}

# ================================================================================
# SUBNETS
# ================================================================================

resource "google_compute_subnetwork" "subnets" {
  for_each = var.subnets

  project                  = var.project_id
  name                     = each.value.name
  ip_cidr_range            = each.value.ip_cidr_range
  region                   = var.region
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true

  dynamic "secondary_ip_range" {
    for_each = each.value.secondary_ip_ranges
    content {
      range_name    = secondary_ip_range.key
      ip_cidr_range = secondary_ip_range.value
    }
  }
}

# ================================================================================
# CLOUD ROUTER AND NAT
# ================================================================================

# Cloud Router (for NAT)
resource "google_compute_router" "router" {
  project = var.project_id
  name    = "${var.nat_name}-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

# Cloud NAT
resource "google_compute_router_nat" "nat" {
  project                            = var.project_id
  name                               = var.nat_name
  router                             = google_compute_router.router.name
  region                             = google_compute_router.router.region
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"
  nat_ip_allocate_option             = "AUTO_ONLY"

  subnetwork {
    name                    = google_compute_subnetwork.subnets["services"].id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }
  subnetwork {
    name                    = google_compute_subnetwork.subnets["kube"].id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }

  log_config {
    enable = var.enable_nat_logging
    filter = var.enable_nat_logging ? "ERRORS_ONLY" : null
  }

  depends_on = [google_compute_router.router]
}

# ================================================================================
# FIREWALL RULES
# ================================================================================

# Allow internal communication within VPC
resource "google_compute_firewall" "allow_internal" {
  project = var.project_id
  name    = "${var.network_name}-allow-internal"
  network = google_compute_network.vpc.id

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }
  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }
  allow {
    protocol = "icmp"
  }

  source_ranges = [
    google_compute_subnetwork.subnets["services"].ip_cidr_range,
    google_compute_subnetwork.subnets["kube"].ip_cidr_range
  ]
}

# Allow WebSocket connections to session pods
resource "google_compute_firewall" "allow_session_pod_websocket" {
  project = var.project_id
  name    = "${var.network_name}-allow-session-pods"
  network = google_compute_network.vpc.id

  allow {
    protocol = "tcp"
    ports    = ["8080", "8081", "8082"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["session-pod"]
  description   = "Allow WebSocket connections to session pods"
}

# Allow GKE master to communicate with nodes
resource "google_compute_firewall" "allow_gke_master_webhook" {
  project = var.project_id
  name    = "${var.network_name}-allow-gke-master"
  network = google_compute_network.vpc.id

  allow {
    protocol = "tcp"
    ports    = ["443", "10250"]
  }

  source_ranges = [var.gke_master_cidr]
  description   = "Allow GKE master to communicate with nodes"
}
