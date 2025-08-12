locals {
  # Default labels applied to all resources
  default_labels = merge({
    managed-by  = "terraform"
    module      = "firestore"
    project     = var.project_id
    environment = var.environment
  }, var.labels)

  # Firestore rules content - use custom rules if provided, otherwise use default file
  firestore_rules_content = var.custom_firestore_rules != "" ? var.custom_firestore_rules : file("${path.module}/firestore.rules")

  # Database configuration
  database_config = {
    name                        = var.database_name
    location_id                 = var.region
    type                        = "FIRESTORE_NATIVE"
    app_engine_integration_mode = "DISABLED"
    delete_protection_state     = "DELETE_PROTECTION_ENABLED"
    point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_DISABLED"
  }

  # Create a map of indexes for easier management
  firestore_indexes_map = {
    for idx, index in var.firestore_indexes : 
    "${index.collection}-${idx}" => index
  }
}
