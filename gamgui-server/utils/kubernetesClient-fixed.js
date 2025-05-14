/**
 * Kubernetes Client Utility
 *
 * This utility provides functions for interacting with the Kubernetes API
 * to create and manage pods and services for GAM sessions.
 */
const k8s = require('@kubernetes/client-node');
const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');
const https = require('https');

// Initialize the Kubernetes client
const kc = new k8s.KubeConfig();

// Get GKE cluster info from environment variables
const clusterName = process.env.GKE_CLUSTER_NAME;
const clusterLocation = process.env.GKE_CLUSTER_LOCATION;
const projectId = process.env.PROJECT_ID;

if (!clusterName || !clusterLocation || !projectId) {
  console.error('Missing required environment variables for GKE cluster');
  console.error(`GKE_CLUSTER_NAME: ${clusterName || 'not defined'}`);
  console.error(`GKE_CLUSTER_LOCATION: ${clusterLocation || 'not defined'}`);
  console.error(`PROJECT_ID: ${projectId || 'not defined'}`);
  throw new Error('GKE_CLUSTER_NAME, GKE_CLUSTER_LOCATION, and PROJECT_ID environment variables must be set');
}

// Get the namespace from environment variables or use default
const namespace = process.env.K8S_NAMESPACE || 'gamgui';

// Get session templates from environment variables or use defaults
const sessionServiceTemplate = process.env.SESSION_SERVICE_TEMPLATE || 'gam-service-{{SESSION_ID}}';
const sessionDeploymentTemplate = process.env.SESSION_DEPLOYMENT_TEMPLATE || 'gam-deployment-{{SESSION_ID}}';
const websocketPathTemplate = process.env.WEBSOCKET_PATH_TEMPLATE || '/ws/session/{{SESSION_ID}}/';

// API clients - will be initialized after authentication
let k8sCoreV1Api = null;
let k8sAppsV1Api = null;
let k8sNetworkingV1Api = null;

/**
 * Helper function to handle Kubernetes errors with better error messages
 * @param {Error} error - The error object
 * @param {string} operation - The operation being performed
 * @throws {Error} - A more descriptive error
 */
function handleKubernetesError(error, operation) {
  console.error(`Kubernetes ${operation} error:`, error);
  
  // Check if it's a connection error
  if (error.code === 'ECONNREFUSED') {
    console.error(`Cannot connect to Kubernetes API server. Please check your cluster configuration.`);
    throw new Error(`Cannot connect to Kubernetes API server: ${error.message}`);
  }
  
  // Check if it's an authentication error
  if (error.response && error.response.statusCode === 401) {
    console.error(`Authentication error: Not authorized to access Kubernetes API.`);
    throw new Error(`Authentication error: Not authorized to access Kubernetes API: ${error.message}`);
  }
  
  // Other errors
  throw error;
}

/**
 * Retry an operation with exponential backoff
 * @param {Function} operation - The operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in milliseconds
 * @returns {Promise<any>} - The result of the operation
 */
async function retryWithBackoff(operation, maxRetries = 3, initialDelay = 1000) {
  let retryCount = 0;
  let delay = initialDelay;
  
  while (retryCount < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      retryCount++;
      
      if (retryCount >= maxRetries) {
        console.error(`Failed after ${maxRetries} retries:`, error);
        throw error;
      }
      
      console.warn(`Retry ${retryCount}/${maxRetries} after ${delay}ms delay...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff
      delay *= 2;
    }
  }
}

/**
 * Get GKE cluster endpoint using the GCP API
 * @param {string} projectId - GCP project ID
 * @param {string} location - GKE cluster location
 * @param {string} clusterName - GKE cluster name
 * @param {string} accessToken - GCP access token
 * @returns {Promise<string>} - GKE cluster endpoint
 */
async function getClusterEndpoint(projectId, location, clusterName, accessToken) {
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
            console.log(`Cluster endpoint: ${clusterInfo.endpoint}`);
            resolve(clusterInfo.endpoint);
          } catch (error) {
            console.error('Error parsing cluster info:', error);
            reject(error);
          }
        } else {
          console.error(`Failed to get cluster info: ${res.statusCode} ${res.statusMessage}`);
          reject(new Error(`Failed to get cluster info: ${res.statusCode} ${res.statusMessage}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Error getting cluster info:', error);
      reject(error);
    });

    req.end();
  });
}

/**
 * Get GKE cluster CA certificate using the GCP API
 * @param {string} projectId - GCP project ID
 * @param {string} location - GKE cluster location
 * @param {string} clusterName - GKE cluster name
 * @param {string} accessToken - GCP access token
 * @returns {Promise<string>} - GKE cluster CA certificate
 */
async function getClusterCaCertificate(projectId, location, clusterName, accessToken) {
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
            console.log('Cluster CA certificate obtained');
            resolve(clusterInfo.masterAuth.clusterCaCertificate);
          } catch (error) {
            console.error('Error parsing cluster info:', error);
            reject(error);
          }
        } else {
          console.error(`Failed to get cluster info: ${res.statusCode} ${res.statusMessage}`);
          reject(new Error(`Failed to get cluster info: ${res.statusCode} ${res.statusMessage}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Error getting cluster info:', error);
      reject(error);
    });

    req.end();
  });
}

/**
 * Initialize Kubernetes client using GCP authentication
 * @returns {Promise<boolean>} - True if initialization was successful
 */
async function initializeKubernetesClient() {
  try {
    console.log('Initializing Kubernetes client with GCP authentication');
    
    // Get GCP access token
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    console.log('Getting GCP authentication client...');
    const client = await auth.getClient();
    
    console.log('Requesting access token...');
    const tokenResponse = await client.getAccessToken();
    
    if (!tokenResponse || !tokenResponse.token) {
      throw new Error('Failed to get GCP access token: Token not returned');
    }
    
    const accessToken = tokenResponse.token;
    const expiryTime = tokenResponse.expiryTime ? new Date(tokenResponse.expiryTime).toISOString() : 'Unknown';
    console.log(`GCP access token obtained successfully. Expires at: ${expiryTime}`);
    
    // Get cluster endpoint and CA certificate
    console.log('Getting cluster endpoint...');
    const clusterEndpoint = await getClusterEndpoint(projectId, clusterLocation, clusterName, accessToken);
    
    console.log('Getting cluster CA certificate...');
    const clusterCaCertificate = await getClusterCaCertificate(projectId, clusterLocation, clusterName, accessToken);
    
    if (!clusterEndpoint || !clusterCaCertificate) {
      throw new Error('Failed to get GKE cluster endpoint or CA certificate');
    }
    
    // Configure KubeConfig manually
    console.log(`Configuring KubeConfig for cluster ${clusterName}...`);
    kc.loadFromOptions({
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
    console.log('Creating Kubernetes API clients...');
    k8sCoreV1Api = kc.makeApiClient(k8s.CoreV1Api);
    k8sAppsV1Api = kc.makeApiClient(k8s.AppsV1Api);
    k8sNetworkingV1Api = kc.makeApiClient(k8s.NetworkingV1Api);
    
    console.log('Kubernetes API clients created successfully');
    
    // Test connection
    console.log('Testing connection to Kubernetes cluster...');
    const namespaces = await k8sCoreV1Api.listNamespace();
    console.log(`Connected successfully to Kubernetes cluster. Found ${namespaces.body.items.length} namespaces.`);
    
    // Schedule token refresh before expiration
    if (tokenResponse.expiryTime) {
      const expiryDate = new Date(tokenResponse.expiryTime);
      const refreshTime = new Date(expiryDate.getTime() - 5 * 60 * 1000); // 5 minutes before expiry
      const timeUntilRefresh = Math.max(0, refreshTime.getTime() - Date.now());
      
      console.log(`Scheduling token refresh in ${Math.floor(timeUntilRefresh / 60000)} minutes`);
      
      setTimeout(async () => {
        try {
          await initializeKubernetesClient();
          console.log('Successfully refreshed Kubernetes token');
        } catch (error) {
          console.error('Failed to refresh token:', error);
        }
      }, timeUntilRefresh);
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing Kubernetes client:', error);
    throw error;
  }
}

// Initialize Kubernetes client
initializeKubernetesClient().catch(error => {
  console.error('Failed to initialize Kubernetes client:', error);
  // Don't throw here to allow the application to start even if Kubernetes is not available
  // The error will be handled when trying to use Kubernetes functions
});

/**
 * Create a pod for a GAM session
 * @param {string} sessionId - The session ID
 * @param {object} options - Options for the pod
 * @param {string} options.cpu - CPU resource limit
 * @param {string} options.memory - Memory resource limit
 * @param {string} options.credentialsSecret - Name of the credentials secret (default: gam-credentials)
 * @returns {Promise<object>} - The created pod
 */
async function createSessionPod(sessionId, options = {}) {
  return retryWithBackoff(async () => {
    try {
      // Generate a unique name for the pod based on the session ID
      const podName = `gam-session-${sessionId}`;

      // Get the pod template from the config map
      const podTemplate = {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
          name: podName,
          namespace: namespace,
          labels: {
            app: 'gamgui',
            session: sessionId
          }
        },
        spec: {
          serviceAccountName: process.env.K8S_SERVICE_ACCOUNT || 'gam-service-account',
          containers: [
            {
              name: 'gam-container',
              image: process.env.GAM_IMAGE || 'gcr.io/gamgui-registry/docker-gam7:latest',
              command: ['/bin/bash', '-c', 'while true; do sleep 30; done'],
              workingDir: '/gam',
              ports: [
                {
                  containerPort: 8080,
                  name: 'http'
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
                  mountPath: '/root/.gam/credentials',
                  readOnly: true
                },
                {
                  name: 'gam-uploads',
                  mountPath: '/gam/uploads'
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
            }
          ]
        }
      };

      // Add init container to create gam.cfg
      podTemplate.spec.containers[0].command = ['/bin/bash', '-c'];
      podTemplate.spec.containers[0].args = [
        `# Create GAM config directory
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

        # Keep the container running
        while true; do sleep 30; done
        `
      ];

      // Create the pod
      const response = await k8sCoreV1Api.createNamespacedPod(namespace, podTemplate);

      console.log(`Created pod ${podName} for session ${sessionId}`);

      return response.body;
    } catch (error) {
      handleKubernetesError(error, `creating pod for session ${sessionId}`);
    }
  });
}

/**
 * Delete a pod for a GAM session
 * @param {string} sessionId - The session ID
 * @returns {Promise<object>} - The deleted pod
 */
async function deleteSessionPod(sessionId) {
  return retryWithBackoff(async () => {
    try {
      // Generate the pod name based on the session ID
      const podName = `gam-session-${sessionId}`;

      // Delete the pod
      const response = await k8sCoreV1Api.deleteNamespacedPod(podName, namespace);

      console.log(`Deleted pod ${podName} for session ${sessionId}`);

      return response.body;
    } catch (error) {
      // If the pod doesn't exist, that's fine
      if (error.response && error.response.statusCode === 404) {
        console.log(`Pod ${podName} not found, already deleted`);
        return null;
      }
      
      handleKubernetesError(error, `deleting pod for session ${sessionId}`);
    }
  });
}

/**
 * Execute a command in a pod
 * @param {string} sessionId - The session ID
 * @param {string} command - The command to execute
 * @returns {Promise<object>} - The command result
 */
async function executeCommandInPod(sessionId, command) {
  return retryWithBackoff(async () => {
    try {
      // Generate the pod name based on the session ID
      const podName = `gam-session-${sessionId}`;

      // Create an exec instance
      const exec = new k8s.Exec(kc);

      // Execute the command
      return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';

        const commandArray = ['/bin/bash', '-c', command];

        exec.exec(
          namespace,
          podName,
          'gam-container',
          commandArray,
          { write: (data) => { stdout += data.toString(); } }, // Use object with write method
          { write: (data) => { stderr += data.toString(); } }, // Use object with write method
          null, // stdin
          false, // tty
          (status) => {
            if (status.status === 'Success') {
              resolve({ stdout, stderr });
            } else {
              reject(new Error(`Command execution failed: ${status.message}`));
            }
          }
        );
      });
    } catch (error) {
      handleKubernetesError(error, `executing command in pod for session ${sessionId}`);
    }
  });
}

/**
 * Get the status of a pod
 * @param {string} sessionId - The session ID
 * @returns {Promise<object>} - The pod status
 */
async function getPodStatus(sessionId) {
  return retryWithBackoff(async () => {
    try {
      // Generate the pod name based on the session ID
      const podName = `gam-session-${sessionId}`;

      // Get the pod
      const response = await k8sCoreV1Api.readNamespacedPod(podName, namespace);

      return response.body.status;
    } catch (error) {
      // If the pod doesn't exist, return a not found status
      if (error.response && error.response.statusCode === 404) {
        return { phase: 'NotFound' };
      }
      
      handleKubernetesError(error, `getting pod status for session ${sessionId}`);
    }
  });
}

/**
 * Upload a file to a pod
 * @param {string} sessionId - The session ID
 * @param {string} localFilePath - The local file path
 * @param {string} podFilePath - The pod file path
 * @returns {Promise<void>}
 */
async function uploadFileToPod(sessionId, localFilePath, podFilePath) {
  return retryWithBackoff(async () => {
    try {
      // Generate the pod name based on the session ID
      const podName = `gam-session-${sessionId}`;

      // Read the file
      const fileContent = fs.readFileSync(localFilePath);

      // Create an exec instance
      const exec = new k8s.Exec(kc);

      // Create the directory if it doesn't exist
      await new Promise((resolve, reject) => {
        const command = [`mkdir -p $(dirname ${podFilePath})`];

        exec.exec(
          namespace,
          podName,
          'gam-container',
          command,
          { write: (data) => { console.log(data.toString()); } }, // stdout
          { write: (data) => { console.error(data.toString()); } }, // stderr
          null, // stdin
          false, // tty
          (status) => {
            if (status.status === 'Success') {
              resolve();
            } else {
              reject(new Error(`Failed to create directory: ${status.message}`));
            }
          }
        );
      });

      // Write the file
      await new Promise((resolve, reject) => {
        const command = [`cat > ${podFilePath}`];

        const stdin = new stream.Readable();
        stdin.push(fileContent);
        stdin.push(null); // End of stream

        exec.exec(
          namespace,
          podName,
          'gam-container',
          command,
          { write: (data) => { console.log(data.toString()); } }, // stdout
          { write: (data) => { console.error(data.toString()); } }, // stderr
          stdin, // stdin
          false, // tty
          (status) => {
            if (status.status === 'Success') {
              resolve();
            } else {
              reject(new Error(`Failed to write file: ${status.message}`));
            }
          }
        );
      });

      console.log(`Uploaded file ${localFilePath} to ${podFilePath} in pod ${podName}`);
    } catch (error) {
      handleKubernetesError(error, `uploading file to pod for session ${sessionId}`);
    }
  });
}

/**
 * Download a file from a pod
 * @param {string} sessionId - The session ID
 * @param {string} podFilePath - The pod file path
 * @param {string} localFilePath - The local file path
 * @returns {Promise<void>}
 */
async function downloadFileFromPod(sessionId, podFilePath, localFilePath) {
  return retryWithBackoff(async () => {
    try {
      // Generate the pod name based on the session ID
      const podName = `gam-session-${sessionId}`;

      // Create an exec instance
      const exec = new k8s.Exec(kc);

      // Read the file
      const fileContent = await new Promise((resolve, reject) => {
        let content = '';

        const command = [`cat ${podFilePath}`];

        exec.exec(
          namespace,
          podName,
          'gam-container',
          command,
          { write: (data) => { content += data.toString(); } }, // stdout
          { write: (data) => { console.error(data.toString()); } }, // stderr
          null, // stdin
          false, // tty
          (status) => {
            if (status.status === 'Success') {
              resolve(content);
            } else {
              reject(new Error(`Failed to read file: ${status.message}`));
            }
          }
        );
      });

      // Write the file
      fs.writeFileSync(localFilePath, fileContent);

      console.log(`Downloaded file ${podFilePath} from pod ${podName} to ${localFilePath}`);
    } catch (error) {
      handleKubernetesError(error, `downloading file from pod for session ${sessionId}`);
    }
  });
}

/**
 * Create a service for a specific session
 * @param {string} sessionId - The session ID
 * @returns {Promise<object>} - The created service
 */
async function createSessionService(sessionId) {
  return retryWithBackoff(async () => {
    try {
      // Use template to generate service name
      const serviceName = sessionServiceTemplate.replace('{{SESSION_ID}}', sessionId);

      // Check if service already exists
      try {
        const existingService = await k8sCoreV1Api.readNamespacedService(serviceName, namespace);
        console.log(`Service ${serviceName} already exists`);
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
          namespace: namespace,
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

      const response = await k8sCoreV1Api.createNamespacedService(namespace, serviceSpec);
      console.log(`Created service ${serviceName} for session ${sessionId}`);

      return response.body;
    } catch (error) {
      handleKubernetesError(error, `creating service for session ${sessionId}`);
    }
  });
}

/**
 * Delete a service for a GAM session
 * @param {string} sessionId - The session ID
 * @returns {Promise<object>} - The deleted service
 */
async function deleteSessionService(sessionId) {
  return retryWithBackoff(async () => {
    try {
      // Generate the service name based on the session ID
      const serviceName = sessionServiceTemplate.replace('{{SESSION_ID}}', sessionId);

      // Delete the service
      const response = await k8sCoreV1Api.deleteNamespacedService(serviceName, namespace);

      console.log(`Deleted service ${serviceName} for session ${sessionId}`);

      return response.body;
    } catch (error) {
      // If the service doesn't exist, that's fine
      if (error.response && error.response.statusCode === 404) {
        console.log(`Service ${serviceName} not found, already deleted`);
        return null;
      }
      
      handleKubernetesError(error, `deleting service for session ${sessionId}`);
    }
  });
}

/**
 * Get the websocket path for a session
 * @param {string} sessionId - The session ID
 * @returns {string} - The websocket path
 */
function getSessionWebsocketPath(sessionId) {
  return websocketPathTemplate.replace('{{SESSION_ID}}', sessionId);
}

/**
 * Create a Kubernetes secret for user credentials
 * @param {string} userId - The user ID
 * @param {object} credentials - The user credentials
 * @param {string} credentials.oauth2 - The OAuth2 token
 * @param {string} credentials.oauth2service - The OAuth2 service account key
 * @param {string} credentials.clientSecrets - The client secrets
 * @returns {Promise<object>} - The created secret
 */
async function createUserCredentialsSecret(userId, credentials) {
  return retryWithBackoff(async () => {
    try {
      // Generate the secret name based on the user ID
      const secretName = `user-${userId}-credentials`;

      // Check if secret already exists
      try {
        await k8sCoreV1Api.readNamespacedSecret(secretName, namespace);
        console.log(`Secret ${secretName} already exists, deleting it first`);
        
        // Delete the existing secret
        await k8sCoreV1Api.deleteNamespacedSecret(secretName, namespace);
      } catch (error) {
        if (error.response && error.response.statusCode !== 404) {
          console.warn(`Error checking for existing secret: ${error.message}`);
        }
      }

      // Create the secret
      const secretSpec = {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: secretName,
          namespace: namespace,
          labels: {
            app: 'gamgui',
            user_id: userId,
            component: 'credentials'
          }
        },
        type: 'Opaque',
        data: {
          'oauth2.txt': Buffer.from(credentials.oauth2).toString('base64'),
          'oauth2service.json': Buffer.from(credentials.oauth2service).toString('base64'),
          'client_secrets.json': Buffer.from(credentials.clientSecrets).toString('base64')
        }
      };

      const response = await k8sCoreV1Api.createNamespacedSecret(namespace, secretSpec);
      console.log(`Created secret ${secretName} for user ${userId}`);

      return response.body;
    } catch (error) {
      handleKubernetesError(error, `creating secret for user ${userId}`);
    }
  });
}

module.exports = {
  createSessionPod,
  deleteSessionPod,
  executeCommandInPod,
  getPodStatus,
  uploadFileToPod,
  downloadFileFromPod,
  createSessionService,
  deleteSessionService,
  getSessionWebsocketPath,
  createUserCredentialsSecret
};
