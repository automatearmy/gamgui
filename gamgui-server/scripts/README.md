# GAMGUI Server Scripts

This directory contains various scripts used for development, testing, deployment, and diagnostics of the GAMGUI server.

## Directory Structure

- **diagnostics/**: Scripts for diagnosing issues and testing functionality
  - `check-api-response.js`: Verify API response format
  - `check-api-response-format.js`: Detailed API response format checker
  - `check-application-status.js`: Check overall application status
  - `diagnose-gcp-auth.js`: Diagnose GCP authentication issues
  - `diagnose-gcp-auth-issue.js`: Specific GCP auth issue diagnostics
  - `diagnose-kubernetes-auth.js`: Diagnose Kubernetes authentication issues
  - `test-delete-pod.js`: Test pod deletion functionality
  - `test-gcp-auth-adapter.js`: Test GCP auth adapter
  - `test-gcp-auth-adapter-updated.js`: Updated version of GCP auth adapter test
  - `test-session-creation.js`: Test session creation functionality

- **deployment/**: Scripts for deploying and updating the application
  - `deploy-api-response-fix.sh`: Deploy API response format fix
  - `deploy-cloud-run-adapter.sh`: Deploy Cloud Run adapter
  - `deploy-fixed-kubernetes-adapter.sh`: Deploy fixed Kubernetes adapter
  - `deploy-gcp-auth-adapter.sh`: Deploy GCP auth adapter
  - `deploy-kubernetes-adapter-fix.sh`: Deploy Kubernetes adapter fix
  - `fix-cloud-run-permissions.sh`: Fix Cloud Run permissions
  - `fix-container-image.sh`: Fix container image issues
  - `update-cloud-run-env.sh`: Update Cloud Run environment variables

## Usage

Most scripts can be run directly from the command line. For example:

```bash
# Run a diagnostic script
node scripts/diagnostics/check-application-status.js

# Run a deployment script
./scripts/deployment/deploy-cloud-run-adapter.sh
```

Some scripts may require environment variables to be set. Check the script content for details.
