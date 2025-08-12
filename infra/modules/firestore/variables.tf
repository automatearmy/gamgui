# ================================================================================
# CORE VARIABLES
# ================================================================================

variable "project_id" {
  description = "The Google Cloud project ID where Firestore will be set up"
  type        = string
  validation {
    condition     = length(var.project_id) > 0
    error_message = "Project ID cannot be empty."
  }
}

variable "region" {
  description = "The region for the Firestore database"
  type        = string
  validation {
    condition     = length(var.region) > 0
    error_message = "Region cannot be empty."
  }
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  validation {
    condition     = length(var.environment) > 0
    error_message = "Environment cannot be empty."
  }
}

# ================================================================================
# DATABASE CONFIGURATION
# ================================================================================

variable "database_name" {
  description = "Name of the Firestore database (defaults to '(default)')"
  type        = string
  default     = "(default)"
}

variable "custom_firestore_rules" {
  description = "Custom Firestore security rules content (if not provided, uses default rules file)"
  type        = string
  default     = ""
}

# ================================================================================
# INDEX CONFIGURATION
# ================================================================================

variable "firestore_indexes" {
  description = "List of Firestore composite indexes to create"
  type = list(object({
    collection = string
    fields = list(object({
      field_path = string
      order      = optional(string, "ASCENDING")
      array_config = optional(string)
    }))
    query_scope = optional(string, "COLLECTION")
  }))
  default = []
}

# ================================================================================
# LABELS
# ================================================================================

variable "labels" {
  description = "Labels to apply to Firestore resources"
  type        = map(string)
  default     = {}
}
