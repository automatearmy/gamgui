/**
 * WebSocket Connection Test Script
 * 
 * This script tests the WebSocket connection to a session.
 * It can be used to diagnose issues with the WebSocket proxy.
 * 
 * Usage:
 *   node test-websocket-connection.js <session-id>
 * 
 * Example:
 *   node test-websocket-connection.js default
 */

const WebSocket = require('ws');
const axios = require('axios');
const dotenv = require('dotenv');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Load environment variables
dotenv.config();

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'https://gamgui-server-1007518649235.us-central1.run.app';
const API_URL = `${SERVER_URL}/api`;
const NAMESPACE = process.env.K8S_NAMESPACE || 'gamgui';

// Get session ID from command line arguments
const sessionId = process.argv[2];

if (!sessionId) {
  console.error('Error: Session ID is required');
  console.error('Usage: node test-websocket-connection.js <session-id>');
  process.exit(1);
}

/**
 * Test direct connection to WebSocket proxy in Kubernetes
 */
async function testDirectKubernetesConnection(sessionId) {
  try {
    console.log('\n=== Testing Direct Kubernetes Connection ===');
    
    // Get pod name for the WebSocket proxy
    console.log('Getting WebSocket proxy pod name...');
    const { stdout: podName } = await execAsync(`kubectl get pods -n ${NAMESPACE} -l app=websocket-proxy -o jsonpath='{.items[0].metadata.name}'`);
    
    if (!podName) {
      console.error('Error: WebSocket proxy pod not found');
      return false;
    }
    
    console.log(`WebSocket proxy pod: ${podName}`);
    
    // Port-forward the WebSocket proxy pod
    console.log('Setting up port forwarding...');
    const portForward = exec(`kubectl port-forward -n ${NAMESPACE} ${podName} 8080:80`);
    
    // Wait for port forwarding to be established
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test connection to the WebSocket proxy
    console.log('Testing connection to WebSocket proxy...');
    try {
      const response = await axios.get('http://localhost:8080/');
      console.log(`Response status: ${response.status}`);
      console.log(`Response data: ${response.data}`);
      console.log('✅ Direct connection to WebSocket proxy successful');
    } catch (error) {
      console.error('❌ Failed to connect to WebSocket proxy:', error.message);
    }
    
    // Test WebSocket connection
    console.log(`Testing WebSocket connection to session ${sessionId}...`);
    const ws = new WebSocket(`ws://localhost:8080/ws/session/${sessionId}/`);
    
    return new Promise((resolve) => {
      ws.on('open', () => {
        console.log('✅ WebSocket connection established');
        ws.send('test command');
        setTimeout(() => {
          ws.close();
          portForward.kill();
          resolve(true);
        }, 2000);
      });
      
      ws.on('message', (data) => {
        console.log(`Received message: ${data}`);
      });
      
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        portForward.kill();
        resolve(false);
      });
      
      // Set a timeout
      setTimeout(() => {
        console.error('❌ WebSocket connection timed out');
        ws.close();
        portForward.kill();
        resolve(false);
      }, 10000);
    });
  } catch (error) {
    console.error('Error testing direct Kubernetes connection:', error.message);
    return false;
  }
}

/**
 * Test connection through the server API
 */
async function testServerApiConnection(sessionId) {
  try {
    console.log('\n=== Testing Server API Connection ===');
    
    // Get WebSocket info from the server
    console.log(`Getting WebSocket info for session ${sessionId}...`);
    const response = await axios.get(`${API_URL}/sessions/${sessionId}/websocket`);
    
    console.log('WebSocket info:', JSON.stringify(response.data, null, 2));
    
    if (response.data.error) {
      console.error(`❌ Server returned error: ${response.data.error}`);
      return false;
    }
    
    if (!response.data.websocketPath) {
      console.error('❌ WebSocket path not provided by server');
      return false;
    }
    
    console.log('✅ Successfully retrieved WebSocket info from server');
    return true;
  } catch (error) {
    console.error('❌ Error testing server API connection:', error.message);
    return false;
  }
}

/**
 * Test connection through the Cloud Run server
 */
async function testCloudRunConnection(sessionId) {
  try {
    console.log('\n=== Testing Cloud Run Connection ===');
    
    // Test WebSocket connection through Cloud Run
    console.log(`Testing WebSocket connection to session ${sessionId} through Cloud Run...`);
    const ws = new WebSocket(`wss://${SERVER_URL.replace('https://', '')}/ws/session/${sessionId}/`);
    
    return new Promise((resolve) => {
      ws.on('open', () => {
        console.log('✅ WebSocket connection established through Cloud Run');
        ws.send('test command');
        setTimeout(() => {
          ws.close();
          resolve(true);
        }, 2000);
      });
      
      ws.on('message', (data) => {
        console.log(`Received message: ${data}`);
      });
      
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        resolve(false);
      });
      
      // Set a timeout
      setTimeout(() => {
        console.error('❌ WebSocket connection timed out');
        ws.close();
        resolve(false);
      }, 10000);
    });
  } catch (error) {
    console.error('❌ Error testing Cloud Run connection:', error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`Testing WebSocket connection for session: ${sessionId}`);
  console.log(`Server URL: ${SERVER_URL}`);
  console.log(`API URL: ${API_URL}`);
  
  // Test server API connection
  const serverApiSuccess = await testServerApiConnection(sessionId);
  
  // Test direct Kubernetes connection
  const directK8sSuccess = await testDirectKubernetesConnection(sessionId);
  
  // Test Cloud Run connection
  const cloudRunSuccess = await testCloudRunConnection(sessionId);
  
  // Print summary
  console.log('\n=== Test Summary ===');
  console.log(`Server API Connection: ${serverApiSuccess ? '✅ Success' : '❌ Failed'}`);
  console.log(`Direct Kubernetes Connection: ${directK8sSuccess ? '✅ Success' : '❌ Failed'}`);
  console.log(`Cloud Run Connection: ${cloudRunSuccess ? '✅ Success' : '❌ Failed'}`);
  
  // Provide recommendations
  console.log('\n=== Recommendations ===');
  
  if (!serverApiSuccess) {
    console.log('- Check if the session exists and is running');
    console.log('- Verify that the server is correctly configured to access Kubernetes');
  }
  
  if (!directK8sSuccess) {
    console.log('- Check if the WebSocket proxy is running in Kubernetes');
    console.log('- Verify that the WebSocket proxy is correctly configured');
    console.log('- Check if the session pod is running and accessible');
  }
  
  if (!cloudRunSuccess) {
    console.log('- Check if Cloud Run is correctly configured to proxy WebSocket connections');
    console.log('- Verify that the WebSocket proxy is accessible from Cloud Run');
    console.log('- Check if CORS is correctly configured');
  }
  
  if (serverApiSuccess && directK8sSuccess && !cloudRunSuccess) {
    console.log('- The issue appears to be with the Cloud Run to Kubernetes connection');
    console.log('- Check if the IAP or VPC connector is correctly configured');
  }
  
  process.exit(0);
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
