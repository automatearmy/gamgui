/**
 * Secret Manager Utility
 * 
 * This utility provides functions for interacting with Google Cloud Secret Manager
 * to store and retrieve GAM credentials.
 */
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Initialize the Secret Manager client
const secretManager = new SecretManagerServiceClient();

// Get the project ID from environment variables
const projectId = process.env.PROJECT_ID || 'gamgui-tf-1';

/**
 * Save a secret to Secret Manager
 * @param {string} secretId - The ID of the secret to save
 * @param {string|Buffer} payload - The secret content
 * @returns {Promise<object>} - The created secret version
 */
async function saveToSecretManager(secretId, payload) {
  try {
    const parent = `projects/${projectId}`;
    
    // Check if the secret exists
    try {
      await secretManager.getSecret({
        name: `${parent}/secrets/${secretId}`
      });
      console.log(`Secret ${secretId} already exists, adding new version`);
    } catch (error) {
      // Create the secret if it doesn't exist
      console.log(`Creating secret ${secretId}...`);
      await secretManager.createSecret({
        parent,
        secretId,
        secret: {
          replication: {
            automatic: {}
          }
        }
      });
    }
    
    // Add a new version to the secret
    const [version] = await secretManager.addSecretVersion({
      parent: `${parent}/secrets/${secretId}`,
      payload: {
        data: Buffer.from(payload)
      }
    });
    
    console.log(`Added secret version ${version.name}`);
    
    return version;
  } catch (error) {
    console.error(`Error saving to Secret Manager: ${error}`);
    throw error;
  }
}

/**
 * Retrieve the latest version of a secret
 * @param {string} secretId - The ID of the secret to retrieve
 * @returns {Promise<Buffer>} - The secret content
 */
async function getFromSecretManager(secretId) {
  const name = `projects/${projectId}/secrets/${secretId}/versions/latest`;
  
  const [version] = await secretManager.accessSecretVersion({
    name
  });
  
  return version.payload.data;
}

/**
 * List all secrets in the project
 * @returns {Promise<Array>} - Array of secret objects
 */
async function listSecrets() {
  const parent = `projects/${projectId}`;
  
  try {
    const [secrets] = await secretManager.listSecrets({
      parent
    });
    
    // Filter secrets that are related to GAM credentials
    const credentialSecrets = secrets.filter(secret => {
      const name = secret.name.split('/').pop();
      return name.startsWith('gam-') || 
             name === 'client-secrets' || 
             name === 'oauth2' || 
             name === 'oauth2service';
    });
    
    // Format the response
    return credentialSecrets.map(secret => {
      const name = secret.name.split('/').pop();
      return {
        id: name,
        name: name,
        createTime: secret.createTime,
        labels: secret.labels || {}
      };
    });
  } catch (error) {
    console.error('Error listing secrets:', error);
    throw error;
  }
}

module.exports = {
  saveToSecretManager,
  getFromSecretManager,
  listSecrets
};
