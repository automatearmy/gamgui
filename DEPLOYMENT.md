# Deployment Guide for GamGUI Application

This guide provides instructions for deploying the GamGUI application to Google Cloud Run.

## Prerequisites

- Google Cloud SDK installed and configured
- Docker installed
- Git repository with the latest code

## Environment Configuration

The application uses environment variables to configure the API and Socket URLs. These are handled in two ways:

1. **For Local Development**:
   - `.env.development` - Points to localhost
   - `.env.production` - Points to Cloud Run URLs

2. **For Production Deployment**:
   - Environment variables are passed as build arguments to the Docker build process
   - These are set in the `cloudbuild.yaml` file and used in the `Dockerfile`

## Deployment Steps

### Step 1: Deploy Infrastructure with Terraform

First, deploy the infrastructure using Terraform:

```bash
# Navigate to the terraform repository
cd /path/to/gamgui-terraform

# Initialize Terraform if needed
terraform init

# Apply the Terraform configuration
terraform apply
```

After the infrastructure is deployed, get the server URL:

```bash
terraform output server_url
# This will output something like: "https://gamgui-server-2fdozy6y5a-uc.a.run.app"
```

### Step 2: Build and Deploy the Server

```bash
# Navigate to the app repository
cd /path/to/gamgui-app

# Submit the build to Google Cloud Build
gcloud builds submit --config=gamgui-server/cloudbuild.yaml

# This will:
# - Build the Docker image for the server
# - Push it to Google Artifact Registry (gcr.io/gamgui-registry/gamgui-server-image)
# - The image will be available for deployment to Cloud Run
```

### Step 3: Build and Deploy the Client

#### Option A: Automated Deployment (Recommended)

The easiest way to deploy is to use the automated deployment script in the gamgui-terraform repository:

```bash
# In gamgui-terraform repository
./deploy.sh /path/to/gamgui-app
```

This script will:
1. Deploy the infrastructure with Terraform
2. Get the server URL
3. Build and push the client image with the correct server URL
4. Update the infrastructure with the new image

#### Option B: Local Build and Push

If you prefer to build and push the client image manually:

```bash
# Run the local build and push script
./build-and-push-client.sh

# When prompted, enter the server URL from terraform output
# For example: https://gamgui-server-2fdozy6y5a-uc.a.run.app

# This script will:
# - Build the Docker image locally with the correct environment variables
# - Push the image to Google Container Registry
# - The image will be available for deployment to Cloud Run
```

This approach is reliable because:
- It avoids potential issues with Cloud Build
- You have more control over the build process
- You can see detailed error messages if something goes wrong

#### Option C: Manual Deployment

```bash
# Edit the cloudbuild.yaml file to update the server URLs
# Then submit the build to Google Cloud Build
gcloud builds submit --config=gamgui-client/cloudbuild.yaml

# This will:
# - Build the Docker image for the client with production environment variables
# - Push it to Google Artifact Registry (gcr.io/gamgui-registry/gamgui-client-image)
# - The image will be available for deployment to Cloud Run
```

> **Important**: Before deploying manually, ensure that the `cloudbuild.yaml` file has the correct server URLs in the build arguments.

### Step 4: Update Cloud Run Services (if not automatic)

If your Cloud Run services are not set to automatically deploy new images, you can deploy them manually:

```bash
# Deploy the server
gcloud run deploy gamgui-server \
  --image gcr.io/gamgui-registry/gamgui-server-image \
  --platform managed \
  --region us-central1 \
  --set-env-vars PROJECT_ID=gamgui-tf-1

# Deploy the client
gcloud run deploy gamgui-client \
  --image gcr.io/gamgui-registry/gamgui-client-image \
  --platform managed \
  --region us-central1
```

## Verification

After deployment, verify that the application is working correctly:

1. Access the client URL: `https://gamgui-client-1007518649235.us-central1.run.app`
2. Navigate to the Settings page to ensure it loads correctly
3. Test the API connectivity by checking if sessions load correctly

## Troubleshooting

### Connection Issues

If you encounter issues with the client connecting to the server:

1. Check the browser console for API connection errors
2. Verify that the environment variables are correctly set in the client build
3. Ensure the server is running and accessible
4. Check that CORS is properly configured on the server

### Environment Variable Issues

If you see errors like `ERR_CONNECTION_REFUSED` or the client trying to connect to `localhost` instead of the Cloud Run URL:

1. **Check the build arguments in cloudbuild.yaml**:
   ```yaml
   '--build-arg', 'VITE_API_URL=https://gamgui-server-2fdozy6y5a-uc.a.run.app/api',
   '--build-arg', 'VITE_SOCKET_URL=https://gamgui-server-2fdozy6y5a-uc.a.run.app',
   ```
   Ensure these URLs are correct and point to your deployed server.

2. **Verify the Dockerfile is using the build arguments**:
   ```dockerfile
   ARG VITE_API_URL
   ARG VITE_SOCKET_URL
   ENV VITE_API_URL=${VITE_API_URL}
   ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}
   ```

3. **Rebuild and redeploy the client**:
   Use the automated deployment script in the gamgui-terraform repository or the `./build-and-push-client.sh` script.

4. **Clear browser cache**:
   After deploying a new version, clear your browser cache to ensure you're getting the latest version.

## Rollback

If you need to rollback to a previous version:

```bash
# List available revisions
gcloud run revisions list --service=gamgui-client --platform=managed --region=us-central1

# Traffic migration to a specific revision
gcloud run services update-traffic gamgui-client --to-revisions=REVISION_NAME=100 --platform=managed --region=us-central1
```

Replace `REVISION_NAME` with the name of the revision you want to rollback to.
