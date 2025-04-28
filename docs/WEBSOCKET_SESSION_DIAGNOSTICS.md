# WebSocket Session Diagnostics

## Problem

The GAMGUI web interface is showing "Error joining session" when attempting to execute commands. Despite implementing the kubectl authentication fix, the issue persists.

## Diagnostic Approach

To identify the root cause of the issue, we've created a comprehensive diagnostic tool that will help us understand exactly where the failure is occurring in the WebSocket session creation process.

### 1. Diagnostic Server

We've created a dedicated diagnostic server that runs in Cloud Run with the same configuration as the main server. This server provides detailed information about:

- Environment variables
- File system (script existence and permissions)
- Binary installations (kubectl and gcloud)
- Authentication status
- Session creation process

### 2. Key Areas to Investigate

The diagnostic tool focuses on these key areas:

#### Script Existence and Permissions
- Are the scripts (`configure-kubectl.sh` and `create-websocket-session.sh`) present in the container?
- Do they have the correct executable permissions?

#### Binary Installation
- Are kubectl and gcloud properly installed?
- Are they in the PATH and accessible?

#### Authentication
- Is gcloud authentication working?
- Can kubectl connect to the GKE cluster?
- Are the necessary environment variables set?

#### Session Creation
- What specific errors occur during session creation?
- Is the kubectl configuration successful?
- Can the service account access the Kubernetes cluster?

## How to Use the Diagnostic Tool

1. Deploy the diagnostic server:
   ```bash
   cd gamgui-app/gamgui-server
   ./deploy-diagnose-server.sh
   ```

2. Access the diagnostic endpoint:
   - The deployment script will output the URL for the diagnostic endpoint
   - Navigate to this URL in your browser
   - Click the "Run Diagnostics" button

3. Analyze the results:
   - The diagnostic tool will return a JSON object with detailed information
   - Look for any `success: false` entries, which indicate failures
   - Check the error messages and outputs for clues

## Common Issues and Solutions

### 1. Missing Scripts
If the scripts are missing, ensure they are properly copied during the Docker build process.

### 2. Authentication Failures
If gcloud authentication is failing, check:
- Service account permissions
- Environment variables (PROJECT_ID, GKE_CLUSTER_NAME, GKE_CLUSTER_LOCATION)

### 3. kubectl Configuration Issues
If kubectl cannot connect to the cluster:
- Verify the gcloud auth plugin is installed
- Check if the service account has the necessary permissions
- Ensure the cluster exists and is accessible

### 4. Session Creation Failures
If session creation fails:
- Check for specific error messages in the logs
- Verify that the Kubernetes namespace exists
- Check if the service account has permissions to create deployments and services

## Next Steps

After identifying the specific issue using the diagnostic tool:

1. Fix the identified problem
2. Deploy the updated server
3. Test the web interface again
4. If issues persist, run the diagnostic tool again to identify any remaining problems
