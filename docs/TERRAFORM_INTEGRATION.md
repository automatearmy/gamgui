# Terraform Integration Guide

This document explains how the application has been integrated with the Terraform configuration.

## Overview

The application now supports using Terraform-managed infrastructure, including:

1. Using the full session ID for Kubernetes pod names
2. Supporting custom credential secrets for each session
3. Improved error reporting for missing secrets

## Changes Made

### 1. Kubernetes Client (`kubernetesClient.js`)

- Updated to use the full session ID instead of truncated IDs
  ```javascript
  // Old: const podName = `gam-session-${sessionId.substring(0, 8)}`;
  // New: const podName = `gam-session-${sessionId}`;
  ```

- Added support for specifying a custom credentials secret
  ```javascript
  // Old: secretName: 'gam-credentials'
  // New: secretName: options.credentialsSecret || 'gam-credentials'
  ```

- Removed the `optional: true` flag from secrets to ensure proper error reporting
  ```javascript
  // Old: optional: true
  // New: (flag removed)
  ```

### 2. Session Routes (`sessionRoutes.js`)

- Updated to accept a `credentialsSecret` parameter
  ```javascript
  // Old: const { name, imageId, config } = req.body;
  // New: const { name, imageId, config, credentialsSecret } = req.body;
  ```

- Passes the credential secret to the Kubernetes client
  ```javascript
  // Old: 
  // const pod = await k8s.createSessionPod(sessionId, {
  //   cpu: config?.resources?.cpu || '500m',
  //   memory: config?.resources?.memory || '512Mi'
  // });
  
  // New:
  // const pod = await k8s.createSessionPod(sessionId, {
  //   cpu: config?.resources?.cpu || '500m',
  //   memory: config?.resources?.memory || '512Mi',
  //   credentialsSecret: credentialsSecret || 'gam-credentials'
  // });
  ```

### 3. Secret Manager (`secretManager.js`)

- Added a `listSecrets` function to retrieve all available credential secrets
  ```javascript
  async function listSecrets() {
    const parent = `projects/${projectId}`;
    
    const [secrets] = await secretManager.listSecrets({
      parent
    });
    
    // Filter and format secrets
    return secrets.filter(secret => {
      const name = secret.name.split('/').pop();
      return name.startsWith('gam-') || 
             name === 'client-secrets' || 
             name === 'oauth2' || 
             name === 'oauth2service';
    }).map(/* formatting */);
  }
  ```

### 4. Credential Routes (`credentialRoutes.js`)

- Added a new endpoint to list available credential secrets
  ```javascript
  router.get('/secrets', async (req, res) => {
    try {
      const secrets = await listSecrets();
      return res.status(200).json({ secrets });
    } catch (error) {
      // Error handling
    }
  });
  ```

### 5. API Client (`api.ts`)

- Updated the `createSession` function to accept a `credentialsSecret` parameter
  ```typescript
  // Old: export async function createSession(name: string, imageId: string, config = {})
  // New: export async function createSession(name: string, imageId: string, config = {}, credentialsSecret?: string)
  ```

- Added a new `getCredentialSecrets` function to retrieve available credential secrets
  ```typescript
  export async function getCredentialSecrets() {
    const response = await fetch(`${API_BASE_URL}/credentials/secrets`);
    return response.json();
  }
  ```

## Usage

### Creating a Session with Custom Credentials

When creating a new session, you can now specify which credentials to use:

```javascript
// Client-side
const response = await createSession(
  "New Session", 
  imageId, 
  {}, 
  "my-custom-credentials"
);

// Server-side
const pod = await k8s.createSessionPod(sessionId, {
  cpu: '500m',
  memory: '512Mi',
  credentialsSecret: 'my-custom-credentials'
});
```

### Listing Available Credential Secrets

You can retrieve a list of all available credential secrets:

```javascript
// Client-side
const response = await getCredentialSecrets();
const secrets = response.secrets;

// Server-side
const secrets = await listSecrets();
```

## Environment Variables

The application uses the following environment variables:

- `PROJECT_ID`: The Google Cloud project ID (default: 'gamgui-tf-1')
- `GKE_CLUSTER_NAME`: The name of the GKE cluster
- `GKE_CLUSTER_LOCATION`: The location of the GKE cluster
- `K8S_NAMESPACE`: The Kubernetes namespace to use (default: 'gamgui')
- `K8S_SERVICE_ACCOUNT`: The Kubernetes service account to use (default: 'gam-service-account')
- `GAM_IMAGE`: The GAM Docker image to use (default: 'gcr.io/gamgui-registry/docker-gam7:latest')

## Troubleshooting

### Missing Credentials

If a session fails to start with an error about missing credentials, check:

1. That the specified credential secret exists in Secret Manager
2. That the credential secret contains all required files (client_secrets.json, oauth2.txt, oauth2service.json)
3. That the service account has permission to access the secret

### Pod Creation Failures

If pod creation fails, check:

1. The Kubernetes logs for any errors
2. That the service account has permission to create pods in the namespace
3. That the cluster has sufficient resources to create the pod
