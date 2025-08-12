# ================================================================================
# PROJECT MODULE - Enables required APIs and fetches project data
# ================================================================================

module "project" {
  source     = "./modules/project"
  project_id = var.project_id
}

# ================================================================================
# SERVICE ACCOUNTS MODULE - Creates service accounts and grants permissions
# ================================================================================

module "service_accounts" {
  source      = "./modules/service_accounts"
  project_id  = var.project_id
  environment = var.environment

  # Service Account APIs need to be enabled first
  depends_on = [module.project]
}

# ================================================================================
# FIRESTORE MODULE - Creates Firestore database
# ================================================================================

module "firestore" {
  source      = "./modules/firestore"
  project_id  = var.project_id
  region      = var.region
  environment = var.environment

  # Firestore APIs need to be enabled first
  depends_on = [module.project]
}

# ================================================================================
# SECRET MANAGER MODULE - Creates secret manager secrets
# ================================================================================

module "secret_manager" {
  source      = "./modules/secret_manager"
  project_id  = var.project_id
  region      = var.region
  environment = var.environment

  accessors = {
    frontend = [
      module.service_accounts.frontend_service_account_email,
    ]
    backend = [
      module.service_accounts.backend_service_account_email,
    ]
    session = [
      module.service_accounts.session_service_account_email,
    ]
  }

  # Secret Manager APIs need to be enabled first
  depends_on = [module.project]
}

# ================================================================================
# NETWORKING MODULE - Creates VPC, subnets, NAT, firewall rules
# ================================================================================

module "networking" {
  source             = "./modules/networking"
  project_id         = var.project_id
  environment        = var.environment
  region             = var.region
  enable_nat_logging = true

  # Networking APIs need to be enabled first
  depends_on = [module.project]
}

# ================================================================================
# GKE MODULE - GKE Cluster for Session Management
# ================================================================================

module "gke" {
  source = "./modules/gke"

  project_id     = var.project_id
  project_number = module.project.project_number
  region         = var.region

  # Network configuration
  network                  = module.networking.network_id
  subnetwork               = module.networking.subnets["kube"].id
  secondary_range_pods     = "gke-kube-pods"
  secondary_range_services = "gke-kube-svcs"

  session_service_account_email = module.service_accounts.session_service_account_email

  depends_on = [
    module.service_accounts,
    module.networking
  ]
}

# ================================================================================
# CLOUD RUN MODULE
# ================================================================================

module "cloud_run" {
  source = "./modules/cloud_run"

  # Project info
  project_id     = var.project_id
  project_number = module.project.project_number
  region         = var.region
  environment    = var.environment

  # Registry details
  registry_project_id      = var.registry_project
  registry_region          = var.registry_region
  registry_repository_name = var.registry_repository_name

  # Image names
  backend_image_name  = var.backend_image_name
  frontend_image_name = var.frontend_image_name
  session_image_name  = var.session_image_name

  # Service Account emails from service_accounts module
  backend_service_account_email  = module.service_accounts.backend_service_account_email
  frontend_service_account_email = module.service_accounts.frontend_service_account_email

  # Secret names from secrets module
  backend_client_id_secret_name     = module.secret_manager.backend_client_id_secret_name
  backend_client_secret_secret_name = module.secret_manager.backend_client_secret_secret_name
  frontend_client_id_secret_name    = module.secret_manager.frontend_client_id_secret_name
  frontend_client_secret_secret_name = module.secret_manager.frontend_client_secret_secret_name

  # VPC networking for Direct VPC Egress
  vpc_egress_setting = "PRIVATE_RANGES_ONLY"
  network            = module.networking.network_id
  subnet             = module.networking.subnets["services"].id

  depends_on = [
    module.service_accounts,
    module.secret_manager,
    module.networking
  ]
}

# ================================================================================
# DNS MODULE - Critical for service-to-service communication within VPC
# ================================================================================

module "private_dns" {
  source     = "./modules/dns"
  project_id = var.project_id
  name       = "private-cloud-run"

  zone_config = {
    domain = "run.app."
    private = {
      client_networks = [module.networking.network_id]
    }
  }

  depends_on = [module.networking, module.cloud_run]
}

# DNS record for API service (allows UI to access API via VPC)
resource "google_dns_record_set" "api_dns_record" {
  project      = var.project_id
  managed_zone = module.private_dns.name
  name         = "${trimprefix(module.cloud_run.backend_service_url, "https://")}."
  type         = "A"
  ttl          = 60
  rrdatas      = local.cloud_run_internal_ips # Google's internal IP range for Cloud Run

  depends_on = [
    module.private_dns,
    module.cloud_run
  ]
}
