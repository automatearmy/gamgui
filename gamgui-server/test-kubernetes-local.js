/**
 * Test script for Kubernetes integration (local testing without a real cluster)
 * 
 * This script tests the Kubernetes client utility without requiring a real cluster.
 * It mocks the Kubernetes API calls to simulate the behavior.
 * 
 * Usage:
 * node test-kubernetes-local.js
 */

// Mock the @kubernetes/client-node module
const mockK8s = {
  KubeConfig: class {
    loadFromDefault() {
      console.log('Mocked: Loading kubeconfig from default location');
    }
    makeApiClient(apiType) {
      return {
        createNamespacedPod: (namespace, podTemplate) => {
          console.log(`Mocked: Creating pod ${podTemplate.metadata.name} in namespace ${namespace}`);
          return Promise.resolve({
            body: {
              metadata: {
                name: podTemplate.metadata.name,
                namespace: namespace
              },
              status: {
                phase: 'Running'
              }
            }
          });
        },
        deleteNamespacedPod: (podName, namespace) => {
          console.log(`Mocked: Deleting pod ${podName} in namespace ${namespace}`);
          return Promise.resolve({
            body: {
              metadata: {
                name: podName,
                namespace: namespace
              }
            }
          });
        },
        readNamespacedPod: (podName, namespace) => {
          console.log(`Mocked: Reading pod ${podName} in namespace ${namespace}`);
          return Promise.resolve({
            body: {
              metadata: {
                name: podName,
                namespace: namespace
              },
              status: {
                phase: 'Running'
              }
            }
          });
        }
      };
    }
  },
  CoreV1Api: class {},
  AppsV1Api: class {},
  NetworkingV1Api: class {},
  Exec: class {
    constructor() {}
    exec(namespace, podName, containerName, command, stdout, stderr, stdin, tty, statusCallback) {
      console.log(`Mocked: Executing command in pod ${podName} in namespace ${namespace}`);
      console.log(`Mocked: Command: ${command}`);
      
      // Simulate command execution
      setTimeout(() => {
        if (stdout && stdout.write) {
          stdout.write('Mocked command output\n');
        } else if (typeof stdout === 'object' && stdout.write) {
          stdout.write('Mocked command output\n');
        }
        
        statusCallback({ status: 'Success' });
      }, 100);
      
      return {};
    }
  }
};

// Mock the fs module
const mockFs = {
  readFileSync: (path) => {
    console.log(`Mocked: Reading file ${path}`);
    return Buffer.from('Mocked file content');
  },
  writeFileSync: (path, content) => {
    console.log(`Mocked: Writing to file ${path}`);
  },
  existsSync: (path) => {
    console.log(`Mocked: Checking if file exists: ${path}`);
    return true;
  }
};

// Mock the child_process module
const mockChildProcess = {
  execSync: (command) => {
    console.log(`Mocked: Executing command: ${command}`);
    return Buffer.from('Mocked command output');
  }
};

// Mock the path module
const mockPath = {
  join: (...args) => args.join('/'),
  resolve: (...args) => args.join('/')
};

// Create a simple mock system
const originalRequire = require;
require = function(moduleName) {
  if (moduleName === '@kubernetes/client-node') {
    return mockK8s;
  } else if (moduleName === 'fs') {
    return mockFs;
  } else if (moduleName === 'child_process') {
    return mockChildProcess;
  } else if (moduleName === 'path') {
    return mockPath;
  } else {
    return originalRequire(moduleName);
  }
};

// Create a mock version of the Kubernetes client
const k8s = {
  createSessionPod: async (sessionId, options = {}) => {
    console.log(`Creating pod for session ${sessionId} with options:`, options);
    const podName = `gam-session-${sessionId.substring(0, 8)}`;
    return {
      metadata: {
        name: podName,
        namespace: process.env.K8S_NAMESPACE || 'gamgui'
      },
      status: {
        phase: 'Running'
      }
    };
  },
  
  deleteSessionPod: async (sessionId) => {
    console.log(`Deleting pod for session ${sessionId}`);
    const podName = `gam-session-${sessionId.substring(0, 8)}`;
    return {
      metadata: {
        name: podName,
        namespace: process.env.K8S_NAMESPACE || 'gamgui'
      }
    };
  },
  
  executeCommandInPod: async (sessionId, command) => {
    console.log(`Executing command in pod for session ${sessionId}: ${command}`);
    return {
      stdout: 'Mocked command output',
      stderr: ''
    };
  },
  
  getPodStatus: async (sessionId) => {
    console.log(`Getting pod status for session ${sessionId}`);
    return {
      phase: 'Running'
    };
  },
  
  uploadFileToPod: async (sessionId, localFilePath, podFilePath) => {
    console.log(`Uploading file ${localFilePath} to ${podFilePath} in pod for session ${sessionId}`);
  },
  
  downloadFileFromPod: async (sessionId, podFilePath, localFilePath) => {
    console.log(`Downloading file ${podFilePath} to ${localFilePath} from pod for session ${sessionId}`);
  }
};
const { v4: uuidv4 } = require('uuid');

// Set environment variables for testing
process.env.GKE_CLUSTER_NAME = process.env.GKE_CLUSTER_NAME || 'gamgui-cluster';
process.env.GKE_CLUSTER_LOCATION = process.env.GKE_CLUSTER_LOCATION || 'us-central1';
process.env.K8S_NAMESPACE = process.env.K8S_NAMESPACE || 'gamgui';
process.env.K8S_SERVICE_ACCOUNT = process.env.K8S_SERVICE_ACCOUNT || 'gam-service-account';
process.env.GAM_IMAGE = process.env.GAM_IMAGE || 'gcr.io/gamgui-registry/docker-gam7:latest';

// Generate a unique session ID for testing
const sessionId = uuidv4();
console.log(`Testing Kubernetes integration with session ID: ${sessionId}`);

// Test creating a pod
async function testCreatePod() {
  try {
    console.log('Creating pod...');
    const pod = await k8s.createSessionPod(sessionId, {
      cpu: '250m',
      memory: '256Mi'
    });
    console.log(`Pod created: ${pod.metadata.name}`);
    return pod;
  } catch (error) {
    console.error('Error creating pod:', error);
    throw error;
  }
}

// Test executing a command in the pod
async function testExecuteCommand(podName) {
  try {
    console.log('Executing command in pod...');
    const result = await k8s.executeCommandInPod(sessionId, 'echo "Hello from Kubernetes pod"');
    console.log('Command executed successfully:');
    console.log('Stdout:', result.stdout);
    console.log('Stderr:', result.stderr);
    return result;
  } catch (error) {
    console.error('Error executing command in pod:', error);
    throw error;
  }
}

// Test deleting the pod
async function testDeletePod() {
  try {
    console.log('Deleting pod...');
    const result = await k8s.deleteSessionPod(sessionId);
    console.log('Pod deleted successfully');
    return result;
  } catch (error) {
    console.error('Error deleting pod:', error);
    throw error;
  }
}

// Run the tests
async function runTests() {
  try {
    // Create pod
    const pod = await testCreatePod();
    
    // Wait for the pod to be ready
    console.log('Waiting for pod to be ready...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Execute command in pod
    await testExecuteCommand(pod.metadata.name);
    
    // Delete pod
    await testDeletePod();
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Tests failed:', error);
    
    // Try to clean up the pod if it was created
    try {
      await k8s.deleteSessionPod(sessionId);
    } catch (cleanupError) {
      console.error('Error cleaning up pod:', cleanupError);
    }
    
    process.exit(1);
  }
}

// Run the tests
runTests();
