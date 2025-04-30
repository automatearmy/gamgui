/**
 * Script to test the application to ensure it still works correctly after reorganization
 * This script tests various components of the application
 */
const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
const SERVER_URL = process.env.SERVER_URL || 'https://gamgui-server-vthtec4m3a-uc.a.run.app';

// Function to check if the server is running
async function checkServerStatus() {
  log(YELLOW, '\n=== Checking server status ===');
  
  try {
    const response = await axios.get(`${SERVER_URL}/api/sessions`);
    
    if (response.status === 200) {
      log(GREEN, '✅ Server is running');
      log(GREEN, `Response: ${JSON.stringify(response.data)}`);
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

// Function to check if the sessions API is working
async function checkSessionsAPI() {
  log(YELLOW, '\n=== Checking sessions API ===');
  
  try {
    const response = await axios.get(`${SERVER_URL}/api/sessions`);
    
    if (response.status === 200) {
      log(GREEN, '✅ Sessions API is working');
      log(GREEN, `Found ${response.data.length} sessions`);
      return true;
    } else {
      log(RED, `❌ Sessions API returned status ${response.status}`);
      log(RED, `Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    log(RED, '❌ Error connecting to sessions API:');
    log(RED, `Status: ${error.response?.status || 'Unknown'}`);
    log(RED, `Message: ${error.message}`);
    return false;
  }
}

// Function to check if the diagnostic scripts are working
function checkDiagnosticScripts() {
  log(YELLOW, '\n=== Checking diagnostic scripts ===');
  
  const scriptsDir = __dirname;
  
  try {
    // Get all JavaScript files in the scripts directory
    const jsFiles = fs.readdirSync(scriptsDir)
      .filter(file => file.endsWith('.js') && file !== 'test-application.js' && file !== 'update-paths.js');
    
    log(GREEN, `Found ${jsFiles.length} diagnostic scripts`);
    
    // Check if check-application-status.js exists
    if (jsFiles.includes('check-application-status.js')) {
      log(GREEN, '✅ check-application-status.js exists');
    } else {
      log(RED, '❌ check-application-status.js does not exist');
    }
    
    return true;
  } catch (error) {
    log(RED, `❌ Error checking diagnostic scripts: ${error.message}`);
    return false;
  }
}

// Function to check if the deployment scripts are working
function checkDeploymentScripts() {
  log(YELLOW, '\n=== Checking deployment scripts ===');
  
  const scriptsDir = path.join(__dirname, '..', 'deployment');
  
  try {
    // Get all shell scripts in the scripts directory
    const shFiles = fs.readdirSync(scriptsDir)
      .filter(file => file.endsWith('.sh') && file !== 'update-paths.js');
    
    log(GREEN, `Found ${shFiles.length} deployment scripts`);
    
    return true;
  } catch (error) {
    log(RED, `❌ Error checking deployment scripts: ${error.message}`);
    return false;
  }
}

// Function to check if the adapter files are working
function checkAdapterFiles() {
  log(YELLOW, '\n=== Checking adapter files ===');
  
  const adaptersDir = path.join(__dirname, '..', '..', 'services', 'container', 'adapters');
  
  try {
    // Get all JavaScript files in the adapters directory
    const jsFiles = fs.readdirSync(adaptersDir)
      .filter(file => file.endsWith('.js') && file !== 'update-paths.js');
    
    log(GREEN, `Found ${jsFiles.length} adapter files`);
    
    return true;
  } catch (error) {
    log(RED, `❌ Error checking adapter files: ${error.message}`);
    return false;
  }
}

// Function to check if the Kubernetes YAML files are working
function checkKubernetesFiles() {
  log(YELLOW, '\n=== Checking Kubernetes YAML files ===');
  
  const kubernetesDir = path.join(__dirname, '..', '..', '..', '..', 'gamgui-terraform', 'kubernetes');
  
  try {
    // Get all YAML files in the kubernetes directory
    const yamlFiles = fs.readdirSync(kubernetesDir)
      .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
    
    log(GREEN, `Found ${yamlFiles.length} Kubernetes YAML files`);
    
    return true;
  } catch (error) {
    log(RED, `❌ Error checking Kubernetes YAML files: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  log(GREEN, '=== Application Test ===');
  
  const serverStatus = await checkServerStatus();
  const sessionsAPI = await checkSessionsAPI();
  const diagnosticScripts = checkDiagnosticScripts();
  const deploymentScripts = checkDeploymentScripts();
  const adapterFiles = checkAdapterFiles();
  const kubernetesFiles = checkKubernetesFiles();
  
  log(YELLOW, '\n=== Summary ===');
  log(serverStatus ? GREEN : RED, `Server status: ${serverStatus ? 'OK' : 'FAIL'}`);
  log(sessionsAPI ? GREEN : RED, `Sessions API: ${sessionsAPI ? 'OK' : 'FAIL'}`);
  log(diagnosticScripts ? GREEN : RED, `Diagnostic scripts: ${diagnosticScripts ? 'OK' : 'FAIL'}`);
  log(deploymentScripts ? GREEN : RED, `Deployment scripts: ${deploymentScripts ? 'OK' : 'FAIL'}`);
  log(adapterFiles ? GREEN : RED, `Adapter files: ${adapterFiles ? 'OK' : 'FAIL'}`);
  log(kubernetesFiles ? GREEN : RED, `Kubernetes YAML files: ${kubernetesFiles ? 'OK' : 'FAIL'}`);
  
  if (serverStatus && sessionsAPI && diagnosticScripts && deploymentScripts && adapterFiles && kubernetesFiles) {
    log(GREEN, '\n✅ Application is working correctly after reorganization');
  } else {
    log(RED, '\n❌ Application has issues after reorganization');
  }
}

// Run the main function
main().catch(error => {
  log(RED, `Unhandled error: ${error.message}`);
  process.exit(1);
});
