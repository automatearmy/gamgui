# ================================================================================
# CORE VARIABLES
# ================================================================================

variable "project_id" {
  description = "The Google Cloud project ID where secrets will be managed"
  type        = string
}

variable "region" {
  description = "The Google Cloud region where secrets will be replicated"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, production) - will be added to secret names"
  type        = string
}

# ================================================================================
# OAUTH SECRETS ACCESSORS
# ================================================================================

variable "accessors" {
  description = "Object containing lists of service account emails that need access to OAuth secrets"
  type = object({
    frontend = list(string)
    backend  = list(string)
    session  = list(string)
  })
  default = {
    frontend = []
    backend  = []
    session  = []
  }
}

# ================================================================================
# CUSTOM SECRET NAMES
# ================================================================================

variable "custom_frontend_client_id_secret_name" {
  description = "Custom name for the frontend OAuth client ID secret (defaults to gamgui-frontend-client-id[-environment])"
  type        = string
  default     = ""
}

variable "custom_frontend_client_secret_secret_name" {
  description = "Custom name for the frontend OAuth client secret (defaults to gamgui-frontend-client-secret[-environment])"
  type        = string
  default     = ""
}

variable "custom_backend_client_id_secret_name" {
  description = "Custom name for the backend OAuth client ID secret (defaults to gamgui-backend-client-id[-environment])"
  type        = string
  default     = ""
}

variable "custom_backend_client_secret_secret_name" {
  description = "Custom name for the backend OAuth client secret (defaults to gamgui-backend-client-secret[-environment])"
  type        = string
  default     = ""
}
