# ================================================================================
# PROVIDER CONFIGURATION
# ================================================================================

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ================================================================================
# GKE AUTHENTICATION
# ================================================================================

# GKE authentication for kubernetes provider
data "google_client_config" "default" {}

# Kubernetes provider configuration with empty values - 
# will be replaced by proper values after cluster is created
provider "kubernetes" {
  host                   = try("https://${module.gke.cluster_endpoint}", "https://localhost")
  token                  = try(data.google_client_config.default.access_token, "")
  cluster_ca_certificate = try(base64decode(module.gke.cluster_ca_certificate), "")
}
