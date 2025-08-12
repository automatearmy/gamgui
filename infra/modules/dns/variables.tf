# ================================================================================
# CORE VARIABLES
# ================================================================================

variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
}

variable "name" {
  description = "Name for the DNS zone"
  type        = string
}

# ================================================================================
# DNS ZONE CONFIGURATION
# ================================================================================

variable "zone_config" {
  description = "Configuration for the DNS zone"
  type = object({
    domain = string
    private = object({
      client_networks = list(string)
    })
  })
}
