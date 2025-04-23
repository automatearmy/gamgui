/**
 * Test script for Kubernetes integration
 * 
 * This script tests if we can connect to a Kubernetes cluster and create a pod.
 * 
 * Usage:
 * node test-kubernetes.js
 */

const k8s = require('./utils/kubernetesClient');
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
    await new Promise(resolve => setTimeout(resolve, 10000));
    
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
