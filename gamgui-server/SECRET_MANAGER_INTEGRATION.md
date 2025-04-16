# Secret Manager Integration

This document explains how the gamgui-server integrates with Google Secret Manager to securely store and manage credential files.

## Overview

The gamgui-server now supports storing credential files in Google Secret Manager, in addition to the local filesystem. This provides several benefits:

1. **Security**: Credentials are stored securely in Google Secret Manager, which provides encryption at rest and in transit.
2. **Availability**: Credentials are available to all instances of the gamgui-server, even if the local filesystem is ephemeral (e.g., in Cloud Run).
3. **Access Control**: Google Cloud IAM can be used to control access to the credentials.

## Implementation Details

The Secret Manager integration consists of the following components:

### 1. Secret Manager Utility Functions

The `utils/secretManager.js` file provides functions for interacting with Secret Manager:

- `saveToSecretManager(secretId, content)`: Saves content to Secret Manager
- `getFromSecretManager(secretId)`: Retrieves content from Secret Manager

### 2. Credential Routes

The `routes/credentialRoutes.js` file has been updated to:

- Save uploaded credential files to Secret Manager
- Check if credentials exist in Secret Manager
- Return information about both local and Secret Manager credentials

### 3. Environment Variables

The server uses the following environment variables:

- `PROJECT_ID`: The Google Cloud project ID for Secret Manager (default: "gamgui-tf-1")

## Secret IDs

The following Secret IDs are used:

- `client-secrets`: For the client_secrets.json file
- `oauth2`: For the oauth2.txt file
- `oauth2service`: For the oauth2service.json file

## API Changes

### POST /api/credentials

This endpoint now saves uploaded credential files to both the local filesystem and Secret Manager.

**Response:**
```json
{
  "message": "Credentials uploaded successfully",
  "files": ["client_secrets", "oauth2", "oauth2service"],
  "complete": true,
  "missingFiles": [],
  "secretManagerUploaded": true,
  "secretManagerFiles": ["client-secrets", "oauth2", "oauth2service"]
}
```

### GET /api/credentials/check

This endpoint now checks if credentials exist in both the local filesystem and Secret Manager.

**Response:**
```json
{
  "localFiles": {
    "complete": true,
    "missingFiles": []
  },
  "secretManager": {
    "available": true,
    "missingSecrets": []
  }
}
```

## Testing

To test the Secret Manager integration:

1. Make sure the `PROJECT_ID` environment variable is set correctly
2. Upload credential files using the API
3. Check if the credentials are stored in Secret Manager using the API or the Google Cloud Console

## Troubleshooting

If you encounter issues with the Secret Manager integration:

1. Check that the `PROJECT_ID` environment variable is set correctly
2. Verify that the service account has the necessary permissions to access Secret Manager
3. Check the server logs for error messages
4. Use the Google Cloud Console to verify that the secrets exist and are accessible
