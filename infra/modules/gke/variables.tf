# ================================================================================
# CORE VARIABLES
# ================================================================================

variable "project_id" {
  description = "The Google Cloud Project ID"
  type        = string
}

variable "project_number" {
  description = "The Google Cloud Project Number"
  type        = string
}

variable "region" {
  description = "The Google Cloud region for the GKE cluster"
  type        = string
}

# ================================================================================
# CLUSTER CONFIGURATION
# ================================================================================

variable "cluster_name" {
  description = "Name of the GKE cluster"
  type        = string
  default     = "gamgui-sessions"
}

# ================================================================================
# NETWORK CONFIGURATION
# ================================================================================

variable "network" {
  description = "The VPC network to attach the cluster to"
  type        = string
}

variable "subnetwork" {
  description = "The subnetwork to attach the cluster to"
  type        = string
}

variable "secondary_range_pods" {
  description = "The secondary IP range for pods"
  type        = string
  default     = "gke-pods"
}

variable "secondary_range_services" {
  description = "The secondary IP range for services"
  type        = string
  default     = "gke-services"
}

# ================================================================================
# SERVICE ACCOUNT CONFIGURATION
# ================================================================================

variable "session_service_account_email" {
  description = "Service account email for individual session pods"
  type        = string
}