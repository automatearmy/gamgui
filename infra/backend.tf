# ================================================================================
# TERRAFORM BACKEND CONFIGURATION
# ================================================================================

# Backend configuration for Terraform state management
# Uses Google Cloud Storage (GCS) to store the Terraform state
terraform {
  backend "gcs" {
    prefix = "/terraform/state"
  }
}
