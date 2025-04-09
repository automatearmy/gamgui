# Docker Volume Integration for GAMGUI

This document explains how Docker volumes are implemented in GAMGUI to allow containers to access files uploaded by users.

## Overview

GAMGUI uses Docker volumes to provide containers (terminal sessions) with access to files uploaded by users. When a user uploads files through the web interface, the files are stored in a `temp-uploads` directory on the host server. This directory is then mounted as a volume in the Docker container, making the files directly accessible from within the container.

## Implementation Details

### 1. Volume Configuration

When a new Docker container is created for a session, a volume is configured to map the host's `temp-uploads` directory to `/gam/uploads` in the container:

```javascript
// In sessionRoutes.js
const container = await docker.createContainer({
  // ... other configuration ...
  HostConfig: {
    Binds: [
      `${path.resolve(__dirname, '../temp-uploads')}:/gam/uploads:rw`
    ]
  }
});
```

This creates a bidirectional mapping where:
- Files in the host's `temp-uploads` directory are accessible at `/gam/uploads` in the container
- Any changes made to files in either location are reflected in the other

### 2. File Upload Process

When files are uploaded:

1. Files are stored in the `temp-uploads` directory using multer
2. Appropriate permissions (0o644) are set on the files to ensure they're readable by the container
3. The container's upload directory permissions are set to 0o755
4. File paths in the API response reference the mounted path (`/gam/uploads/filename`)

```javascript
// In fileRoutes.js
// Set appropriate permissions on the uploaded file
await chmodAsync(filePath, 0o644);

// Add to uploaded files list with the path relative to the mounted volume
uploadedFiles.push({
  name: fileName,
  size: file.size,
  path: `/gam/uploads/${fileName}`
});
```

### 3. File Cleanup

When a session is terminated, the uploaded files are automatically deleted to prevent the `temp-uploads` directory from growing indefinitely:

```javascript
// In sessionRoutes.js
// Clean up any uploaded files for this session
try {
  const tempUploadsDir = path.resolve(__dirname, '../temp-uploads');
  if (fs.existsSync(tempUploadsDir)) {
    // Read all files in the temp-uploads directory
    const files = fs.readdirSync(tempUploadsDir);
    
    // Delete each file
    for (const file of files) {
      const filePath = path.join(tempUploadsDir, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    }
  }
} catch (cleanupError) {
  console.error(`Error cleaning up files: ${cleanupError.message}`);
}
```

## Security Considerations

1. **File Permissions**: 
   - Files: 0o644 (read/write for owner, read for others)
   - Directory: 0o755 (read/write/execute for owner, read/execute for others)

2. **Volume Isolation**: 
   - The volume is mounted with read-write permissions (`rw`) to allow the container to modify files if needed
   - In a production environment with multiple users, consider implementing per-session directories to isolate files between sessions

3. **Cleanup**: 
   - Files are automatically deleted when sessions are terminated
   - Consider implementing a scheduled cleanup job for any orphaned files

## Testing

Two test scripts are provided to verify the Docker volume integration:

1. `test-volume-integration.js`: Tests file upload and cleanup functionality
2. `test-container-access.js`: Tests that files are accessible from within the container

To run the tests:

```bash
node test-volume-integration.js
node test-container-access.js
```

## Future Improvements

1. **Per-Session Directories**: Create separate directories for each session to isolate files between users
2. **File Metadata Storage**: Store file metadata in the session object or a database for better tracking
3. **Scheduled Cleanup**: Implement a scheduled job to clean up any orphaned files
4. **User Permissions**: Add user-level permissions for file access
