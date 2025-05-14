# Kubernetes Connection Fix

This document explains the fix for the "ECONNREFUSED 127.0.0.1:8080" error that occurs when trying to create a session in GAMGUI.

## Problem Description

When a user uploads their credentials and tries to create a session, the application fails with the following error:

```
Error creating secret for user: Error: connect ECONNREFUSED 127.0.0.1:8080
```

This error occurs because the Kubernetes client in the application is trying to connect to a local Kubernetes API server at 127.0.0.1:8080, but there is no Kubernetes API server running at that address in the Cloud Run environment.

## Root Cause

The issue is in the `kubernetesClient.js` file, where the code tries to use `kc.loadFromDefault()` to load the Kubernetes configuration. This method first tries to load the configuration from the default location (`~/.kube/config`), and if that fails, it tries to connect to localhost:8080.

The code has a fallback to use environment variables (GKE_CLUSTER_NAME, GKE_CLUSTER_LOCATION), but it tries to execute the `gcloud container clusters get-credentials` command, which doesn't work in the Cloud Run environment.

## Solution

The solution is to modify the `kubernetesClient.js` file to use the Google Cloud Platform (GCP) API directly to get the cluster information and authenticate with the Kubernetes API server. This approach works in the Cloud Run environment because it doesn't rely on local files or commands.

The key changes are:

1. Remove the code that tries to use `gcloud` to get credentials
2. Add code to use the `google-auth-library` to get a GCP access token
3. Use the GCP API to get the cluster endpoint and CA certificate
4. Configure the Kubernetes client manually with this information
5. Add retry logic with exponential backoff for Kubernetes operations
6. Improve error handling to provide more informative error messages

## Implementation

The implementation is in the `kubernetesClient-fixed.js` file. The main changes are:

1. Added functions to get the cluster endpoint and CA certificate using the GCP API
2. Added a function to initialize the Kubernetes client using GCP authentication
3. Added retry logic with exponential backoff for Kubernetes operations
4. Improved error handling to provide more informative error messages
5. Fixed issues with stdout and stderr handling in exec operations

## Deployment

To deploy the fix, run the `deploy-kubernetes-client-fix.sh` script:

```bash
cd gamgui-app/gamgui-server/scripts/deployment
./deploy-kubernetes-client-fix.sh
```

This script will:

1. Create a backup of the original `kubernetesClient.js` file
2. Replace it with the fixed version
3. Build and deploy the server

## Verification

After deploying the fix, verify that users can create sessions by:

1. Logging in to GAMGUI
2. Uploading credentials
3. Creating a new session

## Rollback

If there are any issues with the fix, you can rollback to the original version by:

1. Restoring the backup file:
   ```bash
   cp gamgui-app/gamgui-server/utils/kubernetesClient.js.bak gamgui-app/gamgui-server/utils/kubernetesClient.js
   ```
2. Rebuilding and redeploying the server:
   ```bash
   cd gamgui-app
   ./build-and-push-server.sh
   ```

## Alternative Solution

If the fix doesn't work, you can use the mock container adapter as a temporary solution. This adapter simulates container operations without actually creating containers, allowing users to create sessions even when the Kubernetes cluster is not accessible.

To enable the mock container adapter, run the `enable-mock-adapter.sh` script:

```bash
cd gamgui-app/gamgui-server/scripts/deployment
./enable-mock-adapter.sh
```

This will update the Cloud Run service to use the mock container adapter by setting the `USE_MOCK_CONTAINER_ADAPTER` environment variable to `true`.

Note that this is a temporary solution and should only be used if the main fix doesn't work, as it doesn't provide the full functionality of the application.
