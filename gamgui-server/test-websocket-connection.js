/**
 * Test WebSocket connection to a session
 * 
 * Usage: node test-websocket-connection.js [sessionId]
 * 
 * If sessionId is not provided, it will create a new session.
 */

const WebSocket = require('ws');
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const config = {
  serverUrl: process.env.SERVER_URL || 'https://gamgui-server-vthtec4m3a-uc.a.run.app',
  websocketProxyUrl: process.env.WEBSOCKET_PROXY_URL || 'websocket-proxy.gamgui.svc.cluster.local',
  namespace: process.env.NAMESPACE || 'gamgui',
  sessionId: process.argv[2] || `test-${Date.now().toString(36)}`,
  command: 'info domain'
};

/**
 * Test direct WebSocket connection to the proxy
 */
async function testDirectWebSocketConnection() {
  console.log('\n=== Testing Direct WebSocket Connection ===');
  console.log(`Session ID: ${config.sessionId}`);
  
  const websocketUrl = `ws://${config.websocketProxyUrl}/ws/session/${config.sessionId}/`;
  console.log(`WebSocket URL: ${websocketUrl}`);
  
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(websocketUrl);
      
      ws.on('open', () => {
        console.log('✅ WebSocket connection established successfully!');
        ws.send(config.command);
        console.log(`Sent command: ${config.command}`);
      });
      
      ws.on('message', (data) => {
        console.log(`Received message: ${data}`);
        ws.close();
        resolve(true);
      });
      
      ws.on('error', (error) => {
        console.log(`❌ WebSocket connection error: ${error.message}`);
        resolve(false);
      });
      
      // Set a timeout
      setTimeout(() => {
        if (ws.readyState !== WebSocket.CLOSED) {
          console.log('❌ WebSocket connection timeout');
          ws.close();
          resolve(false);
        }
      }, 10000);
    } catch (error) {
      console.log(`❌ Error creating WebSocket: ${error.message}`);
      resolve(false);
    }
  });
}

/**
 * Test WebSocket connection through the server API
 */
async function testServerWebSocketConnection() {
  console.log('\n=== Testing Server WebSocket Connection ===');
  console.log(`Server URL: ${config.serverUrl}`);
  console.log(`Session ID: ${config.sessionId}`);
  
  try {
    // Get WebSocket info from the server
    const response = await axios.get(`${config.serverUrl}/api/sessions/${config.sessionId}/websocket`);
    const websocketInfo = response.data;
    
    console.log('WebSocket Info:', websocketInfo);
    
    if (!websocketInfo.websocketPath) {
      console.log('❌ No WebSocket path returned from server');
      return false;
    }
    
    // Construct WebSocket URL
    const websocketUrl = `ws://${config.websocketProxyUrl}${websocketInfo.websocketPath}`;
    console.log(`WebSocket URL: ${websocketUrl}`);
    
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(websocketUrl);
        
        ws.on('open', () => {
          console.log('✅ WebSocket connection established successfully!');
          ws.send(config.command);
          console.log(`Sent command: ${config.command}`);
        });
        
        ws.on('message', (data) => {
          console.log(`Received message: ${data}`);
          ws.close();
          resolve(true);
        });
        
        ws.on('error', (error) => {
          console.log(`❌ WebSocket connection error: ${error.message}`);
          resolve(false);
        });
        
        // Set a timeout
        setTimeout(() => {
          if (ws.readyState !== WebSocket.CLOSED) {
            console.log('❌ WebSocket connection timeout');
            ws.close();
            resolve(false);
          }
        }, 10000);
      } catch (error) {
        console.log(`❌ Error creating WebSocket: ${error.message}`);
        resolve(false);
      }
    });
  } catch (error) {
    console.log(`❌ Error getting WebSocket info: ${error.message}`);
    return false;
  }
}

/**
 * Create a test session
 */
async function createTestSession() {
  console.log('\n=== Creating Test Session ===');
  console.log(`Session ID: ${config.sessionId}`);
  
  try {
    // Check if the session already exists
    try {
      const checkCmd = `kubectl get deployment gam-session-${config.sessionId} -n ${config.namespace}`;
      await execAsync(checkCmd);
      console.log('✅ Session already exists');
      return true;
    } catch (error) {
      // Session doesn't exist, create it
      console.log('Creating new session...');
    }
    
    // Create the session using the script
    const createCmd = `cd ../../gamgui-terraform && ./scripts/manage-websocket-sessions.sh create ${config.sessionId} "${config.command}"`;
    const { stdout, stderr } = await execAsync(createCmd);
    
    if (stderr && !stderr.includes('created')) {
      console.log(`❌ Error creating session: ${stderr}`);
      return false;
    }
    
    console.log('✅ Session created successfully');
    console.log(stdout);
    
    // Wait for the session to be ready
    console.log('Waiting for session to be ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return true;
  } catch (error) {
    console.log(`❌ Error creating session: ${error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=== WebSocket Connection Test ===');
  console.log(`Server URL: ${config.serverUrl}`);
  console.log(`WebSocket Proxy URL: ${config.websocketProxyUrl}`);
  console.log(`Session ID: ${config.sessionId}`);
  
  // Create a test session if needed
  const sessionCreated = await createTestSession();
  if (!sessionCreated) {
    console.log('❌ Failed to create test session');
    return;
  }
  
  // Test direct WebSocket connection
  const directResult = await testDirectWebSocketConnection();
  
  // Test server WebSocket connection
  const serverResult = await testServerWebSocketConnection();
  
  // Print summary
  console.log('\n=== Test Summary ===');
  console.log(`Direct WebSocket Connection: ${directResult ? '✅ Success' : '❌ Failed'}`);
  console.log(`Server WebSocket Connection: ${serverResult ? '✅ Success' : '❌ Failed'}`);
  
  // Provide recommendations
  console.log('\n=== Recommendations ===');
  if (directResult && serverResult) {
    console.log('✅ All tests passed! WebSocket connections are working correctly.');
  } else if (directResult && !serverResult) {
    console.log('⚠️ Direct WebSocket connection works, but server API connection fails.');
    console.log('This suggests an issue with the server configuration or API.');
    console.log('Check the server logs and WebSocket environment variables.');
  } else if (!directResult && serverResult) {
    console.log('⚠️ Server API connection works, but direct WebSocket connection fails.');
    console.log('This is unusual and suggests a network or proxy configuration issue.');
  } else {
    console.log('❌ All tests failed. WebSocket connections are not working.');
    console.log('Check the following:');
    console.log('1. WebSocket proxy deployment is running');
    console.log('2. Session pod is running');
    console.log('3. Network policies allow WebSocket connections');
    console.log('4. Server environment variables are correctly configured');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
