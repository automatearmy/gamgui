# ================================================================================
# FIRESTORE DATABASE OUTPUTS
# ================================================================================

output "database_name" {
  description = "The name of the Firestore database"
  value       = google_firestore_database.database.name
}

output "database_id" {
  description = "The ID of the Firestore database"
  value       = google_firestore_database.database.id
}

output "database_location" {
  description = "The location of the Firestore database"
  value       = google_firestore_database.database.location_id
}

output "database_type" {
  description = "The type of the Firestore database"
  value       = google_firestore_database.database.type
}

output "database_create_time" {
  description = "The creation time of the Firestore database"
  value       = google_firestore_database.database.create_time
}

output "database_uid" {
  description = "The unique identifier of the Firestore database"
  value       = google_firestore_database.database.uid
}

# ================================================================================
# FIREBASE PROJECT OUTPUTS
# ================================================================================

output "firebase_project_id" {
  description = "The Firebase project ID"
  value       = google_firebase_project.default.project
}

output "firebase_project_number" {
  description = "The Firebase project number"
  value       = google_firebase_project.default.project_number
}

output "firebase_display_name" {
  description = "The Firebase project display name"
  value       = google_firebase_project.default.display_name
}

output "firestore_config" {
  description = "Complete Firestore configuration summary"
  value = {
    project_id      = var.project_id
    database_name   = google_firestore_database.database.name
    database_type   = google_firestore_database.database.type
    location        = google_firestore_database.database.location_id
    environment     = var.environment
    rules_deployed  = true
    indexes_count   = length(google_firestore_index.indexes)
  }
}
