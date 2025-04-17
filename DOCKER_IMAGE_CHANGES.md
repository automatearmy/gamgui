# Docker Image Changes

This document explains the changes made to remove the "Create Docker Image" functionality and replace it with a pre-built image approach.

## Overview

Previously, the application allowed users to create a Docker image after uploading their credential files. This approach had several limitations:

1. It required Docker to be installed and running on the server
2. It didn't work in Cloud Run environments where Docker daemon access is restricted
3. It created a new image for each user, which was inefficient

The new approach uses a pre-built Docker image (`docker-gam7:latest`) that is referenced when creating sessions, eliminating the need for users to create their own images.

## Changes Made

### Server-Side Changes

1. **Modified `imageRoutes.js`**:
   - Removed the Docker image building functionality
   - Changed the endpoint to create a reference to the pre-built image instead
   - Simplified the code by removing Docker-related dependencies

2. **Modified `sessionRoutes.js`**:
   - Added a default image configuration
   - Updated the session creation logic to use the default image if no image is specified
   - Made image ID optional in the API

### Client-Side Changes

1. **Modified `settings/index.tsx`**:
   - Removed the "Create Docker Image" button and related functionality
   - Updated the UI to reflect the new workflow
   - Simplified the credential upload process

2. **Modified `sessions/new.tsx`**:
   - Updated to use the default image if no images are available
   - Removed the redirection to settings page when no images exist

3. **Modified `sessions/index.tsx`**:
   - Always enabled the "New Session" button
   - Removed the check for available images

## How to Use

### Building and Pushing the Pre-built Image

We've created a Dockerfile and script to simplify the process of building and pushing the GAM Docker image:

1. **Dockerfile.gam**: A minimal Dockerfile for the GAM image
2. **build-and-push-gam.sh**: A script to build and push the image to Google Container Registry

To build and push the image:

```bash
# Make the script executable (if not already)
chmod +x build-and-push-gam.sh

# Run the script
./build-and-push-gam.sh
```

The script will:
1. Build the Docker image using Dockerfile.gam
2. Tag it for Google Container Registry
3. Push it to gcr.io/gamgui-registry/docker-gam7:latest

The `DEFAULT_IMAGE_NAME` in `imageRoutes.js` has already been updated to use this image path.

### Terraform Configuration

After pushing the image, you'll need to update the Terraform configuration in the gamgui-terraform repository:

```terraform
variable "gam_image" {
  description = "GAM Docker image URL in Artifact Registry"
  type        = string
  default     = "gcr.io/gamgui-registry/docker-gam7:latest"
}

module "server_service" {
  # ...
  env_vars = {
    "PROJECT_ID" = var.project_id
    "GAM_IMAGE" = var.gam_image
    # ...
  }
}
```

## Future Improvements

For a more robust solution, consider implementing:

1. **CI/CD Pipeline**:
   - Set up a GitHub repository for the GAM Dockerfile
   - Configure Cloud Build to automatically build and push the image when changes are made
   - Update the application to use the latest image from the registry

2. **Version Management**:
   - Add version tags to the images
   - Allow administrators to select which version to use as the default
   - Implement a version history and rollback mechanism

3. **Credential Management**:
   - Improve how credentials are mounted into the container
   - Consider using Kubernetes secrets or Cloud Run volume mounts for better security

## Troubleshooting

If you encounter issues with the pre-built image:

1. **Image Not Found**:
   - Verify the image exists: `docker images | grep docker-gam7`
   - Check if the image name in `imageRoutes.js` matches the built image

2. **Permission Issues**:
   - Ensure the service account has permission to pull the image from the registry
   - Check if the container has access to the mounted credential files

3. **Container Creation Fails**:
   - Check the server logs for detailed error messages
   - Verify that the Docker daemon is running (for local development)
   - Ensure the image is compatible with the deployment environment
