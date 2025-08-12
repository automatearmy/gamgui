# ================================================================================
# LOCAL VALUES
# ================================================================================

locals {
  # Service Accounts
  compute_engine_default_sa = "${module.project.project_number}-compute@developer.gserviceaccount.com"
  serverless_default_sa     = "service-${module.project.project_number}@serverless-robot-prod.iam.gserviceaccount.com"

  # Cloud Run internal IP addresses (Google's reserved range)
  cloud_run_internal_ips = ["199.36.153.8", "199.36.153.9", "199.36.153.10", "199.36.153.11"]
}
