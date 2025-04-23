# GKE and Kubernetes Integration for GAM Sessions

This document explains the integration of Google Kubernetes Engine (GKE) and Kubernetes resources for running GAM sessions in the GamGUI application.

## Overview

The GamGUI application now supports running GAM commands in isolated Kubernetes pods, providing better isolation, scalability, and resource management compared to the previous Docker-in-Docker approach with Cloud Run.

## Architecture

The architecture consists of the following components:

1. **GKE Cluster**: A Google Kubernetes Engine cluster that hosts the GAM sessions.
2. **Kubernetes Resources**: Namespace, service accounts, roles, and other resources for the GAM sessions.
3. **Pod Templates**: Templates for creating pods for each GAM session.
4. **Services and Ingress**: Resources for exposing the GAM sessions to the client.
5. **Cloud Run Services**: The existing client and server services that now integrate with GKE.

## Implementation

### Kubernetes Client Utility

The `kubernetesClient.js` utility provides functions for interacting with the Kubernetes API to create and manage pods for GAM sessions:

```javascript
// Create a pod for a GAM session
async function createSessionPod(sessionId, options = {}) { ... }

// Delete a pod for a GAM session
async function deleteSessionPod(sessionId) { ... }

// Execute a command in a pod
async function executeCommandInPod(sessionId, command) { ... }

// Upload a file to a pod
async function uploadFileToPod(sessionId, localFilePath, podFilePath) { ... }

// Download a file from a pod
async function downloadFileFromPod(sessionId, podFilePath, localFilePath) { ... }
```

### Session Management

The `sessionRoutes.js` file has been updated to create Kubernetes pods for each session when Kubernetes is enabled:

```javascript
// Check if Kubernetes is enabled
const KUBERNETES_ENABLED = process.env.GKE_CLUSTER_NAME && process.env.GKE_CLUSTER_LOCATION;

// Create a session
router.post('/', async (req, res) => {
  // ...
  
  // Check if Kubernetes is enabled
  if (KUBERNETES_ENABLED) {
    try {
      // Create a pod for the session
      const pod = await k8s.createSessionPod(sessionId, {
        cpu: config?.resources?.cpu || '500m',
        memory: config?.resources?.memory || '512Mi'
      });
      
      // Store Kubernetes pod information
      containerInfo = {
        id: containerId,
        sessionId,
        podName: pod.metadata.name,
        kubernetes: true,
        stream: null
      };
    } catch (k8sError) {
      // Fall back to virtual session if Kubernetes pod creation fails
      containerInfo = {
        id: containerId,
        sessionId,
        stream: null,
        virtual: true
      };
    }
  } else {
    // Create a virtual session
    containerInfo = {
      id: containerId,
      sessionId,
      stream: null,
      virtual: true
    };
  }
  
  // ...
});

// Delete a session
router.delete('/:id', async (req, res) => {
  // ...
  
  // Check if this is a Kubernetes pod
  if (containerInfo.kubernetes) {
    try {
      // Delete the pod
      await k8s.deleteSessionPod(sessionId);
    } catch (k8sError) {
      // Continue with session removal even if pod deletion fails
    }
  }
  
  // ...
});
```

### Terminal Integration

The `socketHandler.js` file has been updated to execute commands in Kubernetes pods when available:

```javascript
// Check if this is a Kubernetes pod
const isKubernetesPod = KUBERNETES_ENABLED && containerInfo.kubernetes;

// Process commands
if (input.startsWith('gam ')) {
  if (isKubernetesPod) {
    // Execute GAM command in Kubernetes pod
    executeGamCommandInPod(sessionId, input, outputStream);
  } else {
    // Execute GAM command in Docker container
    executeGamCommandInDocker(sessionId, input, outputStream);
  }
}
```

## Configuration

The integration is configured using environment variables:

- `GKE_CLUSTER_NAME`: The name of the GKE cluster
- `GKE_CLUSTER_LOCATION`: The location of the GKE cluster
- `K8S_NAMESPACE`: The Kubernetes namespace for the GAM sessions
- `K8S_SERVICE_ACCOUNT`: The Kubernetes service account for the GAM sessions
- `K8S_POD_TEMPLATE`: The name of the pod template for the GAM sessions
- `K8S_SERVICE_NAME`: The name of the service for the GAM sessions
- `K8S_INGRESS_HOST`: The host of the ingress for the GAM sessions
- `K8S_INGRESS_PATH`: The path of the ingress for the GAM sessions

## Benefits

1. **Isolation**: Each session runs in its own pod, providing better isolation between sessions.
2. **Scalability**: The GKE cluster can automatically scale up or down based on demand.
3. **Resource Management**: Kubernetes provides better resource management for the GAM sessions.
4. **Security**: Network policies and service accounts provide better security for the GAM sessions.
5. **Reliability**: The GKE cluster provides better reliability for the GAM sessions.

## Fallback Mechanism

If Kubernetes is not enabled or if there's an error creating a pod, the application falls back to the previous Docker-in-Docker approach. This ensures that the application continues to work even if Kubernetes is not available.

## Testing

To test the integration:

1. Deploy the Terraform configuration to create the GKE cluster and Kubernetes resources.
2. Deploy the updated application to Cloud Run.
3. Create a new session and verify that a Kubernetes pod is created.
4. Execute GAM commands and verify that they are executed in the pod.
5. Delete the session and verify that the pod is deleted.

## Troubleshooting

If you encounter issues with the Kubernetes integration:

1. Check the logs for errors:
   ```
   kubectl logs -n gamgui <pod-name>
   ```

2. Verify that the pod is running:
   ```
   kubectl get pods -n gamgui
   ```

3. Check the pod status:
   ```
   kubectl describe pod -n gamgui <pod-name>
   ```

4. Verify that the service account has the necessary permissions:
   ```
   kubectl get rolebindings -n gamgui
   ```

5. Check the ingress configuration:
   ```
   kubectl get ingress -n gamgui
   ```

## Next Steps

1. **Monitoring**: Add monitoring for the Kubernetes pods to track resource usage and performance.
2. **Auto-scaling**: Configure auto-scaling for the GKE cluster based on pod metrics.
3. **High Availability**: Configure the GKE cluster for high availability across multiple zones.
4. **Backup and Restore**: Implement backup and restore for the Kubernetes resources.
5. **CI/CD**: Update the CI/CD pipeline to deploy the application to both Cloud Run and GKE.
