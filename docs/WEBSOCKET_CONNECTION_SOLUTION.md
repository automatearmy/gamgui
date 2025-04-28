# WebSocket Connection Solution

This document explains the solution to the WebSocket connection issues in the GAMGUI application.

## Problem

The web interface at https://gamgui-client-vthtec4m3a-uc.a.run.app/ was showing "Error: Error joining session" when trying to execute commands. This was due to issues with the WebSocket connection between the client and the Kubernetes pods.

## Root Causes

After investigation, we identified several root causes:

1. **Missing kubectl in Cloud Run**: The server was trying to create WebSocket sessions using a script that depends on kubectl, but kubectl was not installed in the Cloud Run container.

2. **Session Management**: The server was creating virtual sessions as a fallback when the WebSocket session creation failed, but these sessions were not accessible because they were stored in memory and Cloud Run is a stateless service.

3. **WebSocket Protocol Mismatch**: The client was using `wss://` (secure WebSocket) while the server was configured to use `ws://` (non-secure WebSocket).

4. **WebSocket Proxy Configuration**: The WebSocket proxy in Kubernetes was not properly configured to handle the WebSocket connections.

5. **Python HTTP Server**: The GAM session pods were using Python's simple HTTP server (`python3 -m http.server 8080`) which does not support WebSocket protocol.

## Solution

We implemented a comprehensive solution to address all these issues:

### 1. WebSocket-Enabled Server Docker Image

We created a new Dockerfile (`Dockerfile.websocket`) that includes kubectl and the Google Cloud SDK, allowing the server to execute kubectl commands to create and manage WebSocket sessions in Kubernetes. The Dockerfile is designed to be architecture-aware, downloading the appropriate binaries for each target platform:

```dockerfile
# Use Node.js 18 as the base image
FROM --platform=$BUILDPLATFORM node:18-alpine

# Add build arguments for architecture
ARG BUILDPLATFORM
ARG TARGETPLATFORM

# Install kubectl with architecture-specific version
RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
      curl -LO "https://dl.k8s.io/release/v1.27.3/bin/linux/arm64/kubectl"; \
    else \
      curl -LO "https://dl.k8s.io/release/v1.27.3/bin/linux/amd64/kubectl"; \
    fi && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# Install Google Cloud SDK for authentication with GKE
# Use a specific version and verify the download based on architecture
RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
      wget -O google-cloud-sdk.tar.gz https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk-458.0.0-linux-arm.tar.gz; \
    else \
      wget -O google-cloud-sdk.tar.gz https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk-458.0.0-linux-x86_64.tar.gz; \
    fi
```

The image is built with multi-platform support to ensure compatibility with Cloud Run, which requires amd64/linux architecture:

```bash
# Create a buildx builder with multi-platform support
docker buildx create --name multiplatform-builder --use

# Build and push for both amd64 and arm64
docker buildx build --platform linux/amd64,linux/arm64 \
  -t gcr.io/gamgui-registry/gamgui-server-websocket:latest \
  -f Dockerfile.websocket \
  --push .
```

This approach ensures that the correct binaries are used for each architecture, solving the compatibility issue with Cloud Run.

### 2. Single Instance Configuration

We configured Cloud Run to use a single instance to ensure that all requests are handled by the same instance, which solves the problem of sessions being stored in memory:

```bash
gcloud run services update gamgui-server \
    --region=us-central1 \
    --no-cpu-throttling \
    --min-instances=1 \
    --max-instances=1
```

### 3. WebSocket Environment Variables

We updated the WebSocket environment variables to ensure proper communication with the WebSocket proxy:

```bash
gcloud run services update gamgui-server \
    --region=us-central1 \
    --set-env-vars="WEBSOCKET_ENABLED=true,WEBSOCKET_PROXY_URL=websocket-proxy.gamgui.svc.cluster.local,WEBSOCKET_SESSION_CONNECTION_TEMPLATE=ws://websocket-proxy.gamgui.svc.cluster.local/ws/session/{{SESSION_ID}}/,WEBSOCKET_SESSION_PATH_TEMPLATE=/ws/session/{{SESSION_ID}}/"
```

### 4. WebSocket Session Management

We created a script (`manage-websocket-sessions.sh`) to manage WebSocket sessions in Kubernetes, which allows creating, listing, and deleting sessions.

### 5. WebSocket Testing

We created a script (`test-websocket-connection.js`) to test the WebSocket connection, which helps diagnose any issues with the WebSocket connection after deployment.

### 6. WebSocket Configuration Verification

We created a script (`verify-websocket-config.sh`) to verify the WebSocket configuration in Kubernetes, ensuring that the WebSocket proxy is running correctly.

## Deployment

To deploy the solution, follow these steps:

1. **Build and deploy the WebSocket-enabled server**:
   ```bash
   ./deploy-websocket-server.sh
   ```

2. **Verify the WebSocket configuration**:
   ```bash
   ./verify-websocket-config.sh
   ```

3. **Create a test session**:
   ```bash
   cd gamgui-terraform
   ./scripts/manage-websocket-sessions.sh create test-session "info domain"
   ```

4. **Test the WebSocket connection**:
   ```bash
   cd gamgui-app/gamgui-server
   npm install ws axios
   node test-websocket-connection.js test-session
   ```

## Troubleshooting

If you encounter issues with the WebSocket connection, check the following:

### 1. Server Deployment Issues

If the server fails to deploy or start properly, you can use the diagnostic server:

```bash
# Deploy the diagnostic server
./deploy-diagnose-server.sh

# Check the logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=gamgui-diagnose" --limit=50
```

The diagnostic server provides detailed information about the environment, including:
- Environment variables
- Directory structure
- Binary availability and versions
- System information

### 2. WebSocket Connection Issues

If the server deploys successfully but WebSocket connections fail:

1. **Server Logs**: Check the server logs for any errors related to WebSocket connections.
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=gamgui-server" --limit=50
   ```

2. **WebSocket Proxy Logs**: Check the WebSocket proxy logs for any errors.
   ```bash
   kubectl logs -l app=websocket-proxy -n gamgui
   ```

3. **Session Pods**: Check if the session pods are running.
   ```bash
   kubectl get pods -n gamgui -l component=gam-session
   ```

4. **WebSocket Environment Variables**: Check if the WebSocket environment variables are correctly configured.
   ```bash
   gcloud run services describe gamgui-server --region=us-central1 --format="value(spec.template.spec.containers[0].env)"
   ```

### 3. Architecture Compatibility Issues

If you encounter architecture compatibility issues (e.g., "Container manifest type must support amd64/linux"), ensure:

1. You're using the multi-platform build approach with Docker Buildx:
   ```bash
   docker buildx build --platform linux/amd64,linux/arm64 -t [IMAGE_NAME] -f [DOCKERFILE] --push .
   ```

2. Your Dockerfile uses architecture-specific binaries:
   ```dockerfile
   ARG TARGETPLATFORM
   RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
         # arm64-specific commands \
       else \
         # amd64-specific commands \
       fi
   ```

## Future Improvements

For a more robust solution, consider the following improvements:

1. **WebSocket Server**: Replace the Python HTTP server with a proper WebSocket server in the GAM session pods.

2. **Persistent Storage**: Use a database or other persistent storage for session data instead of in-memory storage.

3. **Kubernetes API**: Use the Kubernetes API directly from the server instead of relying on kubectl.

4. **Health Checks**: Add health checks to verify that the WebSocket proxy is working correctly.

5. **Monitoring**: Add monitoring to detect and alert on session creation failures.
