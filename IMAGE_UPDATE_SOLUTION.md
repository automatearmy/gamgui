# Ensuring Docker Image Updates Are Applied Correctly

## Issue Overview

When making changes to the application code, you may encounter situations where the changes don't seem to be reflected in the deployed application, even after:

1. Building and pushing the Docker image with `build-and-push-server.sh` or `build-and-push-client.sh`
2. Applying Terraform changes with `terraform apply`

## Common Causes

Several factors can prevent updates from being properly applied:

1. **Docker Image Caching**: Docker may use cached layers during the build process, preventing new code from being included
2. **Container Registry Caching**: The container registry may cache images with the same tag
3. **Kubernetes/Cloud Run Caching**: Kubernetes or Cloud Run may not pull a new image if the image tag hasn't changed
4. **Terraform Resource Configuration**: Terraform may not detect changes if the resource configuration doesn't include elements that force updates

## Solution Steps

### 1. Ensure Docker Builds Without Cache

When building Docker images, use the `--no-cache` flag to ensure all layers are rebuilt:

```bash
# This is already included in the build-and-push-server.sh script
docker build --no-cache -t your-image-name .
```

### 2. Use Unique Tags or Digests

Instead of always using the `:latest` tag, consider using version tags or including a timestamp:

```bash
# Example of tagging with a timestamp
TIMESTAMP=$(date +%Y%m%d%H%M%S)
docker tag your-image-name:latest your-image-name:${TIMESTAMP}
docker push your-image-name:${TIMESTAMP}
```

### 3. Update Version Indicators in Code

Include version indicators in your code that make it easy to verify which version is running:

```javascript
// Example in KubernetesAdapter.js
console.log("!!!! KUBERNETES ADAPTER VERSION CHECK: v20250512_231400Z !!!!");
```

### 4. Force Terraform to Recognize Changes

Modify your Terraform configuration to detect and apply image updates:

#### Option 1: Use Image Digests

Reference images by their digest instead of tags:

```hcl
resource "google_cloud_run_service" "service" {
  # ...
  template {
    spec {
      containers {
        image = "gcr.io/project/image@sha256:digest"
      }
    }
  }
}
```

#### Option 2: Add a Trigger for Updates

Add a `null_resource` with a trigger that changes when the image is updated:

```hcl
resource "null_resource" "image_update_trigger" {
  triggers = {
    image_version = "v20250512_231400Z" # Update this when you push a new image
  }
}
```

#### Option 3: Use a Timestamp in Terraform Variables

Use a timestamp variable that you update when deploying:

```hcl
variable "deployment_timestamp" {
  description = "Timestamp for forcing redeployment"
  default     = "20250512231400"
}

resource "google_cloud_run_service" "service" {
  # ...
  template {
    metadata {
      annotations = {
        "deployment-timestamp" = var.deployment_timestamp
      }
    }
    # ...
  }
}
```

### 5. Verify Deployment

After deploying, verify that the new version is running:

1. Check logs for the version indicator message
2. Execute a command that tests functionality added in the new version
3. Inspect the container image ID in the running environment

## Recommended Workflow

1. Make code changes and include a version indicator
2. Build with `--no-cache` and push with a unique tag
3. Update Terraform configuration to recognize the new image
4. Apply Terraform changes
5. Verify the deployment shows the new version indicator

By following these steps, you can ensure that your code changes are properly reflected in the deployed application.
