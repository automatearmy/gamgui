# Container Adapters

This directory contains various adapter implementations and fixes for container services used in the GAMGUI application.

## Files

- **KubernetesAdapter-cloud-run.js**: Kubernetes adapter implementation optimized for Cloud Run, with GCP authentication support.
- **KubernetesAdapter-fix.js**: Fixed version of the Kubernetes adapter addressing various issues.
- **KubernetesAdapter-gcp-auth.js**: Kubernetes adapter with enhanced GCP authentication capabilities.
- **fix-kubernetes-adapter-initialization.js**: Fixes for Kubernetes adapter initialization issues.
- **fix-api-response.js**: Fixes for API response format issues.
- **fix-api-response-updated.js**: Updated fixes for API response format issues.

## Usage

These adapters are not meant to be used directly. They are imported by the main container service implementation in the parent directory.

## Development

When making changes to these adapters, ensure that:

1. All changes are backward compatible
2. Error handling is robust
3. Logging is comprehensive
4. Authentication mechanisms are secure

After making changes, use the deployment scripts in `gamgui-app/gamgui-server/scripts/deployment/` to deploy the updated adapters.
