/**
 * Secret Manager Integration for gamgui-server
 * 
 * This file contains functions for integrating Google Secret Manager
 * with the gamgui-server application. It provides functionality to:
 * 
 * 1. Save uploaded credential files to Secret Manager
 * 2. Retrieve secrets from Secret Manager when needed
 */

const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');
const secretManager = new SecretManagerServiceClient();

// Get project ID from environment variable (set in Cloud Run)
const projectId = process.env.PROJECT_ID || 'gamgui-tf-1';

/**
 * Save content to Secret Manager
 * @param {string} secretId - The ID of the secret (e.g., 'client-secrets', 'oauth2', 'oauth2service')
 * @param {string|Buffer} content - The content to save
 * @returns {Promise<void>}
 */
async function saveToSecretManager(secretId, content) {
  const parent = `projects/${projectId}`;
  
  try {
    // Check if secret exists
    await secretManager.getSecret({
      name: `${parent}/secrets/${secretId}`
    });
  } catch (error) {
    // Create secret if it doesn't exist
    await secretManager.createSecret({
      parent,
      secretId,
      secret: {
        replication: {
          userManaged: {
            replicas: [
              {
                location: 'us-central1'
              }
            ]
          }
        }
      }
    });
  }
  
  // Add new secret version
  await secretManager.addSecretVersion({
    parent: `${parent}/secrets/${secretId}`,
    payload: {
      data: Buffer.from(content)
    }
  });
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

module.exports = {
  saveToSecretManager,
  getFromSecretManager
};
