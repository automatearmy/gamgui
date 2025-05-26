/**
 * Secret Manager Utility
 * 
 * This utility provides functions for interacting with Google Cloud Secret Manager
 * to store and retrieve GAM credentials.
 */
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const path = require('path');
const fs = require('fs');

// Initialize the Secret Manager client
const secretManager = new SecretManagerServiceClient();

// Load environment configuration
function loadEnvironmentConfig() {
  // Try to get environment from process.env first
  const environment = process.env.GAMGUI_ENVIRONMENT || process.env.NODE_ENV || 'stage';
  
  // Try to load from environments.json
  const configPath = path.join(__dirname, '../../config/environments.json');
  
  if (fs.existsSync(configPath)) {
    try {
      const environments = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (environments[environment]) {
        return environments[environment];
      }
    } catch (error) {
      console.warn('Failed to load environment config:', error.message);
    }
  }
  
  // Fallback to environment variables or defaults
  return {
    PROJECT_ID: process.env.PROJECT_ID || process.env.GAMGUI_PROJECT_ID || 'gamgui-tf1-edu',
    SECRET_MANAGER_PROJECT_ID: process.env.SECRET_MANAGER_PROJECT_ID || process.env.GAMGUI_PROJECT_ID || 'gamgui-tf1-edu'
  };
}

// Get project configuration
const config = loadEnvironmentConfig();
const projectId = config.SECRET_MANAGER_PROJECT_ID || config.PROJECT_ID;

console.log(`[SecretManager] Using project: ${projectId}`);

/**
 * Save a secret to Secret Manager
 * @param {string} secretId - The ID of the secret to save
 * @param {string|Buffer} payload - The secret content
 * @param {string} [userId] - Optional user ID to create user-specific secrets
 * @returns {Promise<object>} - The created secret version
 */
async function saveToSecretManager(secretId, payload, userId) {
  // If userId is provided, prefix the secretId with the userId
  const finalSecretId = userId ? `user-${userId}-${secretId}` : secretId;
  try {
    const parent = `projects/${projectId}`;
    
    // Check if the secret exists
    try {
      await secretManager.getSecret({
        name: `${parent}/secrets/${finalSecretId}`
      });
      console.log(`Secret ${finalSecretId} already exists, adding new version`);
    } catch (error) {
      // Create the secret if it doesn't exist
      console.log(`Creating secret ${finalSecretId}...`);
      await secretManager.createSecret({
        parent,
        secretId: finalSecretId,
        secret: {
          replication: {
            automatic: {}
          }
        }
      });
    }
    
    // Add a new version to the secret
    const [version] = await secretManager.addSecretVersion({
      parent: `${parent}/secrets/${finalSecretId}`,
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
 * @param {string} [userId] - Optional user ID to retrieve user-specific secrets
 * @returns {Promise<Buffer>} - The secret content
 */
async function getFromSecretManager(secretId, userId) {
  // If userId is provided, prefix the secretId with the userId
  const finalSecretId = userId ? `user-${userId}-${secretId}` : secretId;
  const name = `projects/${projectId}/secrets/${finalSecretId}/versions/latest`;
  
  const [version] = await secretManager.accessSecretVersion({
    name
  });
  
  return version.payload.data;
}

/**
 * List all secrets in the project
 * @param {string} [userId] - Optional user ID to filter user-specific secrets
 * @returns {Promise<Array>} - Array of secret objects
 */
async function listSecrets(userId) {
  const parent = `projects/${projectId}`;
  
  try {
    const [secrets] = await secretManager.listSecrets({
      parent
    });
    
    // Filter secrets based on userId if provided
    let credentialSecrets;
    if (userId) {
      // Filter for user-specific secrets
      const userPrefix = `user-${userId}-`;
      credentialSecrets = secrets.filter(secret => {
        const name = secret.name.split('/').pop();
        return name.startsWith(userPrefix);
      });
    } else {
      // Filter for global secrets (no user prefix)
      credentialSecrets = secrets.filter(secret => {
        const name = secret.name.split('/').pop();
        return name.startsWith('gam-') || 
               name === 'client-secrets' || 
               name === 'oauth2' || 
               name === 'oauth2service';
      });
    }
    
    // Format the response
    return credentialSecrets.map(secret => {
      const name = secret.name.split('/').pop();
      // For user secrets, remove the user prefix from the ID
      const id = userId && name.startsWith(`user-${userId}-`) 
        ? name.substring(`user-${userId}-`.length) 
        : name;
      
      return {
        id: id,
        name: name,
        userId: userId || null,
        createTime: secret.createTime,
        labels: secret.labels || {}
      };
    });
  } catch (error) {
    console.error('Error listing secrets:', error);
    throw error;
  }
}

/**
 * Delete a secret from Secret Manager
 * @param {string} secretId - The ID of the secret to delete
 * @param {string} [userId] - Optional user ID to delete user-specific secrets
 * @returns {Promise<void>}
 */
async function deleteFromSecretManager(secretId, userId) {
  // If userId is provided, prefix the secretId with the userId
  const finalSecretId = userId ? `user-${userId}-${secretId}` : secretId;
  const name = `projects/${projectId}/secrets/${finalSecretId}`;
  
  try {
    await secretManager.deleteSecret({
      name
    });
    
    console.log(`Deleted secret ${finalSecretId}`);
  } catch (error) {
    console.error(`Error deleting secret from Secret Manager: ${error}`);
    throw error;
  }
}

module.exports = {
  saveToSecretManager,
  getFromSecretManager,
  listSecrets,
  deleteFromSecretManager
};
