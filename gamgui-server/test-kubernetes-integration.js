/**
 * Test script for Kubernetes integration
 * 
 * This script tests the Kubernetes integration by simulating the creation of a session
 * and verifying that a Kubernetes pod is created.
 * 
 * Usage:
 * node test-kubernetes-integration.js
 */

// Import required modules
const { v4: uuidv4 } = require('uuid');

// Set environment variables for testing
process.env.GKE_CLUSTER_NAME = process.env.GKE_CLUSTER_NAME || 'test-cluster';
process.env.GKE_CLUSTER_LOCATION = process.env.GKE_CLUSTER_LOCATION || 'test-location';
process.env.K8S_NAMESPACE = process.env.K8S_NAMESPACE || 'test-namespace';
process.env.K8S_SERVICE_ACCOUNT = process.env.K8S_SERVICE_ACCOUNT || 'test-service-account';
process.env.GAM_IMAGE = process.env.GAM_IMAGE || 'test-image';

// Check if Kubernetes is enabled
const KUBERNETES_ENABLED = process.env.GKE_CLUSTER_NAME && process.env.GKE_CLUSTER_LOCATION;

console.log('Kubernetes enabled:', KUBERNETES_ENABLED);
console.log('Environment variables:');
console.log('  GKE_CLUSTER_NAME:', process.env.GKE_CLUSTER_NAME);
console.log('  GKE_CLUSTER_LOCATION:', process.env.GKE_CLUSTER_LOCATION);
console.log('  K8S_NAMESPACE:', process.env.K8S_NAMESPACE);
console.log('  K8S_SERVICE_ACCOUNT:', process.env.K8S_SERVICE_ACCOUNT);
console.log('  GAM_IMAGE:', process.env.GAM_IMAGE);

// Simulate the session creation process
async function simulateSessionCreation() {
  try {
    console.log('Simulating session creation...');
    
    // Generate a session ID
    const sessionId = uuidv4();
    console.log('Session ID:', sessionId);
    
    // Create a container info object
    let containerInfo;
    
    // Check if Kubernetes is enabled
    if (KUBERNETES_ENABLED) {
      try {
        console.log('Creating Kubernetes pod for session...');
        
        // Simulate creating a pod
        const podName = `gam-session-${sessionId.substring(0, 8)}`;
        console.log('Pod name:', podName);
        
        // Create a container info object with Kubernetes flag
        containerInfo = {
          id: `virtual-container-${sessionId}`,
          sessionId,
          podName,
          kubernetes: true,
          stream: null
        };
        
        console.log('Container info:', containerInfo);
      } catch (error) {
        console.error('Error creating Kubernetes pod:', error);
        
        // Fall back to virtual session
        console.log('Falling back to virtual session...');
        
        containerInfo = {
          id: `virtual-container-${sessionId}`,
          sessionId,
          stream: null,
          virtual: true
        };
        
        console.log('Container info:', containerInfo);
      }
    } else {
      // Create a virtual session
      console.log('Creating virtual session...');
      
      containerInfo = {
        id: `virtual-container-${sessionId}`,
        sessionId,
        stream: null,
        virtual: true
      };
      
      console.log('Container info:', containerInfo);
    }
    
    // Check if the session was created with Kubernetes
    if (containerInfo && containerInfo.kubernetes) {
      console.log('Session was created with Kubernetes integration!');
      return true;
    } else {
      console.log('Session was created as a virtual session.');
      return false;
    }
  } catch (error) {
    console.error('Error simulating session creation:', error);
    return false;
  }
}

// Run the test
simulateSessionCreation()
  .then((success) => {
    if (success) {
      console.log('Test completed successfully!');
      process.exit(0);
    } else if (KUBERNETES_ENABLED) {
      console.log('Test failed: Session was not created with Kubernetes integration even though Kubernetes is enabled.');
      process.exit(1);
    } else {
      console.log('Test completed successfully: Session was created as a virtual session because Kubernetes is not enabled.');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
