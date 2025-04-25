/**
 * Kubernetes implementation of ContainerService
 * Provides container operations using Kubernetes API
 */
const k8s = require('@kubernetes/client-node');
const fs = require('fs');
const path = require('path');
const ContainerService = require('./ContainerService');
const { ContainerError } = require('../../utils/errorHandler');

/**
 * Kubernetes implementation of ContainerService
 * @extends ContainerService
 */
class KubernetesAdapter extends ContainerService {
  /**
   * Create a new KubernetesAdapter
   * @param {import('../../config/config')} config - Configuration
   * @param {import('../../utils/logger')} logger - Logger instance
   * @param {import('./KubernetesWebSocketAdapter')} [websocketAdapter=null] - WebSocket adapter
   */
  constructor(config, logger, websocketAdapter = null) {
    super(logger);
    this.config = config;
    this.namespace = config.kubernetes.namespace;
    this.websocketAdapter = websocketAdapter;
    
    // Initialize Kubernetes client
    this._initializeK8sClient();
  }

  /**
   * Initialize Kubernetes client
   * @private
   */
  _initializeK8sClient() {
    try {
      // Initialize the Kubernetes client
      this.kc = new k8s.KubeConfig();

      // Try to load from the default location
      try {
        this.kc.loadFromDefault();
      } catch (error) {
        this.logger.warn('Could not load kubeconfig from default location, trying environment variables');
        
        // If that fails, try to use environment variables
        const clusterName = process.env.GKE_CLUSTER_NAME;
        const clusterLocation = process.env.GKE_CLUSTER_LOCATION;
        
        if (!clusterName || !clusterLocation) {
          throw new Error('GKE_CLUSTER_NAME and GKE_CLUSTER_LOCATION environment variables must be set');
        }
        
        // Use gcloud to get credentials
        const { execSync } = require('child_process');
        execSync(`gcloud container clusters get-credentials ${clusterName} --region ${clusterLocation} --project ${process.env.PROJECT_ID}`);
        
        // Now try to load again
        this.kc.loadFromDefault();
      }

      // Create the API clients
      this.k8sCoreV1Api = this.kc.makeApiClient(k8s.CoreV1Api);
      this.k8sAppsV1Api = this.kc.makeApiClient(k8s.AppsV1Api);
      this.k8sNetworkingV1Api = this.kc.makeApiClient(k8s.NetworkingV1Api);
      
      this.logger.info('Kubernetes client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Kubernetes client:', error);
      throw new ContainerError('Failed to initialize Kubernetes client', { cause: error });
    }
  }

  /**
   * Execute a command in a container
   * @param {string} sessionId - The session ID
   * @param {string} command - The command to execute
   * @returns {Promise<object>} - The command result
   * @throws {ContainerError} - If the command execution fails
   */
  async executeCommand(sessionId, command) {
    try {
      // Check if WebSocket adapter is available and enabled
      if (this.websocketAdapter && this.websocketAdapter.isEnabled() && this.websocketAdapter.hasSession(sessionId)) {
        this.logger.info(`Using WebSocket to execute command for session ${sessionId}`);
        
        try {
          // Connect to the session if not already connected
          const sessionInfo = this.websocketAdapter.getSession(sessionId);
          let ws;
          
          if (sessionInfo.status !== 'connected') {
            ws = await this.websocketAdapter.connectToSession(sessionId);
          }
          
          // Send the command
          await this.websocketAdapter.sendCommand(sessionId, command);
          
          // For WebSocket sessions, we don't get a direct response
          // The response will be sent to the client via the WebSocket connection
          return { stdout: '', stderr: '', websocket: true };
        } catch (error) {
          this.logger.error(`Error executing command via WebSocket for session ${sessionId}:`, error);
          // Fall back to regular Kubernetes execution
        }
      }
      
      // Generate the pod name based on the session ID
      const podName = `gam-session-${sessionId}`;
      
      this.logger.debug(`Executing command in pod ${podName}: ${command}`);
      
      // Create an exec instance
      const exec = new k8s.Exec(this.kc);
      
      // Execute the command
      return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        
        const commandArray = ['/bin/bash', '-c', command];
        
        exec.exec(
          this.namespace,
          podName,
          'gam-container',
          commandArray,
          {
            stdout: (data) => {
              stdout += data.toString();
            }
          },
          {
            stderr: (data) => {
              stderr += data.toString();
            }
          },
          process.stdin,
          true,
          (status) => {
            if (status.status === 'Success') {
              resolve({ stdout, stderr });
            } else {
              reject(new ContainerError(`Command execution failed: ${status.message}`, {
                command,
                podName,
                status
              }));
            }
          }
        );
      });
    } catch (error) {
      this.logger.error(`Error executing command in pod for session ${sessionId}:`, error);
      throw new ContainerError(`Error executing command: ${error.message}`, {
        cause: error,
        sessionId,
        command
      });
    }
  }

  /**
   * Execute a GAM command in a container
   * @param {string} sessionId - The session ID
   * @param {string} command - The GAM command to execute (without 'gam' prefix)
   * @param {object} options - Options for execution
   * @param {function} options.onStdout - Callback for stdout data
   * @param {function} options.onStderr - Callback for stderr data
   * @param {function} options.onClose - Callback for process close
   * @param {function} options.onError - Callback for process error
   * @returns {Promise<object>} - The command result
   * @throws {ContainerError} - If the command execution fails
   */
  executeGamCommand(sessionId, command, options = {}) {
    try {
      // Extract options with defaults
      const onStdout = options.onStdout || ((data) => this.logger.debug(`GAM stdout: ${data.toString()}`));
      const onStderr = options.onStderr || ((data) => this.logger.debug(`GAM stderr: ${data.toString()}`));
      const onClose = options.onClose || ((code) => this.logger.info(`GAM process exited with code ${code}`));
      const onError = options.onError || ((err) => this.logger.error(`GAM process error: ${err.message}`));

      // Check if WebSocket adapter is available and enabled
      if (this.websocketAdapter && this.websocketAdapter.isEnabled() && this.websocketAdapter.hasSession(sessionId)) {
        this.logger.info(`Using WebSocket to execute GAM command for session ${sessionId}: ${command}`);
        
        try {
          // Connect to the session if not already connected
          const sessionInfo = this.websocketAdapter.getSession(sessionId);
          let ws;
          
          if (sessionInfo.status !== 'connected') {
            ws = this.websocketAdapter.connectToSession(sessionId);
          }
          
          // Send the command
          this.websocketAdapter.sendCommand(sessionId, `gam ${command}`);
          
          // For WebSocket sessions, we don't get a direct response
          // The response will be sent to the client via the WebSocket connection
          return { websocket: true };
        } catch (error) {
          this.logger.error(`Error executing GAM command via WebSocket for session ${sessionId}:`, error);
          onError(error);
          // Fall back to regular Kubernetes execution
        }
      }
      
      // Generate the pod name based on the session ID
      const podName = `gam-session-${sessionId}`;
      
      this.logger.debug(`Executing GAM command in pod ${podName}: ${command}`);
      
      // Create an exec instance
      const exec = new k8s.Exec(this.kc);
      
      // Execute the command
      const commandArray = ['/bin/bash', '-c', `/gam/gam7/gam ${command}`];
      
      exec.exec(
        this.namespace,
        podName,
        'gam-container',
        commandArray,
        {
          stdout: (data) => {
            onStdout(data);
          }
        },
        {
          stderr: (data) => {
            onStderr(data);
          }
        },
        process.stdin,
        true,
        (status) => {
          if (status.status === 'Success') {
            onClose(0);
          } else {
            onClose(1);
          }
        }
      );
      
      return { kubernetes: true };
    } catch (error) {
      this.logger.error(`Error executing GAM command in pod for session ${sessionId}:`, error);
      options.onError(error);
      throw new ContainerError(`Error executing GAM command: ${error.message}`, {
        cause: error,
        sessionId,
        command
      });
    }
  }

  /**
   * Create a container for a session
   * @param {string} sessionId - The session ID
   * @param {object} options - Container options
   * @param {string} [options.cpu='500m'] - CPU resource limit
   * @param {string} [options.memory='512Mi'] - Memory resource limit
   * @param {string} [options.credentialsSecret='gam-credentials'] - Name of the credentials secret
   * @param {string} [options.command='info domain'] - Command to execute
   * @returns {Promise<object>} - The created container info
   * @throws {ContainerError} - If the container creation fails
   */
  async createContainer(sessionId, options = {}) {
    try {
      // Check if WebSocket adapter is available and enabled
      if (this.websocketAdapter && this.websocketAdapter.isEnabled()) {
        this.logger.info(`Creating WebSocket session for ${sessionId}`);
        
        try {
          // Create WebSocket session
          const sessionInfo = await this.websocketAdapter.createSession(sessionId, {
            command: options.command || 'info domain',
            credentialsSecret: options.credentialsSecret || 'gam-credentials'
          });
          
          // Return container information
          return {
            id: `container-${sessionId}`,
            sessionId,
            kubernetes: true,
            websocket: true,
            websocketPath: sessionInfo.websocketPath,
            serviceName: `gam-session-${sessionId}.${this.namespace}.svc.cluster.local`
          };
        } catch (error) {
          this.logger.error(`Error creating WebSocket session for ${sessionId}:`, error);
          // Fall back to regular Kubernetes deployment
          this.logger.info(`Falling back to regular Kubernetes deployment for ${sessionId}`);
        }
      }
      
      // Create pod
      const pod = await this._createPod(sessionId, options);
      
      // Create service
      const service = await this._createService(sessionId);
      
      // Generate websocket path
      const websocketPath = this.getWebsocketPath(sessionId);
      
      // Return container info
      return {
        id: `k8s-container-${sessionId}`,
        sessionId,
        podName: pod.metadata.name,
        serviceName: service.metadata.name,
        websocketPath,
        kubernetes: true,
        stream: null
      };
    } catch (error) {
      this.logger.error(`Error creating container for session ${sessionId}:`, error);
      throw new ContainerError(`Error creating container: ${error.message}`, {
        cause: error,
        sessionId,
        options
      });
    }
  }

  /**
   * Delete a container for a session
   * @param {string} sessionId - The session ID
   * @returns {Promise<void>}
   * @throws {ContainerError} - If the container deletion fails
   */
  async deleteContainer(sessionId) {
    try {
      // Check if WebSocket adapter is available and enabled
      if (this.websocketAdapter && this.websocketAdapter.isEnabled() && this.websocketAdapter.hasSession(sessionId)) {
        this.logger.info(`Closing WebSocket session for ${sessionId}`);
        
        try {
          // Close WebSocket session
          await this.websocketAdapter.closeSession(sessionId);
          return;
        } catch (error) {
          this.logger.warn(`Failed to close WebSocket session: ${error.message}`);
          // Continue with regular deletion
        }
      }
      
      // Delete pod
      await this._deletePod(sessionId);
      
      // Delete service
      await this._deleteService(sessionId);
      
      this.logger.info(`Deleted container for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error deleting container for session ${sessionId}:`, error);
      throw new ContainerError(`Error deleting container: ${error.message}`, {
        cause: error,
        sessionId
      });
    }
  }

  /**
   * Upload a file to a container
   * @param {string} sessionId - The session ID
   * @param {string} localFilePath - The local file path
   * @param {string} containerFilePath - The container file path
   * @returns {Promise<void>}
   * @throws {ContainerError} - If the file upload fails
   */
  async uploadFile(sessionId, localFilePath, containerFilePath) {
    try {
      // Generate the pod name based on the session ID
      const podName = `gam-session-${sessionId}`;
      
      // Read the file
      const fileContent = fs.readFileSync(localFilePath);
      
      // Create an exec instance
      const exec = new k8s.Exec(this.kc);
      
      // Create the directory if it doesn't exist
      await new Promise((resolve, reject) => {
        const command = [`mkdir -p $(dirname ${containerFilePath})`];
        
        exec.exec(
          this.namespace,
          podName,
          'gam-container',
          command,
          process.stdout,
          process.stderr,
          process.stdin,
          true,
          (status) => {
            if (status.status === 'Success') {
              resolve();
            } else {
              reject(new ContainerError(`Failed to create directory: ${status.message}`));
            }
          }
        );
      });
      
      // Write the file
      await new Promise((resolve, reject) => {
        const command = [`cat > ${containerFilePath}`];
        
        exec.exec(
          this.namespace,
          podName,
          'gam-container',
          command,
          process.stdout,
          process.stderr,
          process.stdin,
          true,
          (status) => {
            if (status.status === 'Success') {
              resolve();
            } else {
              reject(new ContainerError(`Failed to write file: ${status.message}`));
            }
          }
        );
        
        // Write the file content to stdin
        process.stdin.write(fileContent);
        process.stdin.end();
      });
      
      this.logger.debug(`Uploaded file ${localFilePath} to ${containerFilePath} in pod ${podName}`);
    } catch (error) {
      this.logger.error(`Error uploading file to pod for session ${sessionId}:`, error);
      throw new ContainerError(`Error uploading file: ${error.message}`, {
        cause: error,
        sessionId,
        localFilePath,
        containerFilePath
      });
    }
  }

  /**
   * Download a file from a container
   * @param {string} sessionId - The session ID
   * @param {string} containerFilePath - The container file path
   * @param {string} localFilePath - The local file path
   * @returns {Promise<void>}
   * @throws {ContainerError} - If the file download fails
   */
  async downloadFile(sessionId, containerFilePath, localFilePath) {
    try {
      // Generate the pod name based on the session ID
      const podName = `gam-session-${sessionId}`;
      
      // Create an exec instance
      const exec = new k8s.Exec(this.kc);
      
      // Read the file
      const fileContent = await new Promise((resolve, reject) => {
        let content = '';
        
        const command = [`cat ${containerFilePath}`];
        
        exec.exec(
          this.namespace,
          podName,
          'gam-container',
          command,
          {
            write: (data) => {
              content += data.toString();
            }
          },
          process.stderr,
          process.stdin,
          true,
          (status) => {
            if (status.status === 'Success') {
              resolve(content);
            } else {
              reject(new ContainerError(`Failed to read file: ${status.message}`));
            }
          }
        );
      });
      
      // Write the file
      fs.writeFileSync(localFilePath, fileContent);
      
      this.logger.debug(`Downloaded file ${containerFilePath} from pod ${podName} to ${localFilePath}`);
    } catch (error) {
      this.logger.error(`Error downloading file from pod for session ${sessionId}:`, error);
      throw new ContainerError(`Error downloading file: ${error.message}`, {
        cause: error,
        sessionId,
        containerFilePath,
        localFilePath
      });
    }
  }

  /**
   * Get the status of a container
   * @param {string} sessionId - The session ID
   * @returns {Promise<object>} - The container status
   * @throws {ContainerError} - If getting the status fails
   */
  async getStatus(sessionId) {
    try {
      // Check if WebSocket adapter is available and enabled
      if (this.websocketAdapter && this.websocketAdapter.isEnabled() && this.websocketAdapter.hasSession(sessionId)) {
        const sessionInfo = this.websocketAdapter.getSession(sessionId);
        return {
          phase: sessionInfo.status,
          containerStatuses: [
            {
              name: 'gam-container',
              ready: sessionInfo.status === 'connected',
              state: {
                running: sessionInfo.status === 'connected' ? { startedAt: sessionInfo.createdAt } : undefined,
                waiting: sessionInfo.status === 'connecting' ? { reason: 'Connecting' } : undefined,
                terminated: sessionInfo.status === 'error' ? { reason: sessionInfo.error } : undefined
              }
            }
          ]
        };
      }
      
      // Generate the pod name based on the session ID
      const podName = `gam-session-${sessionId}`;
      
      // Get the pod
      const response = await this.k8sCoreV1Api.readNamespacedPod(podName, this.namespace);
      
      return response.body.status;
    } catch (error) {
      this.logger.error(`Error getting pod status for session ${sessionId}:`, error);
      throw new ContainerError(`Error getting container status: ${error.message}`, {
        cause: error,
        sessionId
      });
    }
  }

  /**
   * Get the websocket path for a session
   * @param {string} sessionId - The session ID
   * @returns {string} - The websocket path
   */
  getWebsocketPath(sessionId) {
    // Check if WebSocket adapter is available and enabled
    if (this.websocketAdapter && this.websocketAdapter.isEnabled()) {
      return this.websocketAdapter.sessionPathTemplate.replace('{{SESSION_ID}}', sessionId);
    }
    
    return this.config.getTemplatePath('websocketPath', sessionId);
  }

  /**
   * Create a pod for a session
   * @private
   * @param {string} sessionId - The session ID
   * @param {object} options - Pod options
   * @returns {Promise<object>} - The created pod
   */
  async _createPod(sessionId, options = {}) {
    // Generate a unique name for the pod based on the session ID
    const podName = `gam-session-${sessionId}`;
    
    // Get the pod template from the config map
    const podTemplate = {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: {
        name: podName,
        namespace: this.namespace,
        labels: {
          app: 'gamgui',
          session_id: sessionId
        }
      },
      spec: {
        serviceAccountName: this.config.kubernetes.serviceAccount,
        containers: [
          {
            name: 'gam-container',
            image: this.config.docker.gamImage,
            command: ['/bin/bash', '-c', 'while true; do sleep 30; done'],
            workingDir: '/gam',
            ports: [
              {
                containerPort: 8080,
                name: 'http'
              },
              {
                containerPort: 8081,
                name: 'websocket'
              }
            ],
            env: [
              {
                name: 'GAM_CONFIG_DIR',
                value: '/root/.gam'
              },
              {
                name: 'SESSION_ID',
                value: sessionId
              }
            ],
            resources: {
              limits: {
                cpu: options.cpu || '500m',
                memory: options.memory || '512Mi'
              },
              requests: {
                cpu: options.cpu || '250m',
                memory: options.memory || '256Mi'
              }
            },
            volumeMounts: [
              {
                name: 'gam-credentials',
                mountPath: '/root/.gam'
              },
              {
                name: 'gam-uploads',
                mountPath: '/gam/uploads'
              },
              {
                name: 'gam-config',
                mountPath: '/root/.gam/gam.cfg',
                subPath: 'gam.cfg'
              }
            ]
          }
        ],
        volumes: [
          {
            name: 'gam-credentials',
            secret: {
              secretName: options.credentialsSecret || 'gam-credentials'
            }
          },
          {
            name: 'gam-uploads',
            emptyDir: {}
          },
          {
            name: 'gam-config',
            configMap: {
              name: 'gam-config'
            }
          }
        ]
      }
    };
    
    // Create the pod
    const response = await this.k8sCoreV1Api.createNamespacedPod(this.namespace, podTemplate);
    
    this.logger.info(`Created pod ${podName} for session ${sessionId}`);
    
    return response.body;
  }

  /**
   * Delete a pod for a session
   * @private
   * @param {string} sessionId - The session ID
   * @returns {Promise<object>} - The deleted pod
   */
  async _deletePod(sessionId) {
    // Generate the pod name based on the session ID
    const podName = `gam-session-${sessionId}`;
    
    try {
      // Delete the pod
      const response = await this.k8sCoreV1Api.deleteNamespacedPod(podName, this.namespace);
      
      this.logger.info(`Deleted pod ${podName} for session ${sessionId}`);
      
      return response.body;
    } catch (error) {
      // If the pod doesn't exist, that's fine
      if (error.response && error.response.statusCode === 404) {
        this.logger.warn(`Pod ${podName} not found for deletion`);
        return null;
      }
      
      // Otherwise, rethrow the error
      throw error;
    }
  }

  /**
   * Create a service for a session
   * @private
   * @param {string} sessionId - The session ID
   * @returns {Promise<object>} - The created service
   */
  async _createService(sessionId) {
    // Use template to generate service name
    const serviceName = this.config.getTemplatePath('service', sessionId);
    
    // Check if service already exists
    try {
      const existingService = await this.k8sCoreV1Api.readNamespacedService(serviceName, this.namespace);
      this.logger.warn(`Service ${serviceName} already exists`);
      return existingService.body;
    } catch (error) {
      if (error.response && error.response.statusCode !== 404) {
        throw error;
      }
    }
    
    // Create the service
    const serviceSpec = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: serviceName,
        namespace: this.namespace,
        labels: {
          app: 'gamgui',
          session_id: sessionId
        }
      },
      spec: {
        selector: {
          app: 'gamgui',
          session_id: sessionId
        },
        ports: [
          {
            port: 80,
            targetPort: 8080,
            name: 'http'
          },
          {
            port: 8081,
            targetPort: 8081,
            name: 'websocket'
          }
        ]
      }
    };
    
    const response = await this.k8sCoreV1Api.createNamespacedService(this.namespace, serviceSpec);
    this.logger.info(`Created service ${serviceName} for session ${sessionId}`);
    
    return response.body;
  }

  /**
   * Delete a service for a session
   * @private
   * @param {string} sessionId - The session ID
   * @returns {Promise<object>} - The deleted service
   */
  async _deleteService(sessionId) {
    // Generate the service name based on the session ID
    const serviceName = this.config.getTemplatePath('service', sessionId);
    
    try {
      // Delete the service
      const response = await this.k8sCoreV1Api.deleteNamespacedService(serviceName, this.namespace);
      
      this.logger.info(`Deleted service ${serviceName} for session ${sessionId}`);
      
      return response.body;
    } catch (error) {
      // If the service doesn't exist, that's fine
      if (error.response && error.response.statusCode === 404) {
        this.logger.warn(`Service ${serviceName} not found for deletion`);
        return null;
      }
      
      // Otherwise, rethrow the error
      throw error;
    }
  }
}

module.exports = KubernetesAdapter;
