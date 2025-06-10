# * Copyright 2025 Infinite Developer Theorem Inc
# *
# * Licensed under the Apache License, Version 2.0 (the "License");
# * you may not use this file except in compliance with the License.
# * You may obtain a copy of the License at
# *
# *      http://www.apache.org/licenses/LICENSE-2.0
# *
# * Unless required by applicable law or agreed to in writing, software
# * distributed under the License is distributed on an "AS IS" BASIS,
# * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# * See the License for the specific language governing permissions and
# * limitations under the License.

/**
 * Cloud Build Module
 * 
 * This module creates Cloud Build triggers for CI/CD pipelines for the gamgui-app project.
 * It sets up separate triggers for Client, Server, and GAM Docker components in both production and staging environments.
 */

# Create GitHub repository connection
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

resource "google_cloudbuildv2_repository" "github_repository" {
  project           = var.project_id
  location          = var.region
  name              = var.repository_name
  parent_connection = google_cloudbuildv2_connection.github_host_connection.name
  remote_uri        = "https://github.com/${var.github_owner}/${var.repository_name}.git"
}

# Client Staging Trigger
resource "google_cloudbuild_trigger" "client_staging_trigger" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-client-staging-deploy"
  description = "Build and deploy Client to staging on staging branch push"
  
  github {
    owner = var.github_owner
    name  = var.repository_name

    push {
      branch = "^staging$"
    }
  }

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  included_files = [
    "gamgui-client/**"
  ]

  filename = "gamgui-client/cloudbuild-staging.yaml"

  substitutions = {
    "_REGISTRY_LOCATION" = var.region
    "_REPOSITORY_NAME"   = var.staging_repository_id
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# Client Production Trigger
resource "google_cloudbuild_trigger" "client_production_trigger" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-client-production-deploy"
  description = "Build and deploy Client to production on main branch push"

  github {
    owner = var.github_owner
    name  = var.repository_name

    push {
      branch = "^main$"
    }
  }

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  included_files = [
    "gamgui-client/**"
  ]

  filename = "gamgui-client/cloudbuild-prod.yaml"

  substitutions = {
    "_REGISTRY_LOCATION" = var.region
    "_REPOSITORY_NAME"   = var.production_repository_id
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# Server Staging Trigger
resource "google_cloudbuild_trigger" "server_staging_trigger" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-server-staging-deploy"
  description = "Build and deploy Server to staging on staging branch push"

  github {
    owner = var.github_owner
    name  = var.repository_name

    push {
      branch = "^staging$"
    }
  }

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  included_files = [
    "gamgui-server/**"
  ]

  filename = "gamgui-server/cloudbuild-staging.yaml"

  substitutions = {
    "_REGISTRY_LOCATION" = var.region
    "_REPOSITORY_NAME"   = var.staging_repository_id
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# Server Production Trigger
resource "google_cloudbuild_trigger" "server_production_trigger" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-server-production-deploy"
  description = "Build and deploy Server to production on main branch push"

  github {
    owner = var.github_owner
    name  = var.repository_name

    push {
      branch = "^main$"
    }
  }

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  included_files = [
    "gamgui-server/**"
  ]

  filename = "gamgui-server/cloudbuild-prod.yaml"

  substitutions = {
    "_REGISTRY_LOCATION" = var.region
    "_REPOSITORY_NAME"   = var.production_repository_id
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# GAM Docker Staging Trigger
resource "google_cloudbuild_trigger" "gam_docker_staging_trigger" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-gam-docker-staging-deploy"
  description = "Build and deploy GAM Docker to staging on staging branch push"

  github {
    owner = var.github_owner
    name  = var.repository_name

    push {
      branch = "^staging$"
    }
  }

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  included_files = [
    "gamgui-gam-docker/**"
  ]

  filename = "gamgui-gam-docker/cloudbuild-staging.yaml"

  substitutions = {
    "_REGISTRY_LOCATION" = var.region
    "_REPOSITORY_NAME"   = var.staging_repository_id
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# GAM Docker Production Trigger
resource "google_cloudbuild_trigger" "gam_docker_production_trigger" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-gam-docker-production-deploy"
  description = "Build and deploy GAM Docker to production on main branch push"

  github {
    owner = var.github_owner
    name  = var.repository_name

    push {
      branch = "^main$"
    }
  }

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  included_files = [
    "gamgui-gam-docker/**"
  ]

  filename = "gamgui-gam-docker/cloudbuild-prod.yaml"

  substitutions = {
    "_REGISTRY_LOCATION" = var.region
    "_REPOSITORY_NAME"   = var.production_repository_id
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# PR Validation Triggers for each component

# Client PR Validation
resource "google_cloudbuild_trigger" "client_pr_validation" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-client-pr-validation"
  description = "Run tests on Client PR to staging or main"

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
    "gamgui-client/**"
  ]

  filename = "gamgui-client/cloudbuild-validation.yaml"

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# Server PR Validation
resource "google_cloudbuild_trigger" "server_pr_validation" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-server-pr-validation"
  description = "Run tests on Server PR to staging or main"

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
    "gamgui-server/**"
  ]

  filename = "gamgui-server/cloudbuild-validation.yaml"

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# GAM Docker PR Validation
resource "google_cloudbuild_trigger" "gam_docker_pr_validation" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-gam-docker-pr-validation"
  description = "Run tests on GAM Docker PR to staging or main"

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
    "gamgui-gam-docker/**"
  ]

  filename = "gamgui-gam-docker/cloudbuild-validation.yaml"

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# Session Staging Trigger
resource "google_cloudbuild_trigger" "session_staging_trigger" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-session-staging-deploy"
  description = "Build and deploy Session to staging on staging branch push"

  github {
    owner = var.github_owner
    name  = var.repository_name

    push {
      branch = "^staging$"
    }
  }

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  included_files = [
    "gamgui-session/**"
  ]

  filename = "gamgui-session/cloudbuild-staging.yaml"

  substitutions = {
    "_REGISTRY_LOCATION" = var.region
    "_REPOSITORY_NAME"   = var.staging_repository_id
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}

# Session Production Trigger
resource "google_cloudbuild_trigger" "session_production_trigger" {
  project     = var.project_id
  location    = var.region
  name        = "gamgui-session-production-deploy"
  description = "Build and deploy Session to production on main branch push"

  github {
    owner = var.github_owner
    name  = var.repository_name

    push {
      branch = "^main$"
    }
  }

  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

  included_files = [
    "gamgui-session/**"
  ]

  filename = "gamgui-session/cloudbuild-prod.yaml"

  substitutions = {
    "_REGISTRY_LOCATION" = var.region
    "_REPOSITORY_NAME"   = var.production_repository_id
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
    "gamgui-session/**"
  ]

  filename = "gamgui-session/cloudbuild-validation.yaml"

  service_account = "projects/${var.project_id}/serviceAccounts/${var.cloudbuild_service_account}"
}
