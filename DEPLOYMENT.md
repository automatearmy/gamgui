# Deployment Guide for GamGUI Application

This guide provides instructions for deploying the GamGUI application to Google Cloud Run.

## Prerequisites

- Google Cloud SDK installed and configured
- Docker installed
- Git repository with the latest code

## Environment Configuration

The application uses environment variables to configure the API and Socket URLs. These have been set up in:

- `.env.development` - For local development (points to localhost)
- `.env.production` - For production deployment (points to Cloud Run URLs)

## Deployment Steps

### 1. Build and Deploy the Server

```bash
# Submit the build to Google Cloud Build
gcloud builds submit --config=gamgui-server/cloudbuild.yaml

# This will:
# - Build the Docker image for the server
# - Push it to Google Artifact Registry (gcr.io/gamgui-registry/gamgui-server-image)
# - The image will be available for deployment to Cloud Run
```

### 2. Build and Deploy the Client

```bash
# Submit the build to Google Cloud Build
gcloud builds submit --config=gamgui-client/cloudbuild.yaml

# This will:
# - Build the Docker image for the client with production environment variables
# - Push it to Google Artifact Registry (gcr.io/gamgui-registry/gamgui-client-image)
# - The image will be available for deployment to Cloud Run
```

### 3. Deploy to Cloud Run (if not automatic)

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

If you encounter issues with the client connecting to the server:

1. Check the browser console for API connection errors
2. Verify that the environment variables are correctly set in the client build
3. Ensure the server is running and accessible
4. Check that CORS is properly configured on the server

## Rollback

If you need to rollback to a previous version:

```bash
# List available revisions
gcloud run revisions list --service=gamgui-client --platform=managed --region=us-central1

# Traffic migration to a specific revision
gcloud run services update-traffic gamgui-client --to-revisions=REVISION_NAME=100 --platform=managed --region=us-central1
```

Replace `REVISION_NAME` with the name of the revision you want to rollback to.
