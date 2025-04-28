// Script to test if the scripts exist in the Cloud Run container
const express = require('express');
const { execSync } = require('child_process');

const app = express();
const port = process.env.PORT || 3001;

app.get('/test-scripts', (req, res) => {
  console.log('Testing scripts in Cloud Run...');
  const results = { success: true, details: {} };

  try {
    // List all files in the scripts directory
    try {
      const scriptsList = execSync('ls -la /app/scripts/').toString();
      results.details.scriptsList = scriptsList;
    } catch (error) {
      results.success = false;
      results.details.scriptsListError = error.message;
    }

    // Check if configure-kubectl.sh exists
    try {
      const configureKubectlExists = execSync('test -f /app/scripts/configure-kubectl.sh && echo "exists" || echo "not found"').toString().trim();
      results.details.configureKubectlExists = configureKubectlExists;
    } catch (error) {
      results.success = false;
      results.details.configureKubectlExistsError = error.message;
    }

    // Check if create-websocket-session.sh exists
    try {
      const createWebsocketSessionExists = execSync('test -f /app/scripts/create-websocket-session.sh && echo "exists" || echo "not found"').toString().trim();
      results.details.createWebsocketSessionExists = createWebsocketSessionExists;
    } catch (error) {
      results.success = false;
      results.details.createWebsocketSessionExistsError = error.message;
    }

    // Check if the scripts are executable
    try {
      const configureKubectlExecutable = execSync('test -x /app/scripts/configure-kubectl.sh && echo "executable" || echo "not executable"').toString().trim();
      results.details.configureKubectlExecutable = configureKubectlExecutable;
    } catch (error) {
      results.success = false;
      results.details.configureKubectlExecutableError = error.message;
    }

    try {
      const createWebsocketSessionExecutable = execSync('test -x /app/scripts/create-websocket-session.sh && echo "executable" || echo "not executable"').toString().trim();
      results.details.createWebsocketSessionExecutable = createWebsocketSessionExecutable;
    } catch (error) {
      results.success = false;
      results.details.createWebsocketSessionExecutableError = error.message;
    }

    // Check if kubectl is installed
    try {
      const kubectlVersion = execSync('kubectl version --client').toString();
      results.details.kubectlVersion = kubectlVersion;
    } catch (error) {
      results.success = false;
      results.details.kubectlVersionError = error.message;
    }

    // Check if gcloud is installed
    try {
      const gcloudVersion = execSync('gcloud version').toString();
      results.details.gcloudVersion = gcloudVersion;
    } catch (error) {
      results.success = false;
      results.details.gcloudVersionError = error.message;
    }

    // Check environment variables
    results.details.environmentVariables = {
      GKE_CLUSTER_NAME: process.env.GKE_CLUSTER_NAME || 'not set',
      GKE_CLUSTER_LOCATION: process.env.GKE_CLUSTER_LOCATION || 'not set',
      PROJECT_ID: process.env.PROJECT_ID || 'not set'
    };

    res.json(results);
  } catch (error) {
    results.success = false;
    results.details.generalError = error.message;
    res.status(500).json(results);
  }
});

app.get('/', (req, res) => {
  res.send('Test server is running. Go to /test-scripts to test the scripts.');
});

app.listen(port, () => {
  console.log(`Test server listening at http://localhost:${port}`);
});
