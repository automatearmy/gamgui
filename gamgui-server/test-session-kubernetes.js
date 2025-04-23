/**
 * Test script for session routes with Kubernetes integration
 * 
 * This script tests the session routes with Kubernetes integration.
 * It creates a mock request and response to test the session creation.
 * 
 * Usage:
 * node test-session-kubernetes.js
 */

// Mock the Kubernetes client
const mockK8s = {
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
  }
};

// Mock the session routes dependencies
const mockUuid = {
  v4: () => 'test-session-id'
};

// Set environment variables for testing
process.env.GKE_CLUSTER_NAME = 'test-cluster';
process.env.GKE_CLUSTER_LOCATION = 'test-location';
process.env.K8S_NAMESPACE = 'test-namespace';
process.env.K8S_SERVICE_ACCOUNT = 'test-service-account';
process.env.GAM_IMAGE = 'test-image';

// Create a mock for the session routes
const mockSessionRoutes = () => {
  // Mock the dependencies
  const originalRequire = require;
  require = function(moduleName) {
    if (moduleName === '../utils/kubernetesClient') {
      return mockK8s;
    } else if (moduleName === 'uuid') {
      return mockUuid;
    } else {
      return originalRequire(moduleName);
    }
  };
  
  // Create mock sessions and containerSessions
  const sessions = [];
  const containerSessions = new Map();
  
  // Create a mock request and response
  const req = {
    body: {
      name: 'Test Session',
      imageId: 'test-image-id',
      config: {
        resources: {
          cpu: '250m',
          memory: '256Mi'
        }
      }
    }
  };
  
  const res = {
    status: (code) => {
      console.log(`Response status: ${code}`);
      return res;
    },
    json: (data) => {
      console.log('Response data:', data);
      return res;
    }
  };
  
  // Create a mock router
  const router = {
    post: (path, handler) => {
      console.log(`Registered POST handler for path: ${path}`);
      // Store the handler for later use
      router.postHandler = handler;
    },
    get: (path, handler) => {
      console.log(`Registered GET handler for path: ${path}`);
    },
    delete: (path, handler) => {
      console.log(`Registered DELETE handler for path: ${path}`);
    },
    // Call the post handler
    callPostHandler: async () => {
      if (router.postHandler) {
        await router.postHandler(req, res);
      }
    }
  };
  
  // Mock the express module
  const express = {
    Router: () => router
  };
  
  // Create the session routes
  const originalExpress = require('express');
  require = function(moduleName) {
    if (moduleName === 'express') {
      return express;
    } else {
      return originalRequire(moduleName);
    }
  };
  
  // Load the session routes
  const sessionRoutes = require('./routes/sessionRoutes');
  
  // Restore the original require
  require = originalRequire;
  
  return {
    router,
    sessions,
    containerSessions
  };
};

// Test the session routes
async function testSessionRoutes() {
  try {
    console.log('Testing session routes with Kubernetes integration...');
    
    // Create the mock session routes
    const { router, sessions, containerSessions } = mockSessionRoutes();
    
    // Call the post handler to create a session
    await router.callPostHandler();
    
    // Check if a session was created
    console.log(`Sessions: ${sessions.length}`);
    console.log(`Container sessions: ${containerSessions.size}`);
    
    // Check if the session was created with Kubernetes
    const sessionId = 'test-session-id';
    const containerInfo = containerSessions.get(sessionId);
    
    if (containerInfo && containerInfo.kubernetes) {
      console.log('Session was created with Kubernetes integration!');
      console.log('Container info:', containerInfo);
      return true;
    } else {
      console.log('Session was not created with Kubernetes integration.');
      console.log('Container info:', containerInfo);
      return false;
    }
  } catch (error) {
    console.error('Error testing session routes:', error);
    return false;
  }
}

// Run the test
testSessionRoutes()
  .then((success) => {
    if (success) {
      console.log('Test completed successfully!');
      process.exit(0);
    } else {
      console.log('Test failed.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
