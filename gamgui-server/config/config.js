/**
 * Configuration settings for the application
 * Centralizes all configuration in one place for easier management
 */
const path = require('path');

class Config {
  /**
   * Create a new Config instance
   * @param {object} env - Environment variables (defaults to process.env)
   */
  constructor(env = process.env) {
    /**
     * Kubernetes configuration
     * @type {object}
     */
    this.kubernetes = {
      /** Whether Kubernetes is enabled */
      enabled: Boolean(env.GKE_CLUSTER_NAME && env.GKE_CLUSTER_LOCATION),
      /** Kubernetes namespace */
      namespace: env.K8S_NAMESPACE || 'gamgui',
      /** Kubernetes service account */
      serviceAccount: env.K8S_SERVICE_ACCOUNT || 'gam-service-account',
      /** Template strings for Kubernetes resources */
      templates: {
        /** Service name template */
        service: env.SESSION_SERVICE_TEMPLATE || 'gam-service-{{SESSION_ID}}',
        /** Deployment name template */
        deployment: env.SESSION_DEPLOYMENT_TEMPLATE || 'gam-deployment-{{SESSION_ID}}',
        /** WebSocket path template */
        websocketPath: env.WEBSOCKET_PATH_TEMPLATE || '/ws/session/{{SESSION_ID}}/'
      }
    };
    
    /**
     * Docker configuration
     * @type {object}
     */
    this.docker = {
      /** GAM Docker image */
      gamImage: env.GAM_IMAGE || 'gcr.io/gamgui-registry/docker-gam7:latest'
    };
    
    /**
     * File paths
     * @type {object}
     */
    this.paths = {
      /** Path to uploads directory */
      uploads: path.join(__dirname, '../temp-uploads'),
      /** Path to GAM credentials */
      credentials: path.join(__dirname, '../gam-credentials'),
      /** Path to scripts directory */
      scripts: path.join(__dirname, '../scripts')
    };
    
    /**
     * Socket configuration
     * @type {object}
     */
    this.socket = {
      /** Socket ping timeout in milliseconds */
      pingTimeout: 60000,
      /** Socket ping interval in milliseconds */
      pingInterval: 25000,
      /** Socket connection timeout in milliseconds */
      connectTimeout: 30000,
      /** Maximum HTTP buffer size */
      maxHttpBufferSize: 5e6,
      /** Socket transports */
      transports: ['websocket', 'polling'],
      /** Allow transport upgrades */
      allowUpgrades: true,
      /** Per-message deflate options */
      perMessageDeflate: {
        threshold: 1024
      }
    };

    /**
     * WebSocket configuration
     * @type {object}
     */
    this.websocket = {
      /** Whether WebSocket sessions are enabled */
      enabled: env.WEBSOCKET_ENABLED === 'true',
      /** WebSocket proxy service URL */
      proxyServiceUrl: env.WEBSOCKET_PROXY_SERVICE_URL || 'websocket-proxy.gamgui.svc.cluster.local',
      /** WebSocket session connection template */
      sessionConnectionTemplate: env.WEBSOCKET_SESSION_CONNECTION_TEMPLATE || 'ws://websocket-proxy.gamgui.svc.cluster.local/ws/session/{{SESSION_ID}}/',
      /** WebSocket session path template */
      sessionPathTemplate: env.WEBSOCKET_SESSION_PATH_TEMPLATE || '/ws/session/{{SESSION_ID}}/',
      /** Maximum number of concurrent WebSocket sessions */
      maxSessions: parseInt(env.WEBSOCKET_MAX_SESSIONS || '50', 10),
      /** Session timeout in milliseconds */
      sessionTimeout: parseInt(env.WEBSOCKET_SESSION_TIMEOUT || '3600000', 10),
      /** Cleanup interval in milliseconds */
      cleanupInterval: parseInt(env.WEBSOCKET_CLEANUP_INTERVAL || '60000', 10)
    };
  }

  /**
   * Get the full path to a template by replacing the session ID
   * @param {string} templateName - The name of the template
   * @param {string} sessionId - The session ID
   * @returns {string} - The full path
   */
  getTemplatePath(templateName, sessionId) {
    if (!this.kubernetes.templates[templateName]) {
      throw new Error(`Template ${templateName} not found`);
    }
    return this.kubernetes.templates[templateName].replace('{{SESSION_ID}}', sessionId);
  }
}

module.exports = new Config();
