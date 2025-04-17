# Secret Manager Duplicate Versions Fix

## Problem

When uploading credential files through the GamGUI client interface, multiple versions of the same secret were being created in Secret Manager at the same time. This was particularly noticeable with the `client-secrets` secret, which would have three versions created at the same timestamp.

### Root Cause

The issue was in the client-side code in `gamgui-client/src/pages/settings/index.tsx`. When a user uploaded a credential file, the `handleFileChange` function was sending all files in the state to the server, not just the file that was changed.

```typescript
// Original problematic code
await uploadCredentials({
  clientSecrets: fileType === 'clientSecrets' ? file : authFiles.clientSecrets,
  oauth2: fileType === 'oauth2' ? file : authFiles.oauth2,
  oauth2service: fileType === 'oauth2service' ? file : authFiles.oauth2service,
});
```

This meant that when a user uploaded files in sequence:
1. Upload client-secrets → creates 1 version
2. Upload oauth2 → sends client-secrets again → creates another version
3. Upload oauth2service → sends client-secrets again → creates yet another version

This resulted in multiple identical versions of the same secret being created in Secret Manager.

## Solution

The solution was to modify the `handleFileChange` function to only upload the file that was changed, rather than all files in the state:

```typescript
// Fixed code
// Create a temporary AuthFiles object with only the changed file
const filesToUpload: AuthFiles = {
  clientSecrets: null,
  oauth2: null,
  oauth2service: null
};

// Set only the changed file
filesToUpload[fileType] = file;

// Upload only the changed file using the API function
await uploadCredentials(filesToUpload);
```

This ensures that only the file that was changed is sent to the server, preventing duplicate versions in Secret Manager.

## Benefits

1. **Reduced Storage Usage**: Fewer duplicate versions means less storage used in Secret Manager.
2. **Cleaner Version History**: The version history now accurately reflects when files were actually changed.
3. **Improved Performance**: Less data is transferred between the client and server.

## Implementation Details

The fix was implemented in the `gamgui-client/src/pages/settings/index.tsx` file, specifically in the `handleFileChange` function.

## Testing

To test this fix:
1. Go to the Settings page in the GamGUI client
2. Upload the credential files one by one
3. Check the Secret Manager in the Google Cloud Console
4. Verify that only one version is created for each file upload

## Additional Recommendations

1. **Version Management**: Consider implementing a version cleanup script to periodically remove older versions of secrets.
2. **Content Comparison**: On the server side, consider comparing the content of the new file with the existing secret before creating a new version.
