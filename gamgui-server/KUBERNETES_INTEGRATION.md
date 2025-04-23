# Kubernetes Integration for GAM Sessions

This document explains how to use the Kubernetes integration for GAM sessions in the GamGUI server.

## Overview

The GamGUI server now supports running GAM commands in isolated Kubernetes pods, providing better isolation, scalability, and resource management compared to the previous Docker-in-Docker approach.

## Prerequisites

Before using the Kubernetes integration, make sure you have the following:

1. A Kubernetes cluster (e.g., GKE) with the necessary resources deployed
2. The `kubectl` command-line tool configured to access your cluster
3. The following environment variables set:
   - `GKE_CLUSTER_NAME`: The name of the GKE cluster
   - `GKE_CLUSTER_LOCATION`: The location of the GKE cluster
   - `K8S_NAMESPACE`: The Kubernetes namespace for the GAM sessions
   - `K8S_SERVICE_ACCOUNT`: The Kubernetes service account for the GAM sessions
   - `GAM_IMAGE`: The Docker image to use for the GAM sessions

## Implementation

The Kubernetes integration consists of the following components:

1. **Kubernetes Client Utility** (`utils/kubernetesClient.js`):
   - Provides functions for interacting with the Kubernetes API
   - Creates and manages pods for GAM sessions
   - Executes commands in pods
   - Uploads and downloads files to/from pods

2. **Session Routes** (`routes/sessionRoutes.js`):
   - Creates Kubernetes pods for each session
   - Falls back to virtual sessions if Kubernetes is not available
   - Deletes pods when sessions are deleted

3. **Socket Handler** (`routes/socketHandler.js`):
   - Executes commands in Kubernetes pods
   - Handles file operations in pods
   - Provides a seamless experience for users

## Testing

To test the Kubernetes integration, you can use the provided test scripts:

1. **Test Kubernetes Client** (`test-kubernetes.js`):
   - Tests the Kubernetes client utility
   - Creates a pod, executes a command, and deletes the pod

2. **Test Kubernetes Integration** (`test-kubernetes.sh`):
   - Sets up the necessary environment variables
   - Creates a namespace and service account if needed
   - Runs the Kubernetes client test

To run the tests:

```bash
cd gamgui-server
./test-kubernetes.sh
```

## Configuration

The Kubernetes integration is configured using environment variables:

- `GKE_CLUSTER_NAME`: The name of the GKE cluster
- `GKE_CLUSTER_LOCATION`: The location of the GKE cluster
- `K8S_NAMESPACE`: The Kubernetes namespace for the GAM sessions
- `K8S_SERVICE_ACCOUNT`: The Kubernetes service account for the GAM sessions
- `GAM_IMAGE`: The Docker image to use for the GAM sessions

## Fallback Mechanism

If Kubernetes is not available or if there's an error creating a pod, the server falls back to the previous virtual session approach. This ensures that the application continues to work even if Kubernetes is not available.

## Benefits

1. **Isolation**: Each session runs in its own pod, providing better isolation between sessions.
2. **Scalability**: The Kubernetes cluster can automatically scale up or down based on demand.
3. **Resource Management**: Kubernetes provides better resource management for the GAM sessions.
4. **Security**: Network policies and service accounts provide better security for the GAM sessions.
5. **Reliability**: The Kubernetes cluster provides better reliability for the GAM sessions.

## Troubleshooting

If you encounter issues with the Kubernetes integration:

1. Check if the Kubernetes cluster is accessible:
   ```bash
   kubectl cluster-info
   ```

2. Check if the namespace exists:
   ```bash
   kubectl get namespace <namespace>
   ```

3. Check if the service account exists:
   ```bash
   kubectl get serviceaccount -n <namespace> <service-account>
   ```

4. Check the logs of the server:
   ```bash
   docker logs <server-container-id>
   ```

5. Check the logs of the pods:
   ```bash
   kubectl logs -n <namespace> <pod-name>
