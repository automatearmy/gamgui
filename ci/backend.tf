/**
 * Terraform backend configuration
 * This configuration sets up a Google Cloud Storage bucket as the Terraform state backend
 */

terraform {
  backend "gcs" {}
}
