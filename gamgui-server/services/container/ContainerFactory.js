/**
 * Factory for creating container services
 * Uses the factory pattern to create the appropriate container service based on configuration
 */
const KubernetesAdapter = require('./adapters/KubernetesAdapter-cloud-run');
const DockerAdapter = require('./DockerAdapter');
const KubernetesWebSocketAdapter = require('./KubernetesWebSocketAdapter');
const MockContainerAdapter = require('./MockContainerAdapter');

/**
 * Factory for creating container services
 */
class ContainerFactory {
  /**
   * Create a container service based on configuration
   * @param {import('../../config/config')} config - Configuration
   * @param {import('../../utils/logger')} logger - Logger instance
   * @returns {import('./ContainerService')} - The container service
   */
  static createContainerService(config, logger) {
    // Check if mock mode is enabled (for testing or when Kubernetes is not available)
    const useMockAdapter = process.env.USE_MOCK_CONTAINER_ADAPTER === 'true';
    if (useMockAdapter) {
      logger.info('Using mock container adapter (Kubernetes/Docker functionality will be simulated)');
      return new MockContainerAdapter(config, logger);
    }
    
    // Check if WebSocket sessions are enabled
    const websocketEnabled = config.websocket?.enabled === true;
    
    // Create WebSocket adapter if enabled
    let websocketAdapter = null;
    if (websocketEnabled) {
      websocketAdapter = new KubernetesWebSocketAdapter(config, logger);
      logger.info('Kubernetes WebSocket adapter created');
    }
    
    // Check if running in Cloud Run by looking for the standard K_REVISION env var
    const isCloudRun = Boolean(process.env.K_REVISION); // Use standard K_REVISION
    
    if (isCloudRun) {
      // When running in Cloud Run, always use Kubernetes adapter
      // This prevents "docker: not found" errors since Docker is not available in Cloud Run
      logger.info('Running in Cloud Run environment, forcing Kubernetes container service');
      return new KubernetesAdapter(config, logger, websocketAdapter);
    } else if (config.kubernetes.enabled) {
      // Normal Kubernetes mode for other environments
      logger.info('Creating Kubernetes container service');
      return new KubernetesAdapter(config, logger, websocketAdapter);
    } else {
      // Docker mode for local development
      logger.info('Creating Docker container service');
      return new DockerAdapter(config, logger);
    }
  }
}

module.exports = ContainerFactory;
