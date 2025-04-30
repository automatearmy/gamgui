/**
 * Kubernetes implementation of ContainerService
 * Provides container operations using Kubernetes API
 */
const k8s = require(require('path').resolve(__dirname, '../../../node_modules/@kubernetes/client-node'));
const fs = require(require('path').resolve(__dirname, '../../../node_modules/fs'));
const path = require(require('path').resolve(__dirname, '../../../node_modules/path'));
const { GoogleAuth } = require(require('path').resolve(__dirname, '../../../node_modules/google-auth-library'));
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
    this.k8sCoreV1Api = null;
    this.k8sAppsV1Api = null;
    this.k8sNetworkingV1Api = null;
    this.kc = null;
    
    // Initialize Kubernetes client
    this._initializeK8sClient();
  }

  /**
   * Get GCP access token
   * @private
   * @returns {Promise<string>} - GCP access token
   */
  async _getGcpAccessToken() {
    try {
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
      
      this.logger.debug('Getting GCP authentication client...');
      const client = await auth.getClient();
      
      this.logger.debug('Requesting access token...');
      const tokenResponse = await client.getAccessToken();
      
      if (tokenResponse && tokenResponse.token) {
        this.logger.info('Successfully obtained GCP access token');
        this.logger.debug(`Token: ${tokenResponse.token.substring(0, 10)}...`);
        return tokenResponse.token;
      } else {
        this.logger.error('Failed to obtain GCP access token: Token not returned');
        throw new Error('Failed to obtain GCP access token: Token not returned');
      }
    } catch (error) {
      this.logger.error('Error obtaining GCP access token:', error);
      throw new ContainerError('Failed to obtain GCP access token', { cause: error });
    }
  }

  /**
   * Initialize Kubernetes client using GCP authentication
   * @private
   */
  async _initializeK8sClient() {
    try {
      this.kc = new k8s.KubeConfig();
      
      // Get GKE cluster info from environment variables
      const clusterName = process.env.GKE_CLUSTER_NAME;
      const clusterLocation = process.env.GKE_CLUSTER_LOCATION;
      const projectId = process.env.PROJECT_ID;
      
      if (!clusterName || !clusterLocation || !projectId) {
        this.logger.error('Missing required environment variables for GKE cluster');
        throw new Error('Missing required environment variables for GKE cluster');
      }
      
      this.logger.info(`Initializing Kubernetes client for GKE cluster ${clusterName} in ${clusterLocation}`);
      
      // Get GCP access token
      const accessToken = await this._getGcpAccessToken();
      
      // Get cluster endpoint
      const { execSync } = require(require('path').resolve(__dirname, '../../../node_modules/child_process'));
      const clusterInfoCommand = `gcloud container clusters describe ${clusterName} --region=${clusterLocation} --project=${projectId} --format="json(endpoint,masterAuth.clusterCaCertificate)"`;
      const clusterInfoJson = execSync(clusterInfoCommand).toString();
      const clusterInfo = JSON.parse(clusterInfoJson);
      
      if (!clusterInfo.endpoint || !clusterInfo.masterAuth.clusterCaCertificate) {
        this.logger.error('Failed to get GKE cluster endpoint or CA certificate');
        throw new Error('Failed to get GKE cluster endpoint or CA certificate');
      }
      
      // Configure KubeConfig manually
      this.kc.loadFromOptions({
        clusters: [{
          name: 'gke-cluster',
          server: `https://${clusterInfo.endpoint}`,
          caData: clusterInfo.masterAuth.clusterCaCertificate,
          skipTLSVerify: false
        }],
        users: [{
          name: 'gcp-user',
          token: accessToken
        }],
        contexts: [{
          name: 'gke-context',
          cluster: 'gke-cluster',
          user: 'gcp-user'
        }],
        currentContext: 'gke-context'
      });
      
      // Create API clients
      this.k8sCoreV1Api = this.kc.makeApiClient(k8s.CoreV1Api);
      this.k8sAppsV1Api = this.kc.makeApiClient(k8s.AppsV1Api);
      this.k8sNetworkingV1Api = this.kc.makeApiClient(k8s.NetworkingV1Api);
      
      this.logger.info('Kubernetes API clients created successfully');
      
      // Test connection
      try {
        const namespaces = await this.k8sCoreV1Api.listNamespace();
        this.logger.info(`Successfully connected to Kubernetes cluster. Found ${namespaces.body.items.length} namespaces.`);
      } catch (testError) {
        this.logger.error('Failed to test connection to Kubernetes cluster:', testError);
        throw testError;
      }
    } catch (error) {
      // Catch any error during the overall initialization
      this.logger.error('Failed during Kubernetes client initialization process:', error);
      // Ensure we throw a ContainerError if it's not already one
      if (error instanceof ContainerError) {
        throw error;
      } else {
        throw new ContainerError('Failed during Kubernetes client initialization', { cause: error });
      }
    }
  }

  /**
   * Build the Pod specification object.
   * @private
   * @param {string} sessionId - The session ID.
   * @param {object} options - Pod options from createContainer.
   * @returns {object} - The Kubernetes Pod specification.
   */
  _buildPodTemplate(sessionId, options) {
    const podName = `gam-session-${sessionId}`;
    return {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: {
        name: podName,
        namespace: this.namespace,
        labels: {
          app: 'gamgui',
          component: 'gam-session',
          session_id: sessionId
        }
      },
      spec: {
        serviceAccountName: this.config.kubernetes.serviceAccount,
        containers: [
          {
            name: 'gam',
            image: this.config.docker.gamImage,
            // Original complex startup script - restore this once basic pod creation works
            command: ['/bin/bash', '-c'],
             args: [
               `echo "Starting GAM session ${sessionId}..."

               # Create GAM config directory
               mkdir -p /root/.gam

               # Create a new gam.cfg file with correct paths
               cat > /root/.gam/gam.cfg << GAMCFG
               [DEFAULT]
               customer_id = my_customer
               domain = automatearmy.com
               oauth2_txt = /root/.gam/oauth2.txt
               oauth2service_json = /root/.gam/oauth2service.json
               client_secrets_json = /root/.gam/client_secrets.json
               GAMCFG

               # Copy credentials to the expected location
               cp /root/.gam/credentials/oauth2.txt /root/.gam/oauth2.txt
               cp /root/.gam/credentials/oauth2service.json /root/.gam/oauth2service.json
               cp /root/.gam/credentials/client_secrets.json /root/.gam/client_secrets.json

               # Make sure permissions are correct
               chmod 600 /root/.gam/oauth2.txt
               chmod 600 /root/.gam/oauth2service.json
               chmod 600 /root/.gam/client_secrets.json

               # Test GAM command
               echo "Testing GAM command: info domain"
               /gam/gam7/gam info domain || echo "Command failed"

               # Start a simple HTTP server to handle WebSocket requests (Consider removing if not needed)
               echo "Starting HTTP server on port 8080..."
               cd /gam
               python3 -m http.server 8080 &

               # Keep the container running
               echo "GAM session is ready. Waiting for commands..."
               while true; do sleep 30; done`
             ],
            workingDir: '/gam',
            ports: [
              { containerPort: 8080, name: 'http' },
              { containerPort: 8081, name: 'websocket' }
            ],
            env: [
              { name: 'GAM_CONFIG_DIR', value: '/root/.gam' },
              { name: 'SESSION_ID', value: sessionId }
            ],
            resources: {
              limits: { cpu: options.cpu || '500m', memory: options.memory || '512Mi' },
              requests: { cpu: options.cpu || '250m', memory: options.memory || '256Mi' }
            },
            volumeMounts: [
              { name: 'gam-credentials', mountPath: '/root/.gam/credentials', readOnly: true },
              { name: 'gam-uploads', mountPath: '/gam/uploads' }
            ]
          }
        ],
        volumes: [
          { name: 'gam-credentials', secret: { secretName: options.credentialsSecret || 'gam-credentials' } },
          { name: 'gam-uploads', emptyDir: {} }
        ]
      }
    };
  }

   /**
   * Build the Service specification object.
   * @private
   * @param {string} sessionId - The session ID.
   * @param {string} serviceName - The desired name for the service.
   * @returns {object} - The Kubernetes Service specification.
   */
  _buildServiceSpec(sessionId, serviceName) {
     return {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: serviceName,
        namespace: this.namespace,
        labels: {
          app: 'gamgui',
          component: 'gam-session',
          session_id: sessionId
        }
      },
      spec: {
        selector: {
          app: 'gamgui',
          component: 'gam-session',
          session_id: sessionId
        },
        ports: [
          { port: 80, targetPort: 8080, name: 'http' },
          { port: 8081, targetPort: 8081, name: 'websocket' }
        ]
      }
    };
  }

  /**
   * Create a pod for a session.
   * @private
   * @param {string} sessionId - The session ID.
   * @param {object} options - Pod options from createContainer.
   * @returns {Promise<object>} - The created pod API object.
   */
  async _createPod(sessionId, options = {}) {
    const podName = `gam-session-${sessionId}`;
    const podTemplate = this._buildPodTemplate(sessionId, options);

    this.logger.debug(`Calling createNamespacedPod for ${podName}`);
    try {
      const response = await this.k8sCoreV1Api.createNamespacedPod(this.namespace, podTemplate);
      this.logger.info(`Successfully called createNamespacedPod for ${podName}. Response status: ${response?.response?.statusCode}`);
      this.logger.info(`Created pod ${podName} for session ${sessionId}`);
      return response.body;
    } catch (error) {
       this.logger.error(`Error calling createNamespacedPod for ${podName}:`, {
         message: error.message,
         status: error.response?.body?.code,
         reason: error.response?.body?.reason,
         details: error.response?.body || 'No response body'
       });
       throw error; // Re-throw after logging
    }
  }

  /**
   * Delete a pod for a session.
   * @private
   * @param {string} sessionId - The session ID.
   * @returns {Promise<object | null>} - The deleted pod API object or null if not found.
   */
  async _deletePod(sessionId) {
    const podName = `gam-session-${sessionId}`;
    this.logger.debug(`Attempting to delete pod ${podName}`);
    try {
      const response = await this.k8sCoreV1Api.deleteNamespacedPod(podName, this.namespace);
      this.logger.info(`Deleted pod ${podName} for session ${sessionId}`);
      return response.body;
    } catch (error) {
      if (error.response && error.response.statusCode === 404) {
        this.logger.warn(`Pod ${podName} not found for deletion.`);
        return null;
      }
      this.logger.error(`Error deleting pod ${podName}:`, error.response?.body || error.message);
      throw error; // Re-throw other errors
    }
  }

  /**
   * Create a service for a session.
   * @private
   * @param {string} sessionId - The session ID.
   * @returns {Promise<object>} - The created service API object.
   */
  async _createService(sessionId) {
    const serviceName = this.config.getTemplatePath('service', sessionId);
    this.logger.debug(`Attempting to create service ${serviceName}`);

    // Check if service already exists
    try {
      const existingService = await this.k8sCoreV1Api.readNamespacedService(serviceName, this.namespace);
      if (existingService?.body) {
          this.logger.warn(`Service ${serviceName} already exists.`);
          return existingService.body;
      }
    } catch (error) {
      // Only ignore 404 errors, rethrow others
      if (!error.response || error.response.statusCode !== 404) {
         this.logger.error(`Error checking for existing service ${serviceName}:`, error.response?.body || error.message);
         throw error;
      }
       this.logger.debug(`Service ${serviceName} does not exist, proceeding with creation.`);
    }

    // Create the service if it doesn't exist
    const serviceSpec = this._buildServiceSpec(sessionId, serviceName);
    try {
        const response = await this.k8sCoreV1Api.createNamespacedService(this.namespace, serviceSpec);
        this.logger.info(`Created service ${serviceName} for session ${sessionId}`);
        return response.body;
    } catch (error) {
        this.logger.error(`Error calling createNamespacedService for ${serviceName}:`, {
         message: error.message,
         status: error.response?.body?.code,
         reason: error.response?.body?.reason,
         details: error.response?.body || 'No response body'
       });
       throw error; // Re-throw after logging
    }
  }

  /**
   * Delete a service for a session.
   * @private
   * @param {string} sessionId - The session ID.
   * @returns {Promise<object | null>} - The deleted service API object or null if not found.
   */
  async _deleteService(sessionId) {
    const serviceName = this.config.getTemplatePath('service', sessionId);
     this.logger.debug(`Attempting to delete service ${serviceName}`);
    try {
      const response = await this.k8sCoreV1Api.deleteNamespacedService(serviceName, this.namespace);
      this.logger.info(`Deleted service ${serviceName} for session ${sessionId}`);
      return response.body;
    } catch (error) {
      if (error.response && error.response.statusCode === 404) {
        this.logger.warn(`Service ${serviceName} not found for deletion.`);
        return null;
      }
       this.logger.error(`Error deleting service ${serviceName}:`, error.response?.body || error.message);
      throw error; // Re-throw other errors
    }
  }

  // --- Public Methods ---

  /**
   * Execute a command in a container
   * @param {string} sessionId - The session ID
   * @param {string} command - The command to execute
   * @returns {Promise<object>} - The command result { stdout, stderr, websocket? }
   * @throws {ContainerError} - If the command execution fails
   */
  async executeCommand(sessionId, command) {
    // Note: WebSocket logic removed for simplicity in this refactor pass,
    // assuming standard exec is the primary path now. Re-add if needed.
    const podName = `gam-session-${sessionId}`;
    this.logger.debug(`Executing command in pod ${podName}: ${command}`);

    try {
      const exec = new k8s.Exec(this.kc);
      return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        const commandArray = ['/bin/bash', '-c', command]; // Execute raw command

        exec.exec(
          this.namespace,
          podName,
          'gam', // Container name within the Pod
          commandArray,
          { stdout: (data) => { stdout += data.toString(); } }, // Writable stream for stdout
          { stderr: (data) => { stderr += data.toString(); } }, // Writable stream for stderr
          null, // stdin - not interactive for now
          false, // tty - not needed for non-interactive
          (status) => { // status callback
            this.logger.debug(`Exec status for session ${sessionId}:`, status);
            if (status.status === 'Success') {
              resolve({ stdout, stderr });
            } else {
               this.logger.error(`Exec failed for session ${sessionId}:`, status);
               // Attempt to provide more context in the error
               const errorMessage = status.message || `Exec failed with status: ${status.status}`;
               reject(new ContainerError(errorMessage, { command, podName, status }));
            }
          }
        );
      });
    } catch (error) {
      this.logger.error(`Error setting up exec for session ${sessionId}:`, error);
      // Check if it's a Kubernetes client error with response details
      const details = error.response?.body || error.message;
      throw new ContainerError(`Error executing command: ${error.message}`, {
        cause: error,
        sessionId,
        command,
        details
      });
    }
  }

  /**
   * Execute a GAM command in a container
   * @param {string} sessionId - The session ID
   * @param {string} command - The GAM command to execute (without 'gam' prefix)
   * @param {object} options - Options for execution (onStdout, onStderr, etc.)
   * @returns {Promise<object>} - The command result or execution info
   * @throws {ContainerError} - If the command execution fails
   */
  executeGamCommand(sessionId, command, options = {}) {
     // Extract options with defaults
      const onStdout = options.onStdout || ((data) => this.logger.debug(`GAM stdout [${sessionId}]: ${data.toString()}`));
      const onStderr = options.onStderr || ((data) => this.logger.error(`GAM stderr [${sessionId}]: ${data.toString()}`)); // Log stderr as error
      const onClose = options.onClose || ((code) => this.logger.info(`GAM process [${sessionId}] exited with code ${code}`));
      const onError = options.onError || ((err) => this.logger.error(`GAM process error [${sessionId}]: ${err.message}`));

    const podName = `gam-session-${sessionId}`;
    this.logger.debug(`Executing GAM command in pod ${podName}: ${command}`);

    try {
      const exec = new k8s.Exec(this.kc);
      // Ensure the command path is correct inside the container
      const commandArray = ['/gam/gam7/gam', ...command.split(' ')];

      // Use streams for real-time output handling if callbacks are provided
      const { Writable } = require(require('path').resolve(__dirname, '../../../node_modules/stream'));
      const stdoutStream = new Writable({
        write(chunk, encoding, callback) {
          onStdout(chunk);
          callback();
        }
      });
       const stderrStream = new Writable({
        write(chunk, encoding, callback) {
          onStderr(chunk);
          callback();
        }
      });

      exec.exec(
        this.namespace,
        podName,
        'gam', // Container name
        commandArray,
        stdoutStream, // Pass stream directly
        stderrStream, // Pass stream directly
        null, // stdin - assuming non-interactive GAM commands for now
        false, // tty
        (status) => { // status callback
          this.logger.debug(`GAM Exec status for session ${sessionId}:`, status);
           if (status.status === 'Success') {
             onClose(0);
           } else {
             // Extract exit code if available in the message
             const exitCodeMatch = status.message?.match(/exit code (\d+)/);
             const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : 1; // Default to 1 if not found
             this.logger.error(`GAM Exec failed for session ${sessionId}:`, status);
             onClose(exitCode);
           }
        }
      );

      // Indicate Kubernetes execution was initiated (doesn't wait for completion here)
      return { kubernetes: true };
    } catch (error) {
      this.logger.error(`Error setting up GAM exec for session ${sessionId}:`, error);
      onError(error); // Call the error callback
      const details = error.response?.body || error.message;
      throw new ContainerError(`Error executing GAM command: ${error.message}`, {
        cause: error,
        sessionId,
        command,
        details
      });
    }
  }

  /**
   * Create a container for a session
   * @param {string} sessionId - The session ID
   * @param {object} options - Container options
   * @returns {Promise<object>} - The created container info
   * @throws {ContainerError} - If the container creation fails
   */
  async createContainer(sessionId, options = {}) {
    // NOTE: WebSocket logic is disabled via env var, so we go straight to Pod creation.
    this.logger.info(`Attempting to create standard Kubernetes Pod for session ${sessionId}`);
    try {
      // Create pod
      const pod = await this._createPod(sessionId, options);
      if (!pod || !pod.metadata) {
         throw new Error('Pod creation API call did not return expected metadata.');
      }
       this.logger.info(`Successfully created Pod object for session ${sessionId}: ${pod.metadata.name}`);

      // Create service
      const service = await this._createService(sessionId);
       if (!service || !service.metadata) {
         throw new Error('Service creation API call did not return expected metadata.');
      }
      this.logger.info(`Successfully created Service object for session ${sessionId}: ${service.metadata.name}`);

      // Generate websocket path (even if not using websockets directly, might be needed elsewhere)
      const websocketPath = this.getWebsocketPath(sessionId);

      // Return container info
      return {
        id: `k8s-container-${sessionId}`,
        sessionId,
        podName: pod.metadata.name,
        serviceName: service.metadata.name,
        websocketPath,
        kubernetes: true, // Indicate it's a K8s pod
        stream: null // Stream is handled differently now via exec
      };
    } catch (error) {
      // Log the specific error during container creation attempt
      this.logger.error(`Error in createContainer for session ${sessionId}:`, {
        message: error.message,
        stack: error.stack,
        cause: error.cause, // Log the original error if wrapped
        details: error.response?.body || 'No response body' // Log Kubernetes API error details if available
      });
      // Ensure we throw a ContainerError
       if (error instanceof ContainerError) {
         throw error;
       } else {
          throw new ContainerError(`Error creating container: ${error.message}`, {
            cause: error,
            sessionId,
            options
          });
       }
    }
  }

  /**
   * Delete a container for a session
   * @param {string} sessionId - The session ID
   * @returns {Promise<void>}
   * @throws {ContainerError} - If the container deletion fails
   */
  async deleteContainer(sessionId) {
     // NOTE: WebSocket logic is disabled via env var.
    this.logger.info(`Attempting to delete Kubernetes resources for session ${sessionId}`);
    try {
      // Delete service first (best practice)
      await this._deleteService(sessionId);
      // Delete pod
      await this._deletePod(sessionId);

      this.logger.info(`Deleted Kubernetes resources for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error deleting container resources for session ${sessionId}:`, error);
       if (error instanceof ContainerError) {
         throw error;
       } else {
         throw new ContainerError(`Error deleting container resources: ${error.message}`, {
           cause: error,
           sessionId
         });
       }
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
    const podName = `gam-session-${sessionId}`;
    this.logger.debug(`Uploading ${localFilePath} to ${podName}:${containerFilePath}`);
    try {
      const stats = fs.statSync(localFilePath);
      const command = ['cp', '/dev/stdin', containerFilePath]; // Use cp instead of cat redirection

      const exec = new k8s.Exec(this.kc);
      const stream = exec.exec(
        this.namespace,
        podName,
        'gam', // container name
        command,
        null, // stdout stream (don't need output)
        process.stderr, // stderr stream
        fs.createReadStream(localFilePath), // stdin stream
        false, // tty
        (status) => { // status callback
           this.logger.debug(`Upload exec status for session ${sessionId}:`, status);
           if (status.status !== 'Success') {
                this.logger.error(`Upload failed for session ${sessionId}:`, status);
                // Note: Cannot reject promise from here directly, error handling relies on stream errors
           } else {
               this.logger.info(`Successfully uploaded ${localFilePath} to ${podName}:${containerFilePath}`);
           }
        }
      );

      // Wait for the stream to finish or error
      await new Promise((resolve, reject) => {
          stream.on('finish', resolve);
          stream.on('error', (err) => {
              this.logger.error(`Error during upload stream for session ${sessionId}:`, err);
              reject(new ContainerError(`Upload stream error: ${err.message}`, { cause: err }));
          });
          // Add a timeout?
      });

    } catch (error) {
      this.logger.error(`Error uploading file to pod ${podName}:`, error);
       if (error instanceof ContainerError) {
         throw error;
       } else {
         throw new ContainerError(`Error uploading file: ${error.message}`, {
           cause: error,
           sessionId,
           localFilePath,
           containerFilePath
         });
       }
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
     const podName = `gam-session-${sessionId}`;
     this.logger.debug(`Downloading ${podName}:${containerFilePath} to ${localFilePath}`);
    try {
      const command = ['cat', containerFilePath];
      const exec = new k8s.Exec(this.kc);
      const writeStream = fs.createWriteStream(localFilePath);

      const stream = exec.exec(
        this.namespace,
        podName,
        'gam', // container name
        command,
        writeStream, // stdout stream
        process.stderr, // stderr stream
        null, // stdin stream
        false, // tty
         (status) => { // status callback
           this.logger.debug(`Download exec status for session ${sessionId}:`, status);
           if (status.status !== 'Success') {
                this.logger.error(`Download failed for session ${sessionId}:`, status);
                 // Note: Cannot reject promise from here directly, error handling relies on stream errors
                 // Clean up partially downloaded file
                 try { fs.unlinkSync(localFilePath); } catch (e) { /* ignore */ }
           } else {
                this.logger.info(`Successfully downloaded ${podName}:${containerFilePath} to ${localFilePath}`);
           }
        }
      );

       // Wait for the stream to finish or error
      await new Promise((resolve, reject) => {
          writeStream.on('finish', resolve); // Resolve when file writing is done
          // Handle potential errors from both the exec stream and the write stream
          stream.on('error', (err) => {
              this.logger.error(`Error during download stream for session ${sessionId}:`, err);
               try { fs.unlinkSync(localFilePath); } catch (e) { /* ignore */ } // Cleanup partial file
              reject(new ContainerError(`Download stream error: ${err.message}`, { cause: err }));
          });
           writeStream.on('error', (err) => {
              this.logger.error(`Error writing downloaded file for session ${sessionId}:`, err);
               try { fs.unlinkSync(localFilePath); } catch (e) { /* ignore */ } // Cleanup partial file
              reject(new ContainerError(`File write error during download: ${err.message}`, { cause: err }));
          });
          // Add a timeout?
      });

    } catch (error) {
      this.logger.error(`Error downloading file from pod ${podName}:`, error);
       if (error instanceof ContainerError) {
         throw error;
       } else {
         throw new ContainerError(`Error downloading file: ${error.message}`, {
           cause: error,
           sessionId,
           containerFilePath,
           localFilePath
         });
       }
    }
  }

  /**
   * Get the status of a container
   * @param {string} sessionId - The session ID
   * @returns {Promise<object>} - The container status (PodStatus object)
   * @throws {ContainerError} - If getting the status fails
   */
  async getStatus(sessionId) {
    // NOTE: WebSocket logic is disabled via env var.
    const podName = `gam-session-${sessionId}`;
    this.logger.debug(`Getting status for pod ${podName}`);
    try {
      const response = await this.k8sCoreV1Api.readNamespacedPodStatus(podName, this.namespace);
      return response.body.status;
    } catch (error) {
      this.logger.error(`Error getting pod status for ${podName}:`, error.response?.body || error.message);
       if (error.response && error.response.statusCode === 404) {
         // Treat 404 as a specific status (e.g., 'NotFound' or 'Deleted') rather than an error
         return { phase: 'NotFound' };
       }
       if (error instanceof ContainerError) {
         throw error;
       } else {
         throw new ContainerError(`Error getting container status: ${error.message}`, {
           cause: error,
           sessionId
         });
       }
    }
  }

  /**
   * Get the websocket path for a session
   * @param {string} sessionId - The session ID
   * @returns {string} - The websocket path
   */
  getWebsocketPath(sessionId) {
     // NOTE: WebSocket logic is disabled via env var.
    // This might still be called by SessionService, return the template path.
    return this.config.getTemplatePath('websocketPath', sessionId);
  }

}

module.exports = KubernetesAdapter;
