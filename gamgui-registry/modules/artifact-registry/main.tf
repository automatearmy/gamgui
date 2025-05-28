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
 * Artifact Registry Module
 * 
 * This module creates and manages Google Cloud Artifact Registry repositories for storing
 * both production and staging Docker images for the gamgui-app project.
 */

resource "google_artifact_registry_repository" "production" {
  provider      = google-beta
  location      = var.region
  repository_id = "gamgui-app"
  description   = "Production Docker repository for gamgui-app"
  format        = "DOCKER"
}

resource "google_artifact_registry_repository" "staging" {
  provider      = google-beta
  location      = var.region
  repository_id = "gamgui-app-staging"
  description   = "Staging Docker repository for gamgui-app"
  format        = "DOCKER"
}