# Credentials Flow

This document explains the credentials flow in the gamgui application.

## Overview

The gamgui application requires three credential files to be uploaded before a session can be created:

1. `client_secrets.json` - Google API client secrets
2. `oauth2.txt` - OAuth2 credentials
3. `oauth2service.json` - OAuth2 service account credentials

These credentials are stored in Google Cloud Secret Manager and are used by the GAM container to authenticate with Google Workspace.

## User Flow

1. User navigates to the Settings page
2. User uploads the three credential files
3. User navigates to the Sessions page
4. User creates a new session
5. The session is created and the user can execute GAM commands

## Implementation Details

### Credentials Check

The application checks if the required credentials are available before creating a session. This check is performed in two places:

1. **Sessions Page**: The page displays a warning if credentials are missing, with a button to navigate to the Settings page.
2. **New Session Page**: The page checks if credentials are available before creating a session. If credentials are missing, it shows an error message with a button to navigate to the Settings page.

### Code Flow

1. When the user navigates to the Sessions page, the application calls the `checkCredentials` API to check if the required credentials are available.
2. If credentials are missing, the page displays a warning with a button to navigate to the Settings page.
3. When the user clicks the "New Session" button, the application navigates to the New Session page.
4. The New Session page calls the `checkCredentials` API to check if the required credentials are available.
5. If credentials are missing, the page shows an error message with a button to navigate to the Settings page.
6. If credentials are available, the page creates a new session and navigates to the Session Detail page.

## API Endpoints

### `GET /api/credentials/check`

Checks if the required credentials are available.

**Response:**

```json
{
  "localFiles": {
    "complete": true,
    "missingFiles": []
  }
}
```

If credentials are missing, the `complete` field will be `false` and the `missingFiles` array will contain the names of the missing files.

### `POST /api/credentials`

Uploads credential files.

**Request:**

```
FormData with files:
- client_secrets: File
- oauth2: File
- oauth2service: File
```

**Response:**

```json
{
  "message": "Credentials uploaded successfully",
  "files": ["client_secrets.json", "oauth2.txt", "oauth2service.json"]
}
```

### `DELETE /api/credentials`

Deletes all credential files.

**Response:**

```json
{
  "message": "Credentials deleted successfully"
}
```

## Error Handling

If the user tries to create a session without uploading the required credentials, they will see an error message with a button to navigate to the Settings page.

## Troubleshooting

If you encounter the "Error joining session" message, check the following:

1. Make sure all three credential files are uploaded in the Settings page.
2. Check the server logs for any errors related to credentials.
3. Try deleting and re-uploading the credentials.
