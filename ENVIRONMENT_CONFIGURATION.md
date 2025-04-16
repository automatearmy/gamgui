# Environment Configuration for GamGUI Application

This document explains how environment variables are configured and used in the GamGUI application.

## Overview

The GamGUI application uses environment variables to configure the connection between the client and server components. This is particularly important for the API URL and WebSocket URL.

## Local Development

For local development, the environment variables are configured in the following files:

- `.env.development` - Used during development (`npm run dev`)
- `.env.production` - Used during production builds (`npm run build`)
- `.env.local` - (Optional) Used to override the above files for local settings

These files contain:

```
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

## Production Deployment

For production deployment, the environment variables are handled differently:

1. **Build-time Variables**: In React/Vite applications, environment variables are substituted during the build process, not at runtime.

2. **Docker Build Arguments**: The Dockerfile accepts build arguments that are passed to the build process:

   ```dockerfile
   ARG VITE_API_URL
   ARG VITE_SOCKET_URL
   
   ENV VITE_API_URL=${VITE_API_URL}
   ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}
   ```

3. **Cloud Build Configuration**: The `cloudbuild.yaml` file passes these arguments to the Docker build:

   ```yaml
   args: [
     'build',
     '--build-arg', 'VITE_API_URL=https://gamgui-server-2fdozy6y5a-uc.a.run.app/api',
     '--build-arg', 'VITE_SOCKET_URL=https://gamgui-server-2fdozy6y5a-uc.a.run.app',
     '-t', 'gcr.io/gamgui-registry/gamgui-client-image',
     '.'
   ]
   ```

## How It Works

1. **During Development**:
   - Vite reads the `.env.development` file
   - The client connects to `http://localhost:3001/api` for API calls
   - The client connects to `http://localhost:3001` for WebSocket connections

2. **During Production Build**:
   - The build arguments are passed to the Docker build process
   - These values are substituted into the client code during the build
   - The resulting static files contain the correct URLs for the deployed environment

3. **In Production**:
   - The client connects to the URLs that were baked into the code during the build
   - No runtime configuration is needed

## Updating Environment Variables

If you need to update the environment variables (e.g., if the server URL changes):

1. **For Local Development**:
   - Edit the `.env.development` or `.env.production` files

2. **For Production Deployment**:
   - Update the `cloudbuild.yaml` file with the new URLs
   - Rebuild and redeploy the client
   - Or use the `deploy-client.sh` script which will prompt for the server URL

## Troubleshooting

If you encounter issues with the client connecting to the wrong URL:

1. **Check the Environment Files**:
   - Ensure the `.env.development` and `.env.production` files have the correct URLs

2. **Check the Build Arguments**:
   - Ensure the `cloudbuild.yaml` file has the correct URLs in the build arguments

3. **Rebuild and Redeploy**:
   - After updating the URLs, rebuild and redeploy the client

4. **Clear Browser Cache**:
   - After deploying a new version, clear your browser cache to ensure you're getting the latest version

## Best Practices

1. **Never Commit Sensitive Information**:
   - The `.gitignore` file is configured to exclude `.env*` files
   - Use environment variables for sensitive information

2. **Use the Deployment Script**:
   - The `deploy-client.sh` script simplifies the deployment process
   - It ensures the correct URLs are used in the build

3. **Document URL Changes**:
   - When the server URL changes, update the documentation
   - Inform team members about the change
