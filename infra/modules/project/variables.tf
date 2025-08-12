# ================================================================================
# CORE VARIABLES
# ================================================================================

variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
}

# ================================================================================
# API CONFIGURATION
# ================================================================================

variable "apis_to_enable" {
  description = "List of Google Cloud APIs to enable. If empty, uses the default set required for GAMGUI"
  type        = list(string)
  default     = []
}

variable "disable_services_on_destroy" {
  description = "Whether to disable Google Cloud APIs when the Terraform configuration is destroyed"
  type        = bool
  default     = false
}

variable "disable_dependent_services" {
  description = "Whether to disable services that depend on the APIs being disabled"
  type        = bool
  default     = false
}
