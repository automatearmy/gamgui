/**
 * Script to check if the application is still working correctly
 * This script verifies the status of the Cloud Run service and GKE cluster
 */
const axios = require('axios');
const { execSync } = require('child_process');

// Colors for output
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

// Function to print colored messages
function log(color, message) {
  console.log(`${color}${message}${RESET}`);
}

// URL of the server
const SERVER_URL = process.env.SERVER_URL || 'https://gamgui-server-1381612022.us-central1.run.app';

// Function to check if the server is running
async function checkServerStatus() {
  log(YELLOW, '\n=== Checking server status ===');
  
  try {
    const response = await axios.get(`${SERVER_URL}/api/version`);
    
    if (response.status === 200) {
      log(GREEN, '✅ Server is running');
      log(GREEN, `Version: ${JSON.stringify(response.data)}`);
      return true;
    } else {
      log(RED, `❌ Server returned status ${response.status}`);
      log(RED, `Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    log(RED, '❌ Error connecting to server:');
    log(RED, `Status: ${error.response?.status || 'Unknown'}`);
    log(RED, `Message: ${error.message}`);
    return false;
  }
}

// Function to check GKE cluster status
function checkGkeClusterStatus() {
  log(YELLOW, '\n=== Checking GKE cluster status ===');
  
  try {
    const output = execSync('kubectl get nodes').toString();
    log(GREEN, '✅ GKE cluster is accessible');
    log(GREEN, 'Nodes:');
    console.log(output);
    return true;
  } catch (error) {
    log(RED, '❌ Error accessing GKE cluster:');
    log(RED, error.message);
    return false;
  }
}

// Function to check if pods are running
function checkPodsStatus() {
  log(YELLOW, '\n=== Checking pods status ===');
  
  try {
    const output = execSync('kubectl get pods -n gamgui').toString();
    log(GREEN, '✅ Pods are accessible');
    log(GREEN, 'Pods:');
    console.log(output);
    return true;
  } catch (error) {
    log(RED, '❌ Error accessing pods:');
    log(RED, error.message);
    return false;
  }
}

// Main function
async function main() {
  log(GREEN, '=== Application Status Check ===');
  
  const serverStatus = await checkServerStatus();
  const gkeStatus = checkGkeClusterStatus();
  const podsStatus = checkPodsStatus();
  
  log(YELLOW, '\n=== Summary ===');
  log(serverStatus ? GREEN : RED, `Server status: ${serverStatus ? 'OK' : 'FAIL'}`);
  log(gkeStatus ? GREEN : RED, `GKE cluster status: ${gkeStatus ? 'OK' : 'FAIL'}`);
  log(podsStatus ? GREEN : RED, `Pods status: ${podsStatus ? 'OK' : 'FAIL'}`);
  
  if (serverStatus && gkeStatus && podsStatus) {
    log(GREEN, '\n✅ Application is working correctly');
  } else {
    log(RED, '\n❌ Application has issues');
  }
}

// Run the main function
main().catch(error => {
  log(RED, `Unhandled error: ${error.message}`);
  process.exit(1);
});
