#!/bin/bash
# Automated deployment script for GamGUI
# This script automates the process of updating code, building and pushing Docker images,
# and applying Terraform changes without requiring manual intervention.

# Exit on error
set -e

# Configuration
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
SERVER_DIR="$PROJECT_ROOT/gamgui-server"
CLIENT_DIR="$PROJECT_ROOT/gamgui-client"
TERRAFORM_DIR="$PROJECT_ROOT/../gamgui-terraform"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
LOG_FILE="$PROJECT_ROOT/deploy_${TIMESTAMP}.log"

# Function to log messages
log() {
  echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1" | tee -a "$LOG_FILE"
}

# Function to update version indicators in code
update_version_indicators() {
  log "Updating version indicators in code..."
  
  # Update KubernetesAdapter.js version
  if [ -f "$SERVER_DIR/services/container/KubernetesAdapter.js" ]; then
    sed -i.bak "s/v[0-9]\{8\}_[0-9]\{6\}Z/v${TIMESTAMP}/" "$SERVER_DIR/services/container/KubernetesAdapter.js"
    rm "$SERVER_DIR/services/container/KubernetesAdapter.js.bak"
    log "Updated KubernetesAdapter.js version to v${TIMESTAMP}"
  else
    log "Warning: KubernetesAdapter.js not found"
  fi
  
  # Update other version indicators as needed
  # ...
}

# Function to build and push server image
build_push_server() {
  log "Building and pushing server image..."
  cd "$PROJECT_ROOT"
  
  # Execute the build-and-push-server.sh script
  if [ -f "./build-and-push-server.sh" ]; then
    # Modify the script to run non-interactively
    # Create a temporary version of the script without interactive prompts
    TMP_SCRIPT="/tmp/build-push-server-auto.sh"
    cat "./build-and-push-server.sh" | sed 's/read -p "Do you want to build and push the server Docker image? (y\/n)" -n 1 -r/REPLY="y"/' > "$TMP_SCRIPT"
    chmod +x "$TMP_SCRIPT"
    
    # Run the non-interactive script
    "$TMP_SCRIPT" >> "$LOG_FILE" 2>&1
    rm "$TMP_SCRIPT"
    
    log "Server image built and pushed successfully"
  else
    log "Error: build-and-push-server.sh not found"
    exit 1
  fi
}

# Function to build and push client image
build_push_client() {
  log "Building and pushing client image..."
  cd "$PROJECT_ROOT"
  
  # Execute the build-and-push-client.sh script
  if [ -f "./build-and-push-client.sh" ]; then
    # Get the server URL from Terraform output
    cd "$TERRAFORM_DIR"
    SERVER_URL=$(terraform output -raw server_url 2>/dev/null || echo "https://gamgui-server-2fdozy6y5a-uc.a.run.app")
    cd "$PROJECT_ROOT"
    
    # Create a temporary version of the script without interactive prompts
    TMP_SCRIPT="/tmp/build-push-client-auto.sh"
    cat "./build-and-push-client.sh" | \
      sed 's/read -p "Do you want to build and push the client Docker image? (y\/n)" -n 1 -r/REPLY="y"/' | \
      sed "s|read SERVER_URL|SERVER_URL=\"$SERVER_URL\"|" | \
      sed 's/read GOOGLE_CLIENT_ID/GOOGLE_CLIENT_ID="1007518649235-tkosj5ufu9t53ikkulgva45v6nfagono.apps.googleusercontent.com"/' > "$TMP_SCRIPT"
    chmod +x "$TMP_SCRIPT"
    
    # Run the non-interactive script
    "$TMP_SCRIPT" >> "$LOG_FILE" 2>&1
    rm "$TMP_SCRIPT"
    
    log "Client image built and pushed successfully"
  else
    log "Error: build-and-push-client.sh not found"
    exit 1
  fi
}

# Function to update Terraform variables
update_terraform_variables() {
  log "Updating Terraform variables..."
  cd "$TERRAFORM_DIR"
  
  # Create a fixed version of null_resource_trigger.tf without example resources
  cat > "null_resource_trigger.tf" << EOF
# Version or timestamp for the server image
variable "server_image_version" {
  description = "Version or timestamp for the server image"
  type        = string
  default     = "v${TIMESTAMP}" # Update this when you push a new server image
}

# Version or timestamp for the client image
variable "client_image_version" {
  description = "Version or timestamp for the client image"
  type        = string
  default     = "v${TIMESTAMP}" # Update this when you push a new client image
}

# Null resource that triggers when the server image changes
resource "null_resource" "server_image_update_trigger" {
  triggers = {
    image_version = var.server_image_version
  }

  # Optional: Add a provisioner to run commands when the image version changes
  provisioner "local-exec" {
    command = "echo 'Server image updated to \${var.server_image_version} at \$(date)' >> image_update_log.txt"
  }
}

# Null resource that triggers when the client image changes
resource "null_resource" "client_image_update_trigger" {
  triggers = {
    image_version = var.client_image_version
  }

  # Optional: Add a provisioner to run commands when the image version changes
  provisioner "local-exec" {
    command = "echo 'Client image updated to \${var.client_image_version} at \$(date)' >> image_update_log.txt"
  }
}

# Outputs for reference
output "server_image_version" {
  value = var.server_image_version
}

output "client_image_version" {
  value = var.client_image_version
}
EOF
    
  log "Updated Terraform variables with new timestamp: v${TIMESTAMP}"
}

# Function to apply Terraform changes
apply_terraform() {
  log "Applying Terraform changes..."
  cd "$TERRAFORM_DIR"
  
  # Run terraform apply with auto-approve
  terraform apply -auto-approve >> "$LOG_FILE" 2>&1
  
  log "Terraform changes applied successfully"
}

# Main deployment process
main() {
  log "Starting automated deployment process..."
  
  # 1. Update version indicators in code
  update_version_indicators
  
  # 2. Build and push server image
  build_push_server
  
  # 3. Build and push client image
  build_push_client
  
  # 4. Update Terraform variables
  update_terraform_variables
  
  # 5. Apply Terraform changes
  apply_terraform
  
  log "Deployment completed successfully!"
  log "New version: v${TIMESTAMP}"
  log "Log file: $LOG_FILE"
}

# Execute the main function
main
