# ================================================================================
# LOCAL VALUES
# ================================================================================

locals {
  # Default set of APIs required for GAMGUI
  default_apis = [
    "cloudidentity.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "compute.googleapis.com",
    "dns.googleapis.com",
    "firebase.googleapis.com",
    "firestore.googleapis.com",
    "firebaserules.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "networkmanagement.googleapis.com",
    "secretmanager.googleapis.com",
    "servicenetworking.googleapis.com",
    "serviceusage.googleapis.com",
    "stackdriver.googleapis.com",
    "storage.googleapis.com",
    "vpcaccess.googleapis.com",
    "run.googleapis.com",
    "iap.googleapis.com",
    "cloudscheduler.googleapis.com",
    "container.googleapis.com",
    "drivelabels.googleapis.com",
    "drive.googleapis.com",
    "cloudbuild.googleapis.com"
  ]

  # Use provided APIs or default set
  apis_to_enable = length(var.apis_to_enable) > 0 ? var.apis_to_enable : local.default_apis
}
