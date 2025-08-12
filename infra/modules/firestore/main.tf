# ================================================================================
# FIREBASE PROJECT
# ================================================================================

# Firebase Project (using beta provider)
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  lifecycle {
    prevent_destroy = true
  }
}

# ================================================================================
# FIRESTORE DATABASE
# ================================================================================

# Create the Firestore database in Native mode
resource "google_firestore_database" "database" {
  project                           = var.project_id
  name                              = local.database_config.name
  location_id                       = local.database_config.location_id
  type                              = local.database_config.type
  app_engine_integration_mode       = local.database_config.app_engine_integration_mode
  delete_protection_state           = local.database_config.delete_protection_state
  point_in_time_recovery_enablement = local.database_config.point_in_time_recovery_enablement

  depends_on = [google_firebase_project.default]

  lifecycle {
    prevent_destroy = true
  }

  timeouts {
    create = "10m"
    update = "10m"
    delete = "10m"
  }
}

# ================================================================================
# FIRESTORE SECURITY RULES
# ================================================================================

# Create the Firebase Rules ruleset from the file or custom content (using beta provider)
resource "google_firebaserules_ruleset" "firestore_rules" {
  provider = google-beta
  project  = var.project_id

  source {
    files {
      name    = "firestore.rules"
      content = local.firestore_rules_content
    }
  }

  depends_on = [google_firestore_database.database]

  lifecycle {
    create_before_destroy = true
  }
}

# Apply the ruleset to the Firestore database via Firebase Rules release (using beta provider)
resource "google_firebaserules_release" "firestore_release" {
  provider     = google-beta
  project      = var.project_id
  ruleset_name = google_firebaserules_ruleset.firestore_rules.name
  name         = "cloud.firestore"

  depends_on = [google_firebaserules_ruleset.firestore_rules]

  lifecycle {
    create_before_destroy = true
  }
}

# ================================================================================
# FIRESTORE INDEXES
# ================================================================================

# Create composite indexes for Firestore queries
resource "google_firestore_index" "indexes" {
  for_each = local.firestore_indexes_map

  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = each.value.collection

  dynamic "fields" {
    for_each = each.value.fields
    content {
      field_path   = fields.value.field_path
      order        = fields.value.order
      array_config = fields.value.array_config
    }
  }

  query_scope = each.value.query_scope

  depends_on = [google_firestore_database.database]

  timeouts {
    create = "10m"
    delete = "10m"
  }
}
