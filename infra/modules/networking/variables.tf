# ================================================================================
# CORE VARIABLES
# ================================================================================

variable "project_id" {
  description = "The Google Cloud project ID where networking resources will be created"
  type        = string
}

variable "region" {
  description = "The Google Cloud region for networking resources"
  type        = string
}

variable "environment" {
  description = "Environment name - will be added to resource names"
  type        = string
}

# ================================================================================
# NETWORK CONFIGURATION
# ================================================================================

variable "network_name" {
  description = "Name for the VPC network"
  type        = string
  default     = "gamgui-vpc"
}

variable "subnets" {
  description = "Map of subnet configurations"
  type = map(object({
    name                = string
    ip_cidr_range       = string
    secondary_ip_ranges = optional(map(string), {})
  }))
  default = {
    services = {
      name          = "sn-gamgui-services"
      ip_cidr_range = "10.7.0.0/24"
    }
    kube = {
      name                = "sn-kube-nodes"
      ip_cidr_range       = "10.8.0.0/24"
      secondary_ip_ranges = {
        gke-kube-pods = "10.126.0.0/18"
        gke-kube-svcs = "10.126.64.0/18"
      }
    }
  }
}

# ================================================================================
# NAT CONFIGURATION
# ================================================================================

variable "nat_name" {
  description = "Name for the Cloud NAT gateway"
  type        = string
  default     = "nat-gateway"
}

variable "enable_nat_logging" {
  description = "Enable logging for Cloud NAT"
  type        = bool
  default     = true
}

# ================================================================================
# FIREWALL CONFIGURATION
# ================================================================================

variable "gke_master_cidr" {
  description = "CIDR range for GKE master nodes"
  type        = string
  default     = "172.16.0.0/28"
}
