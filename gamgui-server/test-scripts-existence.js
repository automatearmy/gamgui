const { execSync } = require('child_process');

console.log('Checking if scripts exist in the server...');

try {
  // List all files in the scripts directory
  const result = execSync('ls -la /app/scripts/').toString();
  console.log('Files in /app/scripts/:');
  console.log(result);

  // Check if configure-kubectl.sh exists
  try {
    const configureKubectlExists = execSync('test -f /app/scripts/configure-kubectl.sh && echo "exists" || echo "not found"').toString().trim();
    console.log(`configure-kubectl.sh ${configureKubectlExists}`);
  } catch (error) {
    console.error('Error checking configure-kubectl.sh:', error.message);
  }

  // Check if create-websocket-session.sh exists
  try {
    const createWebsocketSessionExists = execSync('test -f /app/scripts/create-websocket-session.sh && echo "exists" || echo "not found"').toString().trim();
    console.log(`create-websocket-session.sh ${createWebsocketSessionExists}`);
  } catch (error) {
    console.error('Error checking create-websocket-session.sh:', error.message);
  }

  // Check if the scripts are executable
  try {
    const configureKubectlExecutable = execSync('test -x /app/scripts/configure-kubectl.sh && echo "executable" || echo "not executable"').toString().trim();
    console.log(`configure-kubectl.sh is ${configureKubectlExecutable}`);
  } catch (error) {
    console.error('Error checking if configure-kubectl.sh is executable:', error.message);
  }

  try {
    const createWebsocketSessionExecutable = execSync('test -x /app/scripts/create-websocket-session.sh && echo "executable" || echo "not executable"').toString().trim();
    console.log(`create-websocket-session.sh is ${createWebsocketSessionExecutable}`);
  } catch (error) {
    console.error('Error checking if create-websocket-session.sh is executable:', error.message);
  }

  // Check if kubectl is installed
  try {
    const kubectlVersion = execSync('kubectl version --client').toString();
    console.log('kubectl version:');
    console.log(kubectlVersion);
  } catch (error) {
    console.error('Error checking kubectl version:', error.message);
  }

  // Check if gcloud is installed
  try {
    const gcloudVersion = execSync('gcloud version').toString();
    console.log('gcloud version:');
    console.log(gcloudVersion);
  } catch (error) {
    console.error('Error checking gcloud version:', error.message);
  }

  // Check environment variables
  console.log('Environment variables:');
  console.log(`GKE_CLUSTER_NAME: ${process.env.GKE_CLUSTER_NAME || 'not set'}`);
  console.log(`GKE_CLUSTER_LOCATION: ${process.env.GKE_CLUSTER_LOCATION || 'not set'}`);
  console.log(`PROJECT_ID: ${process.env.PROJECT_ID || 'not set'}`);

} catch (error) {
  console.error('Error:', error.message);
}
