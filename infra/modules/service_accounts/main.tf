# ================================================================================
# SERVICE ACCOUNTS
# ================================================================================

# Backend Service Account
resource "google_service_account" "backend_service_account" {
  project      = var.project_id
  account_id   = local.service_accounts.backend.account_id
  display_name = local.service_accounts.backend.display_name
  description  = local.service_accounts.backend.description
  disabled     = false

  dynamic "timeouts" {
    for_each = []
    content {
      create = "5m"
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Frontend Service Account
resource "google_service_account" "frontend_service_account" {
  project      = var.project_id
  account_id   = local.service_accounts.frontend.account_id
  display_name = local.service_accounts.frontend.display_name
  description  = local.service_accounts.frontend.description
  disabled     = false

  dynamic "timeouts" {
    for_each = []
    content {
      create = "5m"
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Session Service Account
resource "google_service_account" "session_service_account" {
  project      = var.project_id
  account_id   = local.service_accounts.session.account_id
  display_name = local.service_accounts.session.display_name
  description  = local.service_accounts.session.description
  disabled     = false

  dynamic "timeouts" {
    for_each = []
    content {
      create = "5m"
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

# ================================================================================
# IAM ROLE BINDINGS
# ================================================================================

# Backend Service Account IAM Bindings
resource "google_project_iam_member" "backend_service_account_roles" {
  for_each = toset(local.service_accounts.backend.roles)
  
  project = var.project_id
  role    = each.value
  member  = google_service_account.backend_service_account.member

  depends_on = [google_service_account.backend_service_account]
}

# Frontend Service Account IAM Bindings
resource "google_project_iam_member" "frontend_service_account_roles" {
  for_each = toset(local.service_accounts.frontend.roles)
  
  project = var.project_id
  role    = each.value
  member  = google_service_account.frontend_service_account.member

  depends_on = [google_service_account.frontend_service_account]
}

# Session Service Account IAM Bindings
resource "google_project_iam_member" "session_service_account_roles" {
  for_each = toset(local.service_accounts.session.roles)
  
  project = var.project_id
  role    = each.value
  member  = google_service_account.session_service_account.member

  depends_on = [google_service_account.session_service_account]
}
