/**
 * Kubernetes implementation of ContainerService
 * Provides container operations using Kubernetes API
 */
const k8s = require('@kubernetes/client-node');
const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');
const ContainerService = require('../ContainerService');
const { ContainerError } = require('../../../utils/errorHandler');
const https = require('https');

/**
 * Kubernetes implementation of ContainerService
 * @extends ContainerService
 */
class KubernetesAdapter extends ContainerService {
  /**
   * Create a new KubernetesAdapter
   * @param {import('../../config/config')} config - Configuration
   * @param {import('../../utils/logger')} logger - Logger instance
   * @param {import('../KubernetesWebSocketAdapter')} [websocketAdapter=null] - WebSocket adapter
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
    try {
      this._initializeK8sClientSync();
      this.logger.info('Kubernetes client inicializado com sucesso no construtor');
    } catch (error) {
      this.logger.error('Erro ao inicializar Kubernetes client no construtor:', error);
      throw new ContainerError('Falha na inicialização do Kubernetes client', { cause: error });
    }
  }

  /**
   * Initialize Kubernetes client using GCP authentication (synchronous version)
   * @private
   */
  async _initializeK8sClientSync() {
    this.logger.info('Inicializando Kubernetes client de forma síncrona');
    this.kc = new k8s.KubeConfig();
    
    // Get GKE cluster info from environment variables
    const clusterName = process.env.GKE_CLUSTER_NAME;
    const clusterLocation = process.env.GKE_CLUSTER_LOCATION;
    const projectId = process.env.PROJECT_ID;
    
    if (!clusterName || !clusterLocation || !projectId) {
      this.logger.error('Missing required environment variables for GKE cluster');
      this.logger.error(`GKE_CLUSTER_NAME: ${clusterName || 'não definido'}`);
      this.logger.error(`GKE_CLUSTER_LOCATION: ${clusterLocation || 'não definido'}`);
      this.logger.error(`PROJECT_ID: ${projectId || 'não definido'}`);
      throw new Error('Missing required environment variables for GKE cluster');
    }
    
    this.logger.info(`Inicializando Kubernetes client para cluster GKE ${clusterName} em ${clusterLocation} (projeto: ${projectId})`);
    
    // Implementar retry com backoff exponencial
    const maxRetries = 3;
    let retryCount = 0;
    let lastError = null;
    
    while (retryCount < maxRetries) {
      try {
        // Get GCP access token using GoogleAuth
        const auth = new GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        
        this.logger.debug(`Tentativa ${retryCount + 1}/${maxRetries}: Obtendo cliente de autenticação GCP...`);
        const client = await auth.getClient();
        
        this.logger.debug(`Tentativa ${retryCount + 1}/${maxRetries}: Solicitando token de acesso...`);
        const tokenResponse = await client.getAccessToken();
        
        if (!tokenResponse || !tokenResponse.token) {
          throw new Error('Failed to get GCP access token: Token not returned');
        }
        
        const accessToken = tokenResponse.token;
        const expiryTime = tokenResponse.expiryTime ? new Date(tokenResponse.expiryTime).toISOString() : 'Unknown';
        this.logger.info(`Token de acesso GCP obtido com sucesso. Expira em: ${expiryTime}`);
        
        // Get cluster endpoint using the GCP API
        this.logger.debug(`Tentativa ${retryCount + 1}/${maxRetries}: Obtendo endpoint do cluster...`);
        const clusterEndpoint = await this._getClusterEndpoint(projectId, clusterLocation, clusterName, accessToken);
        
        this.logger.debug(`Tentativa ${retryCount + 1}/${maxRetries}: Obtendo certificado CA do cluster...`);
        const clusterCaCertificate = await this._getClusterCaCertificate(projectId, clusterLocation, clusterName, accessToken);
        
        if (!clusterEndpoint || !clusterCaCertificate) {
          throw new Error('Failed to get GKE cluster endpoint or CA certificate');
        }
        
        // Configure KubeConfig manually
        this.logger.debug(`Configurando KubeConfig para cluster ${clusterName}...`);
        this.kc.loadFromOptions({
          clusters: [{
            name: 'gke-cluster',
            server: `https://${clusterEndpoint}`,
            caData: clusterCaCertificate,
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
        this.logger.debug('Criando clientes de API Kubernetes...');
        this.k8sCoreV1Api = this.kc.makeApiClient(k8s.CoreV1Api);
        this.k8sAppsV1Api = this.kc.makeApiClient(k8s.AppsV1Api);
        this.k8sNetworkingV1Api = this.kc.makeApiClient(k8s.NetworkingV1Api);
        
        this.logger.info('Kubernetes API clients criados com sucesso');
        
        // Test connection
        this.logger.debug('Testando conexão com o cluster Kubernetes...');
        const namespaces = await this.k8sCoreV1Api.listNamespace();
        this.logger.info(`Conectado com sucesso ao cluster Kubernetes. Encontrados ${namespaces.body.items.length} namespaces.`);
        
        // Verificar permissões no namespace
        const namespace = process.env.K8S_NAMESPACE || 'gamgui';
        try {
          this.logger.debug(`Verificando acesso ao namespace ${namespace}...`);
          await this.k8sCoreV1Api.readNamespace(namespace);
          this.logger.info(`Namespace ${namespace} encontrado e acessível.`);
          
          // Tentar listar pods no namespace para verificar permissões
          this.logger.debug(`Verificando permissões para listar pods no namespace ${namespace}...`);
          await this.k8sCoreV1Api.listNamespacedPod(namespace);
          this.logger.info(`Permissões para listar pods no namespace ${namespace} verificadas com sucesso.`);
        } catch (namespaceError) {
          this.logger.warn(`Aviso: Problema ao acessar o namespace ${namespace}: ${namespaceError.message}`);
          if (namespaceError.response && namespaceError.response.statusCode === 403) {
            this.logger.error(`Erro de permissão (403 Forbidden) ao acessar o namespace ${namespace}.`);
            this.logger.error('A conta de serviço do Cloud Run pode não ter permissões suficientes no namespace.');
            this.logger.error('Execute o script fix-kubernetes-permissions.sh para corrigir as permissões.');
          }
          // Não lançar erro aqui, apenas registrar o aviso
        }
        
        // Se chegou até aqui, a inicialização foi bem-sucedida
        return;
      } catch (error) {
        lastError = error;
        retryCount++;
        
        if (retryCount < maxRetries) {
          // Backoff exponencial: 1s, 2s, 4s, etc.
          const backoffTime = Math.pow(2, retryCount - 1) * 1000;
          this.logger.warn(`Tentativa ${retryCount}/${maxRetries} falhou: ${error.message}. Tentando novamente em ${backoffTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        } else {
          this.logger.error(`Todas as ${maxRetries} tentativas de inicialização do cliente Kubernetes falharam.`);
        }
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    this.logger.error('Falha ao inicializar cliente Kubernetes após várias tentativas:', lastError);
    throw new ContainerError('Falha na inicialização do Kubernetes client após várias tentativas', { 
      cause: lastError,
      retries: maxRetries
    });
  }

  /**
   * Get GKE cluster endpoint using the GCP API
   * @private
   * @param {string} projectId - GCP project ID
   * @param {string} location - GKE cluster location
   * @param {string} clusterName - GKE cluster name
   * @param {string} accessToken - GCP access token
   * @returns {Promise<string>} - GKE cluster endpoint
   */
  async _getClusterEndpoint(projectId, location, clusterName, accessToken) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'container.googleapis.com',
        path: `/v1/projects/${projectId}/locations/${location}/clusters/${clusterName}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const clusterInfo = JSON.parse(data);
              this.logger.info(`Cluster endpoint: ${clusterInfo.endpoint}`);
              resolve(clusterInfo.endpoint);
            } catch (error) {
              this.logger.error('Error parsing cluster info:', error);
              reject(error);
            }
          } else {
            this.logger.error(`Failed to get cluster info: ${res.statusCode} ${res.statusMessage}`);
            reject(new Error(`Failed to get cluster info: ${res.statusCode} ${res.statusMessage}`));
          }
        });
      });

      req.on('error', (error) => {
        this.logger.error('Error getting cluster info:', error);
        reject(error);
      });

      req.end();
    });
  }

  /**
   * Get GKE cluster CA certificate using the GCP API
   * @private
   * @param {string} projectId - GCP project ID
   * @param {string} location - GKE cluster location
   * @param {string} clusterName - GKE cluster name
   * @param {string} accessToken - GCP access token
   * @returns {Promise<string>} - GKE cluster CA certificate
   */
  async _getClusterCaCertificate(projectId, location, clusterName, accessToken) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'container.googleapis.com',
        path: `/v1/projects/${projectId}/locations/${location}/clusters/${clusterName}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const clusterInfo = JSON.parse(data);
              this.logger.info('Cluster CA certificate obtained');
              resolve(clusterInfo.masterAuth.clusterCaCertificate);
            } catch (error) {
              this.logger.error('Error parsing cluster info:', error);
              reject(error);
            }
          } else {
            this.logger.error(`Failed to get cluster info: ${res.statusCode} ${res.statusMessage}`);
            reject(new Error(`Failed to get cluster info: ${res.statusCode} ${res.statusMessage}`));
          }
        });
      });

      req.on('error', (error) => {
        this.logger.error('Error getting cluster info:', error);
        reject(error);
      });

      req.end();
    });
  }

  /**
   * Get GCP access token
   * @private
   * @returns {Promise<{token: string, expiryTime: Date}>} - GCP access token and expiry time
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
        const expiryTime = tokenResponse.expiryTime || new Date(Date.now() + 3600000); // Default 1 hour if not provided
        this.logger.info(`Successfully obtained GCP access token, expires at: ${expiryTime.toISOString()}`);
        this.logger.debug(`Token: ${tokenResponse.token.substring(0, 10)}...`);
        
        // Schedule token refresh 5 minutes before expiration
        this._scheduleTokenRefresh(expiryTime);
        
        return {
          token: tokenResponse.token,
          expiryTime: expiryTime
        };
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
   * Schedule token refresh before expiration
   * @private
   * @param {Date} expiryTime - Token expiry time
   */
  _scheduleTokenRefresh(expiryTime) {
    // Clear any existing refresh timer
    if (this._tokenRefreshTimer) {
      clearTimeout(this._tokenRefreshTimer);
      this._tokenRefreshTimer = null;
    }
    
    // Calculate time until refresh (5 minutes before expiration)
    const now = new Date();
    const refreshTime = new Date(expiryTime.getTime() - 5 * 60 * 1000); // 5 minutes before expiry
    const timeUntilRefresh = Math.max(0, refreshTime.getTime() - now.getTime());
    
    if (timeUntilRefresh <= 0) {
      // Token is already expired or about to expire, refresh immediately
      this.logger.warn('Token is already near expiration, refreshing immediately');
      this._refreshKubernetesToken().catch(err => {
        this.logger.error('Failed to refresh token immediately:', err);
      });
      return;
    }
    
    this.logger.info(`Scheduling token refresh in ${Math.floor(timeUntilRefresh / 60000)} minutes`);
    
    // Schedule the refresh
    this._tokenRefreshTimer = setTimeout(async () => {
      try {
        await this._refreshKubernetesToken();
        this.logger.info('Successfully refreshed Kubernetes token on schedule');
      } catch (error) {
        this.logger.error('Failed to refresh token on schedule:', error);
        // Try again in 1 minute if refresh failed
        setTimeout(() => this._refreshKubernetesToken().catch(e => this.logger.error('Retry failed:', e)), 60000);
      }
    }, timeUntilRefresh);
  }
  
  /**
   * Refresh Kubernetes token and update API clients
   * @private
   * @returns {Promise<string>} - The new token
   */
  async _refreshKubernetesToken() {
    this.logger.info('Refreshing Kubernetes token...');
    try {
      const tokenResponse = await this._getGcpAccessToken();
      const accessToken = tokenResponse.token;
      
      // Update the token in the KubeConfig
      if (this.kc && this.kc.users && this.kc.users.length > 0) {
        this.kc.users[0].token = accessToken;
        
        // Recreate API clients with the new token
        this.k8sCoreV1Api = this.kc.makeApiClient(k8s.CoreV1Api);
        this.k8sAppsV1Api = this.kc.makeApiClient(k8s.AppsV1Api);
        this.k8sNetworkingV1Api = this.kc.makeApiClient(k8s.NetworkingV1Api);
        
        this.logger.info('Successfully updated Kubernetes API clients with new token');
      } else {
        this.logger.warn('KubeConfig not properly initialized, cannot update token');
      }
      
      return accessToken;
    } catch (error) {
      this.logger.error('Error refreshing Kubernetes token:', error);
      throw error;
    }
  }
  
  /**
   * Execute a Kubernetes API call with automatic token refresh on 401 errors
   * @private
   * @param {Function} apiCall - Function that makes the Kubernetes API call
   * @returns {Promise<any>} - The result of the API call
   */
  async _withTokenRefresh(apiCall) {
    try {
      return await apiCall();
    } catch (error) {
      // Check if it's an authentication error (401 Unauthorized)
      if (error.response && error.response.statusCode === 401) {
        this.logger.warn('Received 401 Unauthorized, attempting to refresh token and retry...');
        try {
          await this._refreshKubernetesToken();
          // Retry the API call with the new token
          return await apiCall();
        } catch (refreshError) {
          this.logger.error('Failed to refresh token after 401:', refreshError);
          throw new ContainerError('Failed to refresh token after 401', { 
            cause: refreshError,
            originalError: error 
          });
        }
      }
      // Not an authentication error, rethrow
      throw error;
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
    // Consistent bucket name generation with SessionService
    const gcsBucketName = `gamgui-session-files-${sessionId}`;
    const gcsMountPath = '/gcs'; // Mount point inside containers

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
               cat > /root/.gam/gam.cfg << 'GAMCFG'
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
              // Mount the shared GCS volume instead of the old emptyDir
              { name: 'gcs-fuse-mount', mountPath: '/gam/uploads' } // Use the shared mount for uploads
            ]
          },
          // --- GCS FUSE Sidecar Container ---
          {
            name: 'gcsfuse-sidecar',
            image: 'gcr.io/cloud-storage-fuse-test/gcsfuse-ubuntu:latest', // Use appropriate image
            securityContext: {
              // GCS FUSE often requires privileged access or specific capabilities
              privileged: true,
              // Alternatively, specific capabilities might work, but require testing:
              // capabilities: {
              //   add: ["SYS_ADMIN"]
              // }
            },
            args: [
              "--implicit-dirs", // Recommended for compatibility
              "--foreground",    // Keep the process running in the foreground
              "--debug_gcs",     // Enable GCS interaction logging
              "--debug_fuse",    // Enable FUSE interaction logging
              // Mount the specific session bucket to the internal mount path
              gcsBucketName,
              gcsMountPath
            ],
            resources: { // Define resources for the sidecar
              limits: { cpu: "200m", memory: "256Mi" },
              requests: { cpu: "100m", memory: "128Mi" }
            },
            volumeMounts: [
              {
                name: 'gcs-fuse-mount', // Mount the shared volume
                mountPath: gcsMountPath,
                // Important for sharing the mount point correctly with the main container
                mountPropagation: 'Bidirectional'
              }
            ]
          }
          // --- End GCS FUSE Sidecar Container ---
        ],
        volumes: [
          { name: 'gam-credentials', secret: { secretName: options.credentialsSecret || 'gam-credentials' } },
          // Define the shared volume for GCS FUSE
          { name: 'gcs-fuse-mount', emptyDir: {} }
          // { name: 'gam-uploads', emptyDir: {} } // Remove the old emptyDir for uploads
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
      // Use _withTokenRefresh to handle token expiration
      const response = await this._withTokenRefresh(() => 
        this.k8sCoreV1Api.createNamespacedPod(this.namespace, podTemplate)
      );
      
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
      // Use _withTokenRefresh to handle token expiration
      const response = await this._withTokenRefresh(() => 
        this.k8sCoreV1Api.deleteNamespacedPod(podName, this.namespace)
      );
      
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
      // Use _withTokenRefresh to handle token expiration
      const existingService = await this._withTokenRefresh(() => 
        this.k8sCoreV1Api.readNamespacedService(serviceName, this.namespace)
      );
      
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
        // Use _withTokenRefresh to handle token expiration
        const response = await this._withTokenRefresh(() => 
          this.k8sCoreV1Api.createNamespacedService(this.namespace, serviceSpec)
        );
        
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
      // Use _withTokenRefresh to handle token expiration
      const response = await this._withTokenRefresh(() => 
        this.k8sCoreV1Api.deleteNamespacedService(serviceName, this.namespace)
      );
      
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
      const { Writable } = require('stream');
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
      // Use _withTokenRefresh to handle token expiration
      const response = await this._withTokenRefresh(() => 
        this.k8sCoreV1Api.readNamespacedPodStatus(podName, this.namespace)
      );
      
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
