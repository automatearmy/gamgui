# ================================================================================
# TERRAFORM VERSION REQUIREMENTS
# ================================================================================

terraform {
  required_version = ">= 1.5.7"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "6.47.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "6.47.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}
