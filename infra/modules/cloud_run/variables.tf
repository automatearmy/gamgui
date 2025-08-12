# ================================================================================
# CORE VARIABLES
# ================================================================================

variable "project_id" {
  description = "The Google Cloud project ID where Cloud Run services will be deployed"
  type        = string
}

variable "project_number" {
  description = "The Google Cloud project number"
  type        = string
}

variable "region" {
  description = "The Google Cloud region for Cloud Run services"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, production) - will be added to service names"
  type        = string
}

# ================================================================================
# CONTAINER REGISTRY VARIABLES
# ================================================================================

variable "registry_project_id" {
  description = "Project ID where the Artifact Registry is located"
  type        = string
}

variable "registry_region" {
  description = "Region where the Artifact Registry is located"
  type        = string
}

variable "registry_repository_name" {
  description = "Name of the Artifact Registry repository"
  type        = string
}

variable "backend_image_name" {
  description = "Name of the backend container image"
  type        = string
}

variable "frontend_image_name" {
  description = "Name of the frontend container image"
  type        = string
}

variable "session_image_name" {
  description = "Name of the session container image"
  type        = string
}

# ================================================================================
# NETWORKING VARIABLES
# ================================================================================

variable "network" {
  description = "The VPC network self_link or name for Direct VPC Egress"
  type        = string
}

variable "subnet" {
  description = "The VPC subnetwork self_link or name for Direct VPC Egress"
  type        = string
}

variable "vpc_egress_setting" {
  description = "Traffic routing setting for Direct VPC Egress (PRIVATE_RANGES_ONLY or ALL_TRAFFIC)"
  type        = string
  default     = "PRIVATE_RANGES_ONLY"
  validation {
    condition     = contains(["PRIVATE_RANGES_ONLY", "ALL_TRAFFIC"], var.vpc_egress_setting)
    error_message = "VPC egress setting must be either 'PRIVATE_RANGES_ONLY' or 'ALL_TRAFFIC'."
  }
}

# ================================================================================
# SERVICE ACCOUNT VARIABLES
# ================================================================================

variable "backend_service_account_email" {
  description = "Email of the Service Account for the backend service"
  type        = string
}

variable "frontend_service_account_email" {
  description = "Email of the Service Account for the frontend service"
  type        = string
}

# ================================================================================
# SECRET MANAGER VARIABLES
# ================================================================================

variable "backend_client_id_secret_name" {
  description = "Name of the Secret Manager secret for Backend OAuth Client ID"
  type        = string
}

variable "backend_client_secret_secret_name" {
  description = "Name of the Secret Manager secret for Backend OAuth Client Secret"
  type        = string
}

variable "frontend_client_id_secret_name" {
  description = "Name of the Secret Manager secret for Frontend OAuth Client ID"
  type        = string
}

variable "frontend_client_secret_secret_name" {
  description = "Name of the Secret Manager secret for Frontend OAuth Client Secret"
  type        = string
}

# ================================================================================
# APPLICATION CONFIGURATION
# ================================================================================

variable "backend_timeout" {
  description = "Timeout for backend service requests"
  type        = string
  default     = "300s"
}

variable "frontend_timeout" {
  description = "Timeout for frontend service requests"
  type        = string
  default     = "60s"
}

variable "labels" {
  description = "Labels to apply to Cloud Run services"
  type        = map(string)
  default     = {}
}
