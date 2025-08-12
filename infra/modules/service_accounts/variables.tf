# ================================================================================
# VARIABLES
# ================================================================================

variable "project_id" {
  description = "The GCP project ID where service accounts will be created"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod) - will be added to service account names"
  type        = string
}

# ================================================================================
# ADDITIONAL ROLES
# ================================================================================

variable "additional_backend_roles" {
  description = "Additional IAM roles to assign to the backend service account beyond the defaults"
  type        = list(string)
  default     = []
}

variable "additional_frontend_roles" {
  description = "Additional IAM roles to assign to the frontend service account beyond the defaults"
  type        = list(string)
  default     = []
}

variable "additional_session_roles" {
  description = "Additional IAM roles to assign to the session service account beyond the defaults"
  type        = list(string)
  default     = []
}
