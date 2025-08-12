/**
 * Cloud Build Module
 * 
 * This module creates Cloud Build triggers for CI/CD pipelines for the gamgui project.
 * It sets up separate triggers for Frontend, Backend, and Session components in both production and staging environments.
 */

# Create GitHub host connection
resource "google_cloudbuildv2_connection" "github_host_connection" {
  project  = var.project_id
  location = var.region
  name     = "github-host"

  github_config {
    app_installation_id = var.github_app_installation_id
    
    authorizer_credential {
      oauth_token_secret_version = "projects/${var.project_id}/secrets/github-pat/versions/latest"
    }
  }
}

# Create GitHub repository connection
resource "google_cloudbuildv2_repository" "github_repository" {
  project           = var.project_id
  location          = var.region
  name              = var.repository_name
  parent_connection = google_cloudbuildv2_connection.github_host_connection.name
  remote_uri        = "https://github.com/${var.github_owner}/${var.repository_name}.git"
}

# ==================== FRONTEND TRIGGERS ====================

# Frontend Staging Trigger
resource "google_cloudbuild_trigger" "frontend_staging_trigger" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-frontend-staging-deploy"
  description = "Build and deploy frontend to staging on staging branch push"
  
  github {
    owner = var.github_owner
    name  = var.repository_name

    push {
      branch = "^staging$"
    }
  }

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  included_files = [
    "frontend/**"
  ]

  filename = "frontend/cloudbuild-staging.yaml"

  substitutions = {
    "_REGISTRY_LOCATION" = var.region
    "_REPOSITORY_NAME"   = var.staging_repository_name
    "_IMAGE_NAME"        = "gamgui-frontend"
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# Frontend Production Trigger
resource "google_cloudbuild_trigger" "frontend_production_trigger" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-frontend-production-deploy"
  description = "Build and deploy frontend to production on main branch push"

  github {
    owner = var.github_owner
    name  = var.repository_name

    push {
      branch = "^main$"
    }
  }

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  included_files = [
    "frontend/**"
  ]

  filename = "frontend/cloudbuild-prod.yaml"

  substitutions = {
    "_REGISTRY_LOCATION" = var.region
    "_REPOSITORY_NAME"   = var.production_repository_name
    "_IMAGE_NAME"        = "gamgui-frontend"
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# Frontend PR Validation
resource "google_cloudbuild_trigger" "frontend_pr_validation" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-frontend-pr-validation"
  description = "Run tests on Frontend PR to staging or main"

  github {
    owner = var.github_owner
    name  = var.repository_name

    pull_request {
      branch          = "^(staging|main)$"
      comment_control = "COMMENTS_ENABLED"
    }
  }

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  included_files = [
    "frontend/**"
  ]

  filename = "frontend/cloudbuild-validation.yaml"

  substitutions = {
    "_IMAGE_NAME" = "gamgui-frontend"
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# ==================== BACKEND TRIGGERS ====================

# Backend Staging Trigger
resource "google_cloudbuild_trigger" "backend_staging_trigger" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-backend-staging-deploy"
  description = "Build and deploy backend to staging on staging branch push"

  github {
    owner = var.github_owner
    name  = var.repository_name

    push {
      branch = "^staging$"
    }
  }

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  included_files = [
    "backend/**"
  ]

  filename = "backend/cloudbuild-staging.yaml"

  substitutions = {
    "_REGISTRY_LOCATION" = var.region
    "_REPOSITORY_NAME"   = var.staging_repository_name
    "_IMAGE_NAME"        = "gamgui-backend"
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# Backend Production Trigger
resource "google_cloudbuild_trigger" "backend_production_trigger" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-backend-production-deploy"
  description = "Build and deploy backend to production on main branch push"

  github {
    owner = var.github_owner
    name  = var.repository_name

    push {
      branch = "^main$"
    }
  }

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  included_files = [
    "backend/**"
  ]

  filename = "backend/cloudbuild-prod.yaml"

  substitutions = {
    "_REGISTRY_LOCATION" = var.region
    "_REPOSITORY_NAME"   = var.production_repository_name
    "_IMAGE_NAME"        = "gamgui-backend"
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# Backend PR Validation
resource "google_cloudbuild_trigger" "backend_pr_validation" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-backend-pr-validation"
  description = "Run tests on Backend PR to staging or main"

  github {
    owner = var.github_owner
    name  = var.repository_name

    pull_request {
      branch          = "^(staging|main)$"
      comment_control = "COMMENTS_ENABLED"
    }
  }

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  included_files = [
    "backend/**"
  ]

  filename = "backend/cloudbuild-validation.yaml"

  substitutions = {
    "_IMAGE_NAME" = "gamgui-backend"
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# ==================== SESSION TRIGGERS ====================

# Session Staging Trigger
resource "google_cloudbuild_trigger" "session_staging_trigger" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-session-staging-deploy"
  description = "Build and deploy session to staging on staging branch push"

  github {
    owner = var.github_owner
    name  = var.repository_name

    push {
      branch = "^staging$"
    }
  }

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  included_files = [
    "docker/gamgui-session/**"
  ]

  filename = "docker/gamgui-session/cloudbuild-staging.yaml"

  substitutions = {
    "_REGISTRY_LOCATION" = var.region
    "_REPOSITORY_NAME"   = var.staging_repository_name
    "_IMAGE_NAME"        = "gamgui-session"
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# Session Production Trigger
resource "google_cloudbuild_trigger" "session_production_trigger" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-session-production-deploy"
  description = "Build and deploy session to production on main branch push"

  github {
    owner = var.github_owner
    name  = var.repository_name

    push {
      branch = "^main$"
    }
  }

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  included_files = [
    "docker/gamgui-session/**"
  ]

  filename = "docker/gamgui-session/cloudbuild-prod.yaml"

  substitutions = {
    "_REGISTRY_LOCATION" = var.region
    "_REPOSITORY_NAME"   = var.production_repository_name
    "_IMAGE_NAME"        = "gamgui-session"
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# Session PR Validation
resource "google_cloudbuild_trigger" "session_pr_validation" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-session-pr-validation"
  description = "Run tests on Session PR to staging or main"

  github {
    owner = var.github_owner
    name  = var.repository_name

    pull_request {
      branch          = "^(staging|main)$"
      comment_control = "COMMENTS_ENABLED"
    }
  }

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  included_files = [
    "docker/gamgui-session/**"
  ]

  filename = "docker/gamgui-session/cloudbuild-validation.yaml"

  substitutions = {
    "_IMAGE_NAME" = "gamgui-session"
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}
