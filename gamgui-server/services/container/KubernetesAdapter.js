/**
 * Kubernetes implementation of ContainerService
 * Provides container operations using Kubernetes API
 */
const k8s = require('@kubernetes/client-node');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { GoogleAuth } = require('google-auth-library');
const ContainerService = require('./ContainerService');
const { ContainerError } = require('../../utils/errorHandler');
const https = require('https');
const { PassThrough } = require('stream');
const crypto = require('crypto');

/**
 * Kubernetes implementation of ContainerService
 * @extends ContainerService
 */
class KubernetesAdapter extends ContainerService {
  /**
   * Create a new KubernetesAdapter
   * @param {import('../../config/config')} config - Configuration
   * @param {import('../../utils/logger')} logger - Logger instance
   * @param {Object} [websocketAdapter=null] - WebSocket adapter (deprecated)
   */
  constructor(config, logger, websocketAdapter = null) {
    console.log("!!!! KUBERNETES ADAPTER VERSION CHECK: v20250513_170222Z !!!!"); // Unique version check with Shell Command support
    super(logger);
    this.config = config;
    this.namespace = config.kubernetes.namespace;
    this.websocketAdapter = websocketAdapter;
    this.k8sCoreV1Api = null;
    this.k8sAppsV1Api = null;
    this.k8sNetworkingV1Api = null;
    this.kc = null;
    this.isInitialized = false; // Flag to track initialization status

    // Asynchronous initialization
    this._initializeK8sClientAsync()
      .then(() => {
        this.isInitialized = true;
        this.logger.info('Kubernetes client initialization successful (async).');
      })
      .catch(initError => {
        this.isInitialized = false;
        this.logger.error('CRITICAL: Asynchronous error during Kubernetes client initialization:', initError);
        // This error should ideally prevent the server from starting or mark it as unhealthy.
        // For now, it's logged, and operations requiring the client will fail.
      });
  }

  /**
   * Asynchronously initialize Kubernetes client
   * @private
   */
  async _initializeK8sClientAsync() {
    this.logger.info('Attempting to initialize Kubernetes client...');
    this.kc = new k8s.KubeConfig();
    
    const clusterName = process.env.GKE_CLUSTER_NAME;
    const clusterLocation = process.env.GKE_CLUSTER_LOCATION;
    const projectId = process.env.PROJECT_ID;
    
    if (!clusterName || !clusterLocation || !projectId) {
      this.logger.error('Missing required GKE environment variables (GKE_CLUSTER_NAME, GKE_CLUSTER_LOCATION, PROJECT_ID).');
      throw new Error('Missing required GKE environment variables for Kubernetes client initialization.');
    }
    
    this.logger.info(`Initializing Kubernetes client for GKE cluster: ${clusterName} in ${clusterLocation}, Project: ${projectId}`);
    
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    
    if (!tokenResponse || !tokenResponse.token) {
      this.logger.error('Failed to get GCP access token for Kubernetes client.');
      throw new Error('Failed to get GCP access token for Kubernetes client.');
    }
    
    const accessToken = tokenResponse.token;
    this.logger.info('GCP access token obtained successfully for Kubernetes client.');
    
    const clusterEndpoint = await this._getClusterEndpoint(projectId, clusterLocation, clusterName, accessToken);
    const clusterCaCertificate = await this._getClusterCaCertificate(projectId, clusterLocation, clusterName, accessToken);
    
    if (!clusterEndpoint || !clusterCaCertificate) {
      this.logger.error('Failed to get GKE cluster endpoint or CA certificate for Kubernetes client.');
      throw new Error('Failed to get GKE cluster endpoint or CA certificate for Kubernetes client.');
    }
    
    this.kc.loadFromOptions({
      clusters: [{ name: 'gke-cluster', server: `https://${clusterEndpoint}`, caData: clusterCaCertificate, skipTLSVerify: false }],
      users: [{ name: 'gcp-user', token: accessToken }],
      contexts: [{ name: 'gke-context', cluster: 'gke-cluster', user: 'gcp-user' }],
      currentContext: 'gke-context'
    });
    
    this.k8sCoreV1Api = this.kc.makeApiClient(k8s.CoreV1Api);
    this.k8sAppsV1Api = this.kc.makeApiClient(k8s.AppsV1Api);
    this.k8sNetworkingV1Api = this.kc.makeApiClient(k8s.NetworkingV1Api);
    
    this.logger.info('Kubernetes API clients created successfully.');
    
    await this.k8sCoreV1Api.listNamespace(); // Test connection
    this.logger.info('Successfully connected to Kubernetes cluster and listed namespaces.');
  }

  async _getClusterEndpoint(projectId, location, clusterName, accessToken) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'container.googleapis.com',
        path: `/v1/projects/${projectId}/locations/${location}/clusters/${clusterName}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try { resolve(JSON.parse(data).endpoint); } catch (e) { reject(e); }
          } else { reject(new Error(`Failed to get cluster endpoint: ${res.statusCode}`)); }
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  async _getClusterCaCertificate(projectId, location, clusterName, accessToken) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'container.googleapis.com',
        path: `/v1/projects/${projectId}/locations/${location}/clusters/${clusterName}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try { resolve(JSON.parse(data).masterAuth.clusterCaCertificate); } catch (e) { reject(e); }
          } else { reject(new Error(`Failed to get cluster CA certificate: ${res.statusCode}`)); }
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  _buildPodTemplate(sessionId, options) {
    const podName = `gam-session-${sessionId}`;
    return {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: { name: podName, namespace: this.namespace, labels: { app: 'gamgui', component: 'gam-session', session_id: sessionId }},
      spec: {
        serviceAccountName: this.config.kubernetes.serviceAccount,
        containers: [{
            name: 'gam',
            image: this.config.docker.gamImage,
            command: ['/bin/bash', '-c'],
            args: [ `echo "Starting GAM session ${sessionId}..."; mkdir -p /root/.gam; cat > /root/.gam/gam.cfg << 'GAMCFG'\n[DEFAULT]\ncustomer_id = my_customer\ndomain = automatearmy.com\noauth2_txt = /root/.gam/oauth2.txt\noauth2service_json = /root/.gam/oauth2service.json\nclient_secrets_json = /root/.gam/client_secrets.json\nGAMCFG\ncp /root/.gam/credentials/oauth2.txt /root/.gam/oauth2.txt; cp /root/.gam/credentials/oauth2service.json /root/.gam/oauth2service.json; cp /root/.gam/credentials/client_secrets.json /root/.gam/client_secrets.json; chmod 600 /root/.gam/oauth2.txt /root/.gam/oauth2service.json /root/.gam/client_secrets.json; echo "Testing GAM command: info domain"; /gam/gam7/gam info domain || echo "Command failed"; echo "Starting HTTP server on port 8080..."; cd /gam; python3 -m http.server 8080 & echo "GAM session is ready. Waiting for commands..."; while true; do sleep 30; done` ],
            workingDir: '/gam',
            ports: [{ containerPort: 8080, name: 'http' }, { containerPort: 8081, name: 'websocket' }],
            env: [{ name: 'GAM_CONFIG_DIR', value: '/root/.gam' }, { name: 'SESSION_ID', value: sessionId }],
            resources: { limits: { cpu: options.cpu || '500m', memory: options.memory || '512Mi' }, requests: { cpu: options.cpu || '250m', memory: options.memory || '256Mi' }},
            volumeMounts: [{ name: 'gam-credentials', mountPath: '/root/.gam/credentials', readOnly: true }, { name: 'gam-uploads', mountPath: '/gam/uploads' }]
        }],
        volumes: [{ name: 'gam-credentials', secret: { secretName: options.credentialsSecret || 'gam-credentials' } }, { name: 'gam-uploads', emptyDir: {} }]
      }
    };
  }

  _buildServiceSpec(sessionId, serviceName) {
     return {
      apiVersion: 'v1', kind: 'Service',
      metadata: { name: serviceName, namespace: this.namespace, labels: { app: 'gamgui', component: 'gam-session', session_id: sessionId }},
      spec: { selector: { app: 'gamgui', component: 'gam-session', session_id: sessionId }, ports: [{ port: 80, targetPort: 8080, name: 'http' }, { port: 8081, targetPort: 8081, name: 'websocket' }]}
    };
  }

  async _createPod(sessionId, options = {}) { /* ... same as before ... */ }
  async _deletePod(sessionId) { /* ... same as before ... */ }
  async _createService(sessionId) { /* ... same as before ... */ }
  async _deleteService(sessionId) { /* ... same as before ... */ }

  async executeCommand(sessionId, command) {
    if (!this.isInitialized || !this.kc) throw new ContainerError('KubernetesAdapter not initialized.');
    const podName = `gam-session-${sessionId}`;
    this.logger.info(`[${sessionId}] K8S EXEC: ${command}`);
    try {
      const exec = new k8s.Exec(this.kc);
      return new Promise((resolve, reject) => {
        let stdout = ''; let stderr = '';
        const commandArray = ['/bin/bash', '-c', command];
        
        // Create PassThrough streams for stdout and stderr
        const stdoutStream = new PassThrough();
        const stderrStream = new PassThrough();
        
        // Add data event handlers to the streams
        stdoutStream.on('data', (chunk) => {
          try {
            const data = chunk.toString();
            stdout += data;
            this.logger.debug(`[${sessionId}] STDOUT: ${data}`);
          } catch (err) {
            this.logger.error(`[${sessionId}] Error processing stdout: ${err.message}`);
          }
        });
        
        stderrStream.on('data', (chunk) => {
          try {
            const data = chunk.toString();
            stderr += data;
            this.logger.error(`[${sessionId}] STDERR: ${data}`);
          } catch (err) {
            this.logger.error(`[${sessionId}] Error processing stderr: ${err.message}`);
          }
        });
        
        // Add error handlers to the streams
        stdoutStream.on('error', (err) => {
          this.logger.error(`[${sessionId}] STDOUT stream error: ${err.message}`);
        });
        
        stderrStream.on('error', (err) => {
          this.logger.error(`[${sessionId}] STDERR stream error: ${err.message}`);
        });
        
        const ws = exec.exec(this.namespace, podName, 'gam', commandArray, stdoutStream, stderrStream, null, false, (status) => {
          try {
            if (status.status === 'Success') {
              // Ensure streams are properly ended
              stdoutStream.end();
              stderrStream.end();
              resolve({ stdout, stderr });
            } else {
              reject(new ContainerError(status.message || `Exec failed: ${status.status}`, { command, podName, status, stderr }));
            }
          } catch (err) {
            this.logger.error(`[${sessionId}] Error in exec status callback: ${err.message}`);
            reject(new ContainerError(`Error in exec status callback: ${err.message}`, { cause: err }));
          }
        });
        
        if (ws) {
          ws.on('error', (err) => {
            this.logger.error(`[${sessionId}] Exec WebSocket error: ${err.message}`);
            // Try to end streams on error
            try { stdoutStream.end(); } catch (e) {}
            try { stderrStream.end(); } catch (e) {}
            reject(new ContainerError(`Exec WebSocket error: ${err.message}`, { cause: err }));
          });
          
          ws.on('close', (code, reason) => {
            this.logger.warn(`[${sessionId}] Exec WebSocket closed. Code: ${code}, Reason: ${reason}`);
            // Try to end streams on close if they haven't been ended already
            try { stdoutStream.end(); } catch (e) {}
            try { stderrStream.end(); } catch (e) {}
          });
        } else { 
          this.logger.warn(`[${sessionId}] Failed to get WebSocket from exec.exec for command.`); 
          reject(new ContainerError('Failed to get WebSocket from exec.exec for command.'));
        }
      });
    } catch (error) {
      this.logger.error(`[${sessionId}] Error in executeCommand: ${error.message}`, error);
      throw new ContainerError(`Error in executeCommand: ${error.message}`, { cause: error });
    }
  }

  _extractCallbackOptions(options, prefix, sessionId) { /* ... same as before ... */ }
  _handleExecStatus(status, sessionId, prefix, onClose) { /* ... same as before ... */ }
  _handleExecError(error, sessionId, command, onError) { /* ... same as before ... */ }
  
  /**
   * Execute a shell command in the container
   * @param {string} sessionId - Session ID
   * @param {string} command - Shell command to execute
   * @param {Object} options - Options for command execution
   * @param {Function} options.onStdout - Callback for stdout data
   * @param {Function} options.onStderr - Callback for stderr data
   * @param {Function} options.onClose - Callback for command completion
   * @param {Function} options.onError - Callback for errors
   * @param {number} options.timeout - Timeout in milliseconds (default: 60000)
   * @param {boolean} options.sanitize - Whether to sanitize the command (default: true)
   * @returns {Object} - Execution result
   * @throws {ContainerError} - If the command execution fails
   */
  executeShellCommand(sessionId, command, options = {}) {
    if (!this.isInitialized || !this.kc) throw new ContainerError('KubernetesAdapter not initialized for shell command.');
    
    // Extract options with defaults
    const { 
      onStdout, 
      onStderr, 
      onClose, 
      onError 
    } = this._extractCallbackOptions(options, 'Shell', sessionId);
    
    const timeout = options.timeout || 60000; // Default timeout: 60 seconds
    const sanitize = options.sanitize !== false; // Default: true
    
    const podName = `gam-session-${sessionId}`;
    this.logger.debug(`Executing shell command in pod ${podName}: ${command}`);
    
    try {
      // Sanitize command if required
      const finalCommand = sanitize ? this._sanitizeCommand(command) : command;
      
      const exec = new k8s.Exec(this.kc);
      const commandArray = ['/bin/bash', '-c', finalCommand];
      
      // Create PassThrough streams for stdout and stderr
      const stdoutStream = new PassThrough();
      const stderrStream = new PassThrough();
      
      // Add data event handlers to the streams
      stdoutStream.on('data', (chunk) => onStdout(chunk));
      stderrStream.on('data', (chunk) => onStderr(chunk));
      
      // Set up timeout
      let timeoutId = null;
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          this.logger.warn(`[${sessionId}] Shell command timed out after ${timeout}ms: ${command}`);
          onError(new ContainerError(`Command timed out after ${timeout}ms`, { command, timeout }));
          // Note: We don't close the WebSocket here as it might be handled elsewhere
        }, timeout);
      }
      
      const ws = exec.exec(this.namespace, podName, 'gam', commandArray, stdoutStream, stderrStream, null, false, 
        (status) => {
          // Clear timeout if it exists
          if (timeoutId) clearTimeout(timeoutId);
          
          this._handleExecStatus(status, sessionId, 'Shell', onClose);
        });
      
      if (ws) {
        ws.on('error', (err) => {
          if (timeoutId) clearTimeout(timeoutId);
          onError(new ContainerError(`Shell Exec WebSocket error: ${err.message}`, { cause: err }));
        });
        
        ws.on('close', (code, reason) => {
          if (timeoutId) clearTimeout(timeoutId);
          this.logger.warn(`[${sessionId}] Shell Exec WebSocket closed. Code: ${code}, Reason: ${reason}`);
        });
      } else { 
        if (timeoutId) clearTimeout(timeoutId);
        this.logger.warn(`[${sessionId}] Failed to get WebSocket from exec.exec for shell command.`); 
      }
      
      return { kubernetes: true };
    } catch (error) {
      this._handleExecError(error, sessionId, command, onError);
    }
  }
  
  /**
   * Sanitize a shell command to prevent dangerous operations
   * @private
   * @param {string} command - Command to sanitize
   * @returns {string} - Sanitized command
   * @throws {ContainerError} - If the command contains prohibited operations
   */
  _sanitizeCommand(command) {
    // List of dangerous commands or patterns
    const blacklist = [
      'rm -rf /', 
      'rm -rf /*',
      'mkfs',
      '> /dev/sda',
      ':(){ :|:& };:', // Fork bomb
      'dd if=/dev/random',
      'dd if=/dev/zero',
      'chmod -R 777 /',
      'chmod -R 000 /',
      'shutdown',
      'reboot',
      'halt',
      'poweroff',
      'init 0',
      'init 6'
    ];
    
    // Check if command contains any blacklisted pattern
    for (const pattern of blacklist) {
      if (command.includes(pattern)) {
        throw new ContainerError(`Command contains prohibited operation: ${pattern}`, { command });
      }
    }
    
    return command;
  }
  
  /**
   * Upload file content to the container
   * @param {string} sessionId - Session ID
   * @param {string} content - File content
   * @param {string} containerFilePath - Path in the container
   * @returns {Promise<void>}
   * @throws {ContainerError} - If the upload fails
   */
  async uploadFileContent(sessionId, content, containerFilePath) {
    if (!this.isInitialized || !this.kc) throw new ContainerError('KubernetesAdapter not initialized for upload.');
    const podName = `gam-session-${sessionId}`;
    this.logger.debug(`Uploading content to ${podName}:${containerFilePath}`);
    
    try {
      // Create a temporary file
      const tempFile = path.join(os.tmpdir(), `upload-${sessionId}-${crypto.randomBytes(8).toString('hex')}`);
      fs.writeFileSync(tempFile, content);
      
      // Upload the file
      await this.uploadFile(sessionId, tempFile, containerFilePath);
      
      // Clean up the temporary file
      fs.unlinkSync(tempFile);
    } catch (error) {
      throw new ContainerError(`Error uploading file content: ${error.message}`, { cause: error });
    }
  }
  
  /**
   * Upload and execute a script
   * @param {string} sessionId - Session ID
   * @param {string} scriptContent - Script content
   * @param {Object} options - Options for script execution
   * @returns {Promise<Object>} - Execution result
   * @throws {ContainerError} - If the script execution fails
   */
  async uploadAndExecuteScript(sessionId, scriptContent, options = {}) {
    if (!this.isInitialized || !this.kc) throw new ContainerError('KubernetesAdapter not initialized for script execution.');
    
    // Generate a unique temporary path for the script
    const scriptName = `script-${sessionId}-${Date.now()}.sh`;
    const tempPath = `/tmp/${scriptName}`;
    
    try {
      // 1. Upload the script content
      await this.uploadFileContent(sessionId, scriptContent, tempPath);
      
      // 2. Make the script executable
      await this.executeCommand(sessionId, `chmod +x ${tempPath}`);
      
      // 3. Execute the script
      const result = await new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        
        this.executeShellCommand(
          sessionId, 
          `bash ${tempPath}`,
          {
            ...options,
            onStdout: (data) => {
              const text = data.toString();
              stdout += text;
              if (options.onStdout) options.onStdout(data);
            },
            onStderr: (data) => {
              const text = data.toString();
              stderr += text;
              if (options.onStderr) options.onStderr(data);
            },
            onClose: () => {
              resolve({ stdout, stderr });
              if (options.onClose) options.onClose();
            },
            onError: (error) => {
              reject(error);
              if (options.onError) options.onError(error);
            }
          }
        );
      });
      
      // 4. Clean up the temporary script
      await this.executeCommand(sessionId, `rm ${tempPath}`).catch(err => {
        this.logger.warn(`Failed to remove temporary script ${tempPath}: ${err.message}`);
      });
      
      return result;
    } catch (error) {
      // Try to clean up even if execution failed
      this.executeCommand(sessionId, `rm ${tempPath}`).catch(() => {});
      
      throw new ContainerError(`Script execution failed: ${error.message}`, { cause: error });
    }
  }
  
  /**
   * Verify the deployed version of the container
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} - Version information
   */
  async verifyDeployedVersion(sessionId) {
    try {
      // Try multiple commands to get version information
      const versionCommand = 'cat /app/VERSION 2>/dev/null || echo $APP_VERSION 2>/dev/null || cat /etc/os-release 2>/dev/null || echo "unknown"';
      
      const result = await this.executeCommand(sessionId, versionCommand);
      
      // Get image ID from container
      const imageIdCommand = 'cat /proc/self/cgroup | grep "docker" | sed "s/.*\\///" | head -n 1 || echo "unknown"';
      const imageIdResult = await this.executeCommand(sessionId, imageIdCommand);
      
      return {
        version: result.stdout.trim(),
        imageId: imageIdResult.stdout.trim(),
        timestamp: new Date().toISOString(),
        verified: true,
        podName: `gam-session-${sessionId}`
      };
    } catch (error) {
      this.logger.error(`Failed to verify version: ${error.message}`);
      return {
        version: "unknown",
        imageId: "unknown",
        timestamp: new Date().toISOString(),
        verified: false,
        error: error.message,
        podName: `gam-session-${sessionId}`
      };
    }
  }
  
  executeGamCommand(sessionId, command, options = {}) {
    if (!this.isInitialized || !this.kc) throw new ContainerError('KubernetesAdapter not initialized for GAM command.');
    const { onStdout, onStderr, onClose, onError } = this._extractCallbackOptions(options, 'GAM', sessionId);
    const podName = `gam-session-${sessionId}`;
    this.logger.debug(`Executing GAM command in pod ${podName}: ${command}`);
    try {
      const exec = new k8s.Exec(this.kc);
      const commandArray = ['/gam/gam7/gam', ...command.split(' ')];
      
      // Create PassThrough streams for stdout and stderr
      const stdoutStream = new PassThrough();
      const stderrStream = new PassThrough();
      
      // Add data event handlers to the streams
      stdoutStream.on('data', (chunk) => onStdout(chunk));
      stderrStream.on('data', (chunk) => onStderr(chunk));
      
      const ws = exec.exec(this.namespace, podName, 'gam', commandArray, stdoutStream, stderrStream, null, false, 
        (status) => this._handleExecStatus(status, sessionId, 'GAM', onClose));
      if (ws) {
        ws.on('error', (err) => onError(new ContainerError(`GAM Exec WebSocket error: ${err.message}`, { cause: err })));
        ws.on('close', (code, reason) => this.logger.warn(`[${sessionId}] GAM Exec WebSocket closed. Code: ${code}, Reason: ${reason}`));
      } else { this.logger.warn(`[${sessionId}] Failed to get WebSocket from exec.exec for GAM command.`); }
      return { kubernetes: true };
    } catch (error) {
      this._handleExecError(error, sessionId, command, onError);
    }
  }

  executeBashScript(sessionId, scriptPath, options = {}) {
    if (!this.isInitialized || !this.kc) throw new ContainerError('KubernetesAdapter not initialized for Bash script.');
    const { onStdout, onStderr, onClose, onError } = this._extractCallbackOptions(options, 'Bash', sessionId);
    const podName = `gam-session-${sessionId}`;
    this.logger.debug(`Executing bash script in pod ${podName}: ${scriptPath}`);
    
    try {
      // Determine if the script path is absolute or relative
      const isAbsolutePath = scriptPath.startsWith('/');
      
      // If it's an absolute path, extract the directory and filename
      let scriptDir = '/gam';
      let scriptName = scriptPath;
      
      if (isAbsolutePath) {
        scriptDir = path.dirname(scriptPath);
        scriptName = path.basename(scriptPath);
      }
      
      // Log the resolved paths for debugging
      this.logger.debug(`Script directory: ${scriptDir}, Script name: ${scriptName}`);
      
      // First change to the directory containing the script
      this._executeChangeDirectoryCommand(sessionId, scriptDir, onStdout, onStderr)
        .then(() => this._executeChmodCommand(sessionId, scriptName, onStdout, onStderr))
        .then(() => this._executeScriptCommand(sessionId, scriptName, onStdout, onStderr, onClose, onError))
        .catch((error) => {
          this.logger.warn(`Failed to execute script ${scriptPath}: ${error.message}.`);
          onError(error); // Propagate error
        });
      
      return { kubernetes: true };
    } catch (error) {
      this._handleExecError(error, sessionId, scriptPath, onError);
    }
  }

  _executeChangeDirectoryCommand(sessionId, scriptDir, onStdout, onStderr) {
    if (!this.isInitialized || !this.kc) return Promise.reject(new ContainerError('KubernetesAdapter not initialized for cd.'));
    const podName = `gam-session-${sessionId}`;
    return new Promise((resolve, reject) => {
      try {
        const exec = new k8s.Exec(this.kc);
        const escapedScriptDir = scriptDir.replace(/"/g, '\\"');
        const commandArray = ['/bin/bash', '-c', `cd "${escapedScriptDir}" && pwd`];
        const cdStdout = (data) => onStdout(`[cd] ${data.toString()}`);
        const cdStderr = (data) => onStderr(`[cd] ${data.toString()}`);
        
        // Create PassThrough streams for stdout and stderr
        const stdoutStream = new PassThrough();
        const stderrStream = new PassThrough();
        
        // Add data event handlers to the streams
        stdoutStream.on('data', (chunk) => cdStdout(chunk));
        stderrStream.on('data', (chunk) => cdStderr(chunk));
        
        const ws = exec.exec(this.namespace, podName, 'gam', commandArray, stdoutStream, stderrStream, null, false, (status) => {
          if (status.status === 'Success') resolve();
          else reject(new Error(`cd command failed: ${status.message || status.status}`));
        });
        if (ws) {
          ws.on('error', (err) => reject(new ContainerError(`cd Exec WebSocket error: ${err.message}`, { cause: err })));
        } else { reject(new ContainerError('Failed to get WebSocket from exec.exec for cd.')); }
      } catch (error) { reject(error); }
    });
  }

  _executeChmodCommand(sessionId, scriptName, onStdout, onStderr) {
    if (!this.isInitialized || !this.kc) return Promise.reject(new ContainerError('KubernetesAdapter not initialized for chmod.'));
    const podName = `gam-session-${sessionId}`;
    return new Promise((resolve, reject) => {
      try {
        const exec = new k8s.Exec(this.kc);
        const escapedScriptName = scriptName.replace(/"/g, '\\"');
        const commandArray = ['/bin/bash', '-c', `chmod +x "${escapedScriptName}"`];
        const chmodStdout = (data) => onStdout(`[chmod] ${data.toString()}`);
        const chmodStderr = (data) => onStderr(`[chmod] ${data.toString()}`);
        
        // Create PassThrough streams for stdout and stderr
        const stdoutStream = new PassThrough();
        const stderrStream = new PassThrough();
        
        // Add data event handlers to the streams
        stdoutStream.on('data', (chunk) => chmodStdout(chunk));
        stderrStream.on('data', (chunk) => chmodStderr(chunk));
        
        const ws = exec.exec(this.namespace, podName, 'gam', commandArray, stdoutStream, stderrStream, null, false, (status) => {
          if (status.status === 'Success') resolve();
          else reject(new Error(`chmod command failed: ${status.message || status.status}`));
        });
        if (ws) {
          ws.on('error', (err) => reject(new ContainerError(`chmod Exec WebSocket error: ${err.message}`, { cause: err })));
        } else { reject(new ContainerError('Failed to get WebSocket from exec.exec for chmod.')); }
      } catch (error) { reject(error); }
    });
  }

  _executeScriptCommand(sessionId, scriptName, onStdout, onStderr, onClose, onError) {
    if (!this.isInitialized || !this.kc) { onError(new ContainerError('KubernetesAdapter not initialized for script exec.')); return; }
    const podName = `gam-session-${sessionId}`;
    try {
      const exec = new k8s.Exec(this.kc);
      const escapedScriptName = scriptName.replace(/"/g, '\\"');
      const commandArray = ['/bin/bash', '-c', `bash "${escapedScriptName}"`];
      
      // Create PassThrough streams for stdout and stderr
      const stdoutStream = new PassThrough();
      const stderrStream = new PassThrough();
      
      // Add data event handlers to the streams
      stdoutStream.on('data', (chunk) => onStdout(chunk));
      stderrStream.on('data', (chunk) => onStderr(chunk));
      
      const ws = exec.exec(this.namespace, podName, 'gam', commandArray, stdoutStream, stderrStream, null, false, 
        (status) => this._handleExecStatus(status, sessionId, 'Bash', onClose));
      if (ws) {
        ws.on('error', (err) => onError(new ContainerError(`Script Exec WebSocket error: ${err.message}`, { cause: err })));
      } else { onError(new ContainerError('Failed to get WebSocket from exec.exec for script.')); }
    } catch (error) {
      this._handleExecError(error, sessionId, scriptName, onError);
    }
  }
  
  async createContainer(sessionId, options = {}) { /* ... same as before, ensure this.isInitialized is checked or init awaited ... */ }
  async deleteContainer(sessionId) { /* ... same as before ... */ }

  async uploadFile(sessionId, localFilePath, containerFilePath) {
    if (!this.isInitialized || !this.kc) throw new ContainerError('KubernetesAdapter not initialized for upload.');
    const podName = `gam-session-${sessionId}`;
    this.logger.debug(`Uploading ${localFilePath} to ${podName}:${containerFilePath}`);
    try {
      const command = ['cp', '/dev/stdin', containerFilePath];
      const exec = new k8s.Exec(this.kc);
      const uploadStdoutCb = (data) => this.logger.debug(`[Upload ${sessionId}] stdout: ${data.toString()}`);
      const uploadStderrCb = (data) => this.logger.error(`[Upload ${sessionId}] stderr: ${data.toString()}`);
      
      // Create PassThrough streams for stdout and stderr
      const stdoutStream = new PassThrough();
      const stderrStream = new PassThrough();
      
      // Add data event handlers to the streams
      stdoutStream.on('data', (chunk) => uploadStdoutCb(chunk));
      stderrStream.on('data', (chunk) => uploadStderrCb(chunk));
      
      const ws = exec.exec(this.namespace, podName, 'gam', command, stdoutStream, stderrStream, fs.createReadStream(localFilePath), false, 
        (status) => {
          if (status.status !== 'Success') this.logger.error(`Upload failed for session ${sessionId}:`, status);
          else this.logger.info(`Upload status success for ${localFilePath}`);
        });
      await new Promise((resolve, reject) => {
        if (!ws) { reject(new ContainerError("Failed to establish WebSocket for upload exec.")); return; }
        ws.on('error', (err) => reject(new ContainerError(`Upload WebSocket error: ${err.message}`, { cause: err })));
        ws.on('close', () => resolve()); // Resolve on close, status callback handles actual success/failure logging
      });
    } catch (error) {
      throw new ContainerError(`Error uploading file: ${error.message}`, { cause: error });
    }
  }

  async downloadFile(sessionId, containerFilePath, localFilePath) {
    if (!this.isInitialized || !this.kc) throw new ContainerError('KubernetesAdapter not initialized for download.');
    const podName = `gam-session-${sessionId}`;
    this.logger.debug(`Downloading ${podName}:${containerFilePath} to ${localFilePath}`);
    try {
      const command = ['cat', containerFilePath];
      const exec = new k8s.Exec(this.kc);
      const writeStream = fs.createWriteStream(localFilePath);
      let commandFailed = false;
      const downloadStdoutCb = (data) => writeStream.write(data);
      const downloadStderrCb = (data) => this.logger.error(`[Download ${sessionId}] stderr: ${data.toString()}`);
      
      // Create PassThrough streams for stdout and stderr
      const stdoutStream = new PassThrough();
      const stderrStream = new PassThrough();
      
      // Add data event handlers to the streams
      stdoutStream.on('data', (chunk) => downloadStdoutCb(chunk));
      stderrStream.on('data', (chunk) => downloadStderrCb(chunk));
      
      const ws = exec.exec(this.namespace, podName, 'gam', command, stdoutStream, stderrStream, null, false, 
        (status) => {
          if (status.status !== 'Success') {
            this.logger.error(`Download failed for session ${sessionId}:`, status);
            commandFailed = true; try { fs.unlinkSync(localFilePath); } catch (e) {/*ignore*/}
          } else {
            this.logger.info(`Download exec status success for ${podName}:${containerFilePath}`);
          }
        });
      await new Promise((resolve, reject) => {
        if (!ws) { try {fs.unlinkSync(localFilePath);} catch(e){} reject(new ContainerError("Failed to establish WebSocket for download exec.")); return; }
        ws.on('error', (err) => { try {fs.unlinkSync(localFilePath);} catch(e){} reject(new ContainerError(`Download WebSocket error: ${err.message}`, { cause: err })); });
        ws.on('close', () => writeStream.end(() => {
          if (commandFailed) reject(new ContainerError(`Download command failed for ${sessionId}.`));
          else resolve();
        }));
        writeStream.on('error', (err) => { try {fs.unlinkSync(localFilePath);} catch(e){} if(ws && ws.readyState === ws.OPEN) ws.close(); reject(new ContainerError(`File write error: ${err.message}`,{cause:err}));});
      });
    } catch (error) {
      throw new ContainerError(`Error downloading file: ${error.message}`, { cause: error });
    }
  }

  async getStatus(sessionId) { /* ... same as before ... */ }
  getWebsocketPath(sessionId) { /* ... same as before ... */ }
}

module.exports = KubernetesAdapter;
