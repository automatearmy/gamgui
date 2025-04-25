/**
 * Test script to verify that the ContainerFactory correctly uses KubernetesAdapter in Cloud Run
 * 
 * This script simulates a Cloud Run environment and verifies that the ContainerFactory
 * correctly returns a KubernetesAdapter instance, even if kubernetes.enabled is false.
 * 
 * Run with: node test-cloud-run-adapter.js
 */

// Set up environment to simulate Cloud Run
process.env.CLOUD_RUN_REVISION = 'test-revision';

// Import required modules
const ContainerFactory = require('./services/container/ContainerFactory');
const KubernetesAdapter = require('./services/container/KubernetesAdapter');
const DockerAdapter = require('./services/container/DockerAdapter');
const config = require('./config/config');

// Create a mock logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  debug: (message) => console.log(`[DEBUG] ${message}`),
  warn: (message) => console.log(`[WARN] ${message}`),
  error: (message, error) => console.error(`[ERROR] ${message}`, error)
};

// Test with kubernetes.enabled = false
const originalEnabled = config.kubernetes.enabled;
config.kubernetes.enabled = false;

console.log('=== Testing ContainerFactory in Cloud Run environment ===');
console.log(`Original kubernetes.enabled: ${originalEnabled}`);
console.log(`Modified kubernetes.enabled: ${config.kubernetes.enabled}`);

try {
  // Create container service
  const containerService = ContainerFactory.createContainerService(config, logger);
  
  // Check if it's a KubernetesAdapter
  const isKubernetesAdapter = containerService instanceof KubernetesAdapter;
  const isDockerAdapter = containerService instanceof DockerAdapter;
  
  console.log(`Container service is KubernetesAdapter: ${isKubernetesAdapter}`);
  console.log(`Container service is DockerAdapter: ${isDockerAdapter}`);
  
  if (isKubernetesAdapter) {
    console.log('✅ TEST PASSED: ContainerFactory correctly returned KubernetesAdapter in Cloud Run environment');
  } else {
    console.log('❌ TEST FAILED: ContainerFactory did not return KubernetesAdapter in Cloud Run environment');
  }
} catch (error) {
  console.error('Error during test:', error);
}

// Restore original config
config.kubernetes.enabled = originalEnabled;
