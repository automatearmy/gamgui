/**
 * Kubernetes WebSocket Adapter
 * 
 * This adapter integrates the server with the Kubernetes WebSocket infrastructure.
 * It provides methods for creating, connecting to, and managing WebSocket sessions in Kubernetes.
 */

const { exec } = require('child_process');
const WebSocket = require('ws');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { ContainerError } = require('../../utils/errorHandler');

/**
 * Adapter for Kubernetes WebSocket infrastructure
 */
class KubernetesWebSocketAdapter {
  /**
   * Create a new KubernetesWebSocketAdapter
   * @param {import('../../config/config')} config - Configuration
   * @param {import('../../utils/logger')} logger - Logger instance
   */
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.enabled = config.websocket?.enabled || false;
    this.proxyServiceUrl = config.websocket?.proxyServiceUrl || 'websocket-proxy.gamgui.svc.cluster.local';
    this.sessionConnectionTemplate = config.websocket?.sessionConnectionTemplate || 'ws://websocket-proxy.gamgui.svc.cluster.local/ws/session/{{SESSION_ID}}/';
    this.sessionPathTemplate = config.websocket?.sessionPathTemplate || '/ws/session/{{SESSION_ID}}/';
    this.maxSessions = config.websocket?.maxSessions || 50;
    this.namespace = config.kubernetes.namespace || 'gamgui';
    
    // Map to store active sessions
    this.sessions = new Map();
    
    this.logger.info(`Kubernetes WebSocket Adapter initialized (enabled: ${this.enabled})`);
    if (this.enabled) {
      this.logger.info(`WebSocket proxy URL: ${this.proxyServiceUrl}`);
      this.logger.info(`WebSocket session connection template: ${this.sessionConnectionTemplate}`);
      this.logger.info(`WebSocket session path template: ${this.sessionPathTemplate}`);
      this.logger.info(`WebSocket max sessions: ${this.maxSessions}`);
    }
  }

  /**
   * Check if WebSocket sessions are enabled
   * @returns {boolean} - Whether WebSocket sessions are enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Check if a session exists in Kubernetes and register it
   * @param {string} sessionId - The session ID
   * @param {Object} options - Session options
   * @param {string} options.command - The GAM command to execute
   * @returns {Promise<Object|null>} - Session information or null if not found
   */
  async checkExistingSession(sessionId, options = {}) {
    try {
      // Check if the deployment exists in Kubernetes
      const checkCmd = `kubectl get deployment gam-session-${sessionId} -n ${this.namespace}`;
      this.logger.info(`Checking if session exists in Kubernetes: ${checkCmd}`);
      
      try {
        await execAsync(checkCmd);
        
        // Deployment exists, register it
        this.logger.info(`Found existing Kubernetes session: ${sessionId}`);
        
        // Generate WebSocket URL
        const command = options.command || 'info domain';
        const websocketUrl = this.sessionConnectionTemplate.replace('{{SESSION_ID}}', sessionId);
        const websocketPath = this.sessionPathTemplate.replace('{{SESSION_ID}}', sessionId);

        // Store the session information
        const sessionInfo = {
          id: sessionId,
          command,
          createdAt: new Date(),
          lastActivity: new Date(),
          websocketUrl,
          websocketPath,
          status: 'created',
          kubernetes: true
        };
        
        this.sessions.set(sessionId, sessionInfo);
        return sessionInfo;
      } catch (error) {
        // Deployment doesn't exist
        this.logger.info(`No existing Kubernetes session found for ${sessionId}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error checking existing session: ${error.message}`);
      return null;
    }
  }

  /**
   * Create a new WebSocket session
   * @param {string} sessionId - The session ID
   * @param {Object} options - Session options
   * @param {string} options.command - The GAM command to execute
   * @param {string} options.credentialsSecret - The name of the credentials secret
   * @returns {Promise<Object>} - Session information
   * @throws {ContainerError} - If the session creation fails
   */
  async createSession(sessionId, options = {}) {
    if (!this.enabled) {
      this.logger.warn('WebSocket sessions are disabled');
      throw new ContainerError('WebSocket sessions are disabled');
    }

    try {
      // Check if the session already exists in memory
      if (this.sessions.has(sessionId)) {
        this.logger.info(`Session ${sessionId} already exists in memory`);
        return this.sessions.get(sessionId);
      }

      // Check if the session exists in Kubernetes
      const existingSession = await this.checkExistingSession(sessionId, options);
      if (existingSession) {
        this.logger.info(`Session ${sessionId} already exists in Kubernetes`);
        return existingSession;
      }

      // Check if we've reached the maximum number of sessions
      if (this.sessions.size >= this.maxSessions) {
        this.logger.warn(`Maximum number of sessions (${this.maxSessions}) reached`);
        throw new ContainerError(`Maximum number of sessions (${this.maxSessions}) reached`);
      }

      // Create the session using the script
      const command = options.command || 'info domain';
      const createSessionCmd = `${this.config.paths.scripts}/create-websocket-session-wrapper.sh --id ${sessionId} --command "${command}"`;
      
      this.logger.info(`Creating session: ${createSessionCmd}`);
      const { stdout, stderr } = await execAsync(createSessionCmd);
      
      if (stderr && !stderr.includes('created')) {
        throw new ContainerError(`Failed to create session: ${stderr}`);
      }

      // Generate WebSocket URL
      const websocketUrl = this.sessionConnectionTemplate.replace('{{SESSION_ID}}', sessionId);
      const websocketPath = this.sessionPathTemplate.replace('{{SESSION_ID}}', sessionId);

      // Store the session information
      const sessionInfo = {
        id: sessionId,
        command,
        createdAt: new Date(),
        lastActivity: new Date(),
        websocketUrl,
        websocketPath,
        status: 'created',
        kubernetes: true
      };
      
      this.sessions.set(sessionId, sessionInfo);

      this.logger.info(`Session created: ${sessionId}`);
      return sessionInfo;
    } catch (error) {
      this.logger.error(`Error creating session: ${error.message}`);
      throw new ContainerError(`Failed to create session: ${error.message}`, { cause: error });
    }
  }

  /**
   * Connect to a WebSocket session
   * @param {string} sessionId - The session ID
   * @returns {Promise<WebSocket>} - WebSocket connection
   * @throws {ContainerError} - If the connection fails
   */
  async connectToSession(sessionId) {
    if (!this.enabled) {
      this.logger.warn('WebSocket sessions are disabled');
      throw new ContainerError('WebSocket sessions are disabled');
    }

    try {
      // Check if the session exists in memory
      if (!this.sessions.has(sessionId)) {
        // Check if the session exists in Kubernetes
        this.logger.info(`Session ${sessionId} not found in memory, checking Kubernetes...`);
        const existingSession = await this.checkExistingSession(sessionId);
        if (!existingSession) {
          this.logger.warn(`Session ${sessionId} not found in Kubernetes either`);
          throw new ContainerError(`Session ${sessionId} not found`);
        }
        this.logger.info(`Found session ${sessionId} in Kubernetes and registered it`);
      }

      const sessionInfo = this.sessions.get(sessionId);
      
      // Update last activity
      sessionInfo.lastActivity = new Date();
      sessionInfo.status = 'connecting';
      this.sessions.set(sessionId, sessionInfo);

      // Create a WebSocket connection
      const websocketUrl = sessionInfo.websocketUrl;
      this.logger.info(`Connecting to session: ${websocketUrl}`);
      
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(websocketUrl);
        
        ws.on('open', () => {
          this.logger.info(`Connected to session: ${sessionId}`);
          sessionInfo.status = 'connected';
          sessionInfo.ws = ws;
          this.sessions.set(sessionId, sessionInfo);
          
          resolve(ws);
        });
        
        ws.on('error', (error) => {
          this.logger.error(`WebSocket error for session ${sessionId}: ${error.message}`);
          sessionInfo.status = 'error';
          sessionInfo.error = error.message;
          this.sessions.set(sessionId, sessionInfo);
          
          reject(new ContainerError(`Failed to connect to session: ${error.message}`, { cause: error }));
        });
        
        // Set a timeout for the connection
        const timeout = setTimeout(() => {
          ws.terminate();
          this.logger.error(`Connection timeout for session ${sessionId}`);
          sessionInfo.status = 'error';
          sessionInfo.error = 'Connection timeout';
          this.sessions.set(sessionId, sessionInfo);
          
          reject(new ContainerError('Connection timeout'));
        }, 10000);
        
        ws.on('open', () => {
          clearTimeout(timeout);
        });
      });
    } catch (error) {
      this.logger.error(`Error connecting to session: ${error.message}`);
      throw new ContainerError(`Failed to connect to session: ${error.message}`, { cause: error });
    }
  }

  /**
   * Send a command to a WebSocket session
   * @param {string} sessionId - The session ID
   * @param {string} command - The command to send
   * @returns {Promise<void>}
   * @throws {ContainerError} - If the command fails
   */
  async sendCommand(sessionId, command) {
    if (!this.enabled) {
      this.logger.warn('WebSocket sessions are disabled');
      throw new ContainerError('WebSocket sessions are disabled');
    }

    try {
      // Check if the session exists in memory
      if (!this.sessions.has(sessionId)) {
        // Check if the session exists in Kubernetes
        this.logger.info(`Session ${sessionId} not found in memory, checking Kubernetes...`);
        const existingSession = await this.checkExistingSession(sessionId);
        if (!existingSession) {
          this.logger.warn(`Session ${sessionId} not found in Kubernetes either`);
          throw new ContainerError(`Session ${sessionId} not found`);
        }
        this.logger.info(`Found session ${sessionId} in Kubernetes and registered it`);
        
        // Connect to the session
        await this.connectToSession(sessionId);
      }

      const sessionInfo = this.sessions.get(sessionId);
      
      // Check if the session is connected
      if (sessionInfo.status !== 'connected' || !sessionInfo.ws) {
        this.logger.warn(`Session ${sessionId} is not connected`);
        throw new ContainerError(`Session ${sessionId} is not connected`);
      }

      // Update last activity
      sessionInfo.lastActivity = new Date();
      this.sessions.set(sessionId, sessionInfo);

      // Send the command
      this.logger.info(`Sending command to session ${sessionId}: ${command}`);
      sessionInfo.ws.send(command);
    } catch (error) {
      this.logger.error(`Error sending command to session: ${error.message}`);
      throw new ContainerError(`Failed to send command to session: ${error.message}`, { cause: error });
    }
  }

  /**
   * Close a WebSocket session
   * @param {string} sessionId - The session ID
   * @returns {Promise<void>}
   * @throws {ContainerError} - If the session closure fails
   */
  async closeSession(sessionId) {
    if (!this.enabled) {
      this.logger.warn('WebSocket sessions are disabled');
      throw new ContainerError('WebSocket sessions are disabled');
    }

    try {
      // Check if the session exists in memory
      if (!this.sessions.has(sessionId)) {
        // Check if the session exists in Kubernetes
        this.logger.info(`Session ${sessionId} not found in memory, checking Kubernetes...`);
        const existingSession = await this.checkExistingSession(sessionId);
        if (!existingSession) {
          this.logger.warn(`Session ${sessionId} not found in Kubernetes either`);
          throw new ContainerError(`Session ${sessionId} not found`);
        }
        this.logger.info(`Found session ${sessionId} in Kubernetes and registered it`);
      }

      const sessionInfo = this.sessions.get(sessionId);
      
      // Close the WebSocket connection if it exists
      if (sessionInfo.ws) {
        sessionInfo.ws.close();
      }

      // Delete the session using kubectl
      const deleteSessionCmd = `kubectl delete deployment gam-session-${sessionId} -n ${this.namespace} && kubectl delete service gam-session-${sessionId} -n ${this.namespace}`;
      this.logger.info(`Deleting session: ${deleteSessionCmd}`);
      const { stdout, stderr } = await execAsync(deleteSessionCmd);
      
      if (stderr && !stderr.includes('deleted')) {
        throw new ContainerError(`Failed to delete session: ${stderr}`);
      }

      // Remove the session from the map
      this.sessions.delete(sessionId);

      this.logger.info(`Session deleted: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error closing session: ${error.message}`);
      throw new ContainerError(`Failed to close session: ${error.message}`, { cause: error });
    }
  }

  /**
   * Get all sessions
   * @param {boolean} checkKubernetes - Whether to check Kubernetes for sessions not in memory
   * @returns {Promise<Array<Object>>} - All sessions
   */
  async getAllSessions(checkKubernetes = true) {
    // Get sessions from memory
    const memorySessions = Array.from(this.sessions.values()).map(session => {
      // Don't include the WebSocket object in the response
      const { ws, ...sessionInfo } = session;
      return sessionInfo;
    });
    
    // If checkKubernetes is true, check for sessions in Kubernetes that are not in memory
    if (checkKubernetes && this.enabled) {
      try {
        // Get all deployments with the gam-session label
        const listCmd = `kubectl get deployments -n ${this.namespace} -l component=gam-session -o jsonpath='{.items[*].metadata.name}'`;
        this.logger.info(`Listing all sessions in Kubernetes: ${listCmd}`);
        
        const { stdout } = await execAsync(listCmd);
        if (stdout) {
          const deploymentNames = stdout.split(' ');
          
          // For each deployment, check if it's already in memory
          for (const deploymentName of deploymentNames) {
            // Extract session ID from deployment name (remove 'gam-session-' prefix)
            const sessionId = deploymentName.replace('gam-session-', '');
            
            // If the session is not in memory, register it
            if (!this.sessions.has(sessionId)) {
              this.logger.info(`Found session ${sessionId} in Kubernetes that is not in memory, registering it...`);
              await this.checkExistingSession(sessionId);
            }
          }
          
          // Get the updated list of sessions from memory
          return Array.from(this.sessions.values()).map(session => {
            // Don't include the WebSocket object in the response
            const { ws, ...sessionInfo } = session;
            return sessionInfo;
          });
        }
      } catch (error) {
        this.logger.error(`Error listing sessions in Kubernetes: ${error.message}`);
      }
    }
    
    return memorySessions;
  }

  /**
   * Get a session by ID
   * @param {string} sessionId - The session ID
   * @param {boolean} checkKubernetes - Whether to check Kubernetes if the session is not found in memory
   * @returns {Promise<Object|null>} - The session or null if not found
   */
  async getSession(sessionId, checkKubernetes = true) {
    // Check if the session exists in memory
    if (this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId);
      // Don't include the WebSocket object in the response
      const { ws, ...sessionInfo } = session;
      return sessionInfo;
    }
    
    // If checkKubernetes is true and the session is not in memory, check if it exists in Kubernetes
    if (checkKubernetes && this.enabled) {
      this.logger.info(`Session ${sessionId} not found in memory, checking Kubernetes...`);
      const existingSession = await this.checkExistingSession(sessionId);
      if (existingSession) {
        this.logger.info(`Found session ${sessionId} in Kubernetes and registered it`);
        return existingSession;
      }
    }
    
    return null;
  }

  /**
   * Check if a session exists
   * @param {string} sessionId - The session ID
   * @param {boolean} checkKubernetes - Whether to check Kubernetes if the session is not found in memory
   * @returns {Promise<boolean>} - Whether the session exists
   */
  async hasSession(sessionId, checkKubernetes = true) {
    // Check if the session exists in memory
    if (this.sessions.has(sessionId)) {
      return true;
    }
    
    // If checkKubernetes is true and the session is not in memory, check if it exists in Kubernetes
    if (checkKubernetes && this.enabled) {
      this.logger.info(`Session ${sessionId} not found in memory, checking Kubernetes...`);
      const existingSession = await this.checkExistingSession(sessionId);
      if (existingSession) {
        this.logger.info(`Found session ${sessionId} in Kubernetes and registered it`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get the number of active sessions
   * @returns {number} - The number of active sessions
   */
  getSessionCount() {
    return this.sessions.size;
  }

  /**
   * Clean up inactive sessions
   * @param {number} timeout - The timeout in milliseconds
   * @returns {Promise<Array<string>>} - The IDs of the closed sessions
   */
  async cleanupInactiveSessions(timeout = 3600000) {
    if (!this.enabled) {
      this.logger.warn('WebSocket sessions are disabled');
      return [];
    }

    const now = new Date();
    const closedSessions = [];

    for (const [sessionId, sessionInfo] of this.sessions.entries()) {
      const lastActivity = sessionInfo.lastActivity || sessionInfo.createdAt;
      const timeSinceLastActivity = now - lastActivity;

      if (timeSinceLastActivity > timeout) {
        this.logger.info(`Closing inactive session ${sessionId} (inactive for ${timeSinceLastActivity}ms)`);
        
        try {
          await this.closeSession(sessionId);
          closedSessions.push(sessionId);
        } catch (error) {
          this.logger.error(`Error closing inactive session ${sessionId}: ${error.message}`);
        }
      }
    }

    return closedSessions;
  }

  /**
   * Get WebSocket status information
   * @returns {Object} - Status information
   */
  getStatus() {
    return {
      enabled: this.enabled,
      proxyServiceUrl: this.proxyServiceUrl,
      sessionConnectionTemplate: this.sessionConnectionTemplate,
      sessionPathTemplate: this.sessionPathTemplate,
      maxSessions: this.maxSessions,
      activeSessions: this.sessions.size
    };
  }
}

module.exports = KubernetesWebSocketAdapter;
