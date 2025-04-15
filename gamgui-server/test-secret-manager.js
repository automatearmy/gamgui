/**
 * Test script for Secret Manager integration
 * 
 * This script tests the Secret Manager integration by:
 * 1. Saving sample credential files to Secret Manager
 * 2. Retrieving the credentials from Secret Manager
 * 
 * To run this script:
 * 1. Make sure the PROJECT_ID environment variable is set
 * 2. Run: node test-secret-manager.js
 */

const fs = require('fs');
const path = require('path');
const { saveToSecretManager, getFromSecretManager } = require('./utils/secretManager');

// Set project ID if not already set
process.env.PROJECT_ID = process.env.PROJECT_ID || 'gamgui-tf-1';

// Sample credential files
const sampleFiles = [
  {
    secretId: 'client-secrets',
    filePath: path.join(__dirname, 'sample-client-secrets.json'),
    content: JSON.stringify({
      installed: {
        client_id: 'sample-client-id.apps.googleusercontent.com',
        project_id: 'sample-project-id',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_secret: 'sample-client-secret',
        redirect_uris: ['http://localhost']
      }
    }, null, 2)
  },
  {
    secretId: 'oauth2',
    filePath: path.join(__dirname, 'sample-oauth2.txt'),
    content: JSON.stringify({
      access_token: 'sample-access-token',
      refresh_token: 'sample-refresh-token',
      scope: 'https://www.googleapis.com/auth/drive',
      token_type: 'Bearer',
      expiry_date: 1650000000000
    }, null, 2)
  },
  {
    secretId: 'oauth2service',
    filePath: path.join(__dirname, 'sample-oauth2service.json'),
    content: JSON.stringify({
      type: 'service_account',
      project_id: 'sample-project-id',
      private_key_id: 'sample-private-key-id',
      private_key: '-----BEGIN PRIVATE KEY-----\nSAMPLE_PRIVATE_KEY\n-----END PRIVATE KEY-----\n',
      client_email: 'sample-service-account@sample-project-id.iam.gserviceaccount.com',
      client_id: 'sample-client-id',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/sample-service-account%40sample-project-id.iam.gserviceaccount.com'
    }, null, 2)
  }
];

/**
 * Create sample credential files
 */
function createSampleFiles() {
  console.log('Creating sample credential files...');
  
  sampleFiles.forEach(file => {
    fs.writeFileSync(file.filePath, file.content);
    console.log(`Created ${file.filePath}`);
  });
}

/**
 * Save sample credential files to Secret Manager
 */
async function saveToSecretManagerTest() {
  console.log('\nSaving sample credential files to Secret Manager...');
  
  for (const file of sampleFiles) {
    try {
      await saveToSecretManager(file.secretId, file.content);
      console.log(`✅ Saved ${file.secretId} to Secret Manager`);
    } catch (error) {
      console.error(`❌ Error saving ${file.secretId} to Secret Manager:`, error);
    }
  }
}

/**
 * Retrieve credentials from Secret Manager
 */
async function getFromSecretManagerTest() {
  console.log('\nRetrieving credentials from Secret Manager...');
  
  for (const file of sampleFiles) {
    try {
      const content = await getFromSecretManager(file.secretId);
      console.log(`✅ Retrieved ${file.secretId} from Secret Manager:`);
      console.log(content.toString());
    } catch (error) {
      console.error(`❌ Error retrieving ${file.secretId} from Secret Manager:`, error);
    }
  }
}

/**
 * Clean up sample files
 */
function cleanupSampleFiles() {
  console.log('\nCleaning up sample credential files...');
  
  sampleFiles.forEach(file => {
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
      console.log(`Deleted ${file.filePath}`);
    }
  });
}

/**
 * Run the test
 */
async function runTest() {
  console.log('=== Secret Manager Integration Test ===');
  console.log(`Using project: ${process.env.PROJECT_ID}`);
  
  try {
    // Create sample files
    createSampleFiles();
    
    // Save to Secret Manager
    await saveToSecretManagerTest();
    
    // Retrieve from Secret Manager
    await getFromSecretManagerTest();
    
    // Clean up
    cleanupSampleFiles();
    
    console.log('\n✅ Secret Manager integration test completed successfully!');
  } catch (error) {
    console.error('\n❌ Secret Manager integration test failed:', error);
  }
}

// Run the test
runTest();
