/**
 * Kubernetes Client Utility
 * 
 * This utility provides functions for interacting with the Kubernetes API
 * to create and manage pods for GAM sessions.
 */
const k8s = require('@kubernetes/client-node');
const fs = require('fs');
const path = require('path');

// Initialize the Kubernetes client
const kc = new k8s.KubeConfig();

// Try to load from the default location
try {
  kc.loadFromDefault();
} catch (error) {
  console.log('Could not load kubeconfig from default location, trying environment variables');
  
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
  kc.loadFromDefault();
}

// Create the API clients
const k8sCoreV1Api = kc.makeApiClient(k8s.CoreV1Api);
const k8sAppsV1Api = kc.makeApiClient(k8s.AppsV1Api);
const k8sNetworkingV1Api = kc.makeApiClient(k8s.NetworkingV1Api);

// Get the namespace from environment variables or use default
const namespace = process.env.K8S_NAMESPACE || 'gamgui';

/**
 * Create a pod for a GAM session
 * @param {string} sessionId - The session ID
 * @param {object} options - Options for the pod
 * @returns {Promise<object>} - The created pod
 */
async function createSessionPod(sessionId, options = {}) {
  try {
    // Generate a unique name for the pod based on the session ID
    const podName = `gam-session-${sessionId.substring(0, 8)}`;
    
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
              secretName: 'gam-credentials',
              optional: true
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
    const response = await k8sCoreV1Api.createNamespacedPod(namespace, podTemplate);
    
    console.log(`Created pod ${podName} for session ${sessionId}`);
    
    return response.body;
  } catch (error) {
    console.error(`Error creating pod for session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Delete a pod for a GAM session
 * @param {string} sessionId - The session ID
 * @returns {Promise<object>} - The deleted pod
 */
async function deleteSessionPod(sessionId) {
  try {
    // Generate the pod name based on the session ID
    const podName = `gam-session-${sessionId.substring(0, 8)}`;
    
    // Delete the pod
    const response = await k8sCoreV1Api.deleteNamespacedPod(podName, namespace);
    
    console.log(`Deleted pod ${podName} for session ${sessionId}`);
    
    return response.body;
  } catch (error) {
    console.error(`Error deleting pod for session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Execute a command in a pod
 * @param {string} sessionId - The session ID
 * @param {string} command - The command to execute
 * @returns {Promise<object>} - The command result
 */
async function executeCommandInPod(sessionId, command) {
  try {
    // Generate the pod name based on the session ID
    const podName = `gam-session-${sessionId.substring(0, 8)}`;
    
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
        process.stdout,
        process.stderr,
        process.stdin,
        true,
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
    console.error(`Error executing command in pod for session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Get the status of a pod
 * @param {string} sessionId - The session ID
 * @returns {Promise<object>} - The pod status
 */
async function getPodStatus(sessionId) {
  try {
    // Generate the pod name based on the session ID
    const podName = `gam-session-${sessionId.substring(0, 8)}`;
    
    // Get the pod
    const response = await k8sCoreV1Api.readNamespacedPod(podName, namespace);
    
    return response.body.status;
  } catch (error) {
    console.error(`Error getting pod status for session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Upload a file to a pod
 * @param {string} sessionId - The session ID
 * @param {string} localFilePath - The local file path
 * @param {string} podFilePath - The pod file path
 * @returns {Promise<void>}
 */
async function uploadFileToPod(sessionId, localFilePath, podFilePath) {
  try {
    // Generate the pod name based on the session ID
    const podName = `gam-session-${sessionId.substring(0, 8)}`;
    
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
        process.stdout,
        process.stderr,
        process.stdin,
        true,
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
      
      exec.exec(
        namespace,
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
            reject(new Error(`Failed to write file: ${status.message}`));
          }
        }
      );
      
      // Write the file content to stdin
      process.stdin.write(fileContent);
      process.stdin.end();
    });
    
    console.log(`Uploaded file ${localFilePath} to ${podFilePath} in pod ${podName}`);
  } catch (error) {
    console.error(`Error uploading file to pod for session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Download a file from a pod
 * @param {string} sessionId - The session ID
 * @param {string} podFilePath - The pod file path
 * @param {string} localFilePath - The local file path
 * @returns {Promise<void>}
 */
async function downloadFileFromPod(sessionId, podFilePath, localFilePath) {
  try {
    // Generate the pod name based on the session ID
    const podName = `gam-session-${sessionId.substring(0, 8)}`;
    
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
            reject(new Error(`Failed to read file: ${status.message}`));
          }
        }
      );
    });
    
    // Write the file
    fs.writeFileSync(localFilePath, fileContent);
    
    console.log(`Downloaded file ${podFilePath} from pod ${podName} to ${localFilePath}`);
  } catch (error) {
    console.error(`Error downloading file from pod for session ${sessionId}:`, error);
    throw error;
  }
}

module.exports = {
  createSessionPod,
  deleteSessionPod,
  executeCommandInPod,
  getPodStatus,
  uploadFileToPod,
  downloadFileFromPod
};
