# ================================================================================
# PROJECT VARIABLES
# ================================================================================

variable "domain" {
  description = "Google Workspace domain"
  type        = string
}

variable "project_id" {
  description = "The Google Cloud Project ID where resources will be created"
  type        = string
}

variable "region" {
  description = "The Google Cloud region where resources will be created"
  type        = string
}

variable "environment" {
  description = "Deployment environment name (e.g., development, staging, production)"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production"
  }
}

# ================================================================================
# REGISTRY VARIABLES
# ================================================================================

variable "registry_project" {
  description = "The Google Cloud Project ID containing the Artifact Registry with application images"
  type        = string
  default     = "gamgui-registry"
}

variable "registry_region" {
  description = "The Google Cloud region where the Artifact Registry is located"
  type        = string
  default     = "us-central1"
}

variable "registry_repository_name" {
  description = "The name of the Artifact Registry repository containing application images"
  type        = string
  default     = "gamgui"
}

# ================================================================================
# IMAGE VARIABLES
# ================================================================================

variable "backend_image_name" {
  description = "The name of the Backend service container image in Artifact Registry"
  type        = string
  default     = "gamgui-backend"
}

variable "frontend_image_name" {
  description = "The name of the Frontend service container image in Artifact Registry"
  type        = string
  default     = "gamgui-frontend"
}

variable "session_image_name" {
  description = "The name of the Session service container image in Artifact Registry"
  type        = string
  default     = "gamgui-session"
}
