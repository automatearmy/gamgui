# Cloud Run Adapter Fix

## Problem

When running the server in Cloud Run, GAM commands were failing with the error:

```
/bin/sh: docker: not found
```

This occurred because:

1. The server was using the `DockerAdapter` to execute GAM commands
2. The `DockerAdapter` tries to use the `docker` command to run containers
3. Docker is not installed in the Cloud Run environment

## Solution

We modified the `ContainerFactory` to always use the `KubernetesAdapter` when running in Cloud Run, even if `kubernetes.enabled` is set to `false`. This ensures that GAM commands are executed directly in Kubernetes pods instead of trying to use Docker.

### Changes Made

1. Modified `gamgui-server/services/container/ContainerFactory.js` to detect if the code is running in Cloud Run by checking for the presence of Cloud Run-specific environment variables (`K8S_REVISION` or `CLOUD_RUN_REVISION`).
2. If running in Cloud Run, the factory always returns a `KubernetesAdapter` instance, regardless of the `kubernetes.enabled` setting.
3. Added a test script (`test-cloud-run-adapter.js`) to verify the solution.

### Code Changes

```javascript
static createContainerService(config, logger) {
  // Check if running in Cloud Run by looking for specific environment variables
  const isCloudRun = Boolean(process.env.K8S_REVISION || process.env.CLOUD_RUN_REVISION);
  
  if (isCloudRun) {
    // When running in Cloud Run, always use Kubernetes adapter
    // This prevents "docker: not found" errors since Docker is not available in Cloud Run
    logger.info('Running in Cloud Run environment, forcing Kubernetes container service');
    return new KubernetesAdapter(config, logger);
  } else if (config.kubernetes.enabled) {
    // Normal Kubernetes mode for other environments
    logger.info('Creating Kubernetes container service');
    return new KubernetesAdapter(config, logger);
  } else {
    // Docker mode for local development
    logger.info('Creating Docker container service');
    return new DockerAdapter(config, logger);
  }
}
```

## Testing

You can test this fix by running the `test-cloud-run-adapter.js` script:

```bash
node test-cloud-run-adapter.js
```

This script simulates a Cloud Run environment and verifies that the `ContainerFactory` correctly returns a `KubernetesAdapter` instance, even if `kubernetes.enabled` is set to `false`.

## Benefits

- No changes to the server's configuration or environment variables are required
- The solution is non-invasive and requires minimal code changes
- Local development environments can still use the `DockerAdapter` if desired
- The server can now execute GAM commands in Cloud Run without errors

## Future Considerations

If Docker support is completely removed from the server in the future, the `ContainerFactory` can be simplified to always return a `KubernetesAdapter`. However, keeping the current implementation allows for flexibility in different environments.
