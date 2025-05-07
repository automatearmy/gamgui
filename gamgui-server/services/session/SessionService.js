/**
 * Service for managing sessions
 */
const { v4: uuidv4 } = require('uuid');
const { Storage } = require('@google-cloud/storage');
const { NotFoundError, BadRequestError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

// TODO: Consider moving bucket prefix and project ID to config/env vars
const GCS_BUCKET_PREFIX = 'gamgui-session-files-';
const GCS_PROJECT_ID = process.env.GCS_PROJECT_ID || process.env.PROJECT_ID; // Use specific GCS project ID if available

/**
 * Service for managing sessions
 */
class SessionService {
  /**
   * Create a new SessionService
   * @param {import('./SessionRepository')} sessionRepository - Repository for session data
   * @param {import('../container/ContainerService')} containerService - Service for container operations
   */
  constructor(sessionRepository, containerService) {
    this.sessionRepository = sessionRepository;
    this.containerService = containerService;
    if (!GCS_PROJECT_ID) {
      logger.warn('GCS_PROJECT_ID environment variable is not set. GCS features will be disabled.');
      this.storage = null;
    } else {
      this.storage = new Storage({ projectId: GCS_PROJECT_ID });
    }
  }

  /**
   * Get a session by ID
   * @param {string} sessionId - The session ID
   * @returns {Promise<import('./SessionRepository').Session>} - The session
   * @throws {NotFoundError} - If the session is not found
   */
  async getSession(sessionId) {
    const session = this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }
    return session;
  }

  /**
   * Get all sessions
   * @returns {Promise<import('./SessionRepository').Session[]>} - All sessions
   */
  async getSessions() {
    return this.sessionRepository.findAll();
  }

  /**
   * Create a new session
   * @param {object} sessionData - The session data
   * @param {string} sessionData.name - Session name
   * @param {string} sessionData.imageId - Image ID
   * @param {object} [sessionData.config={}] - Session configuration
   * @param {string} [sessionData.credentialsSecret] - Credentials secret name
   * @returns {Promise<object>} - The created session and websocket info
   * @throws {BadRequestError} - If the session data is invalid
   */
  async createSession(sessionData) {
    if (!sessionData.name) {
      throw new BadRequestError('Session name is required');
    }

    // Check the number of active sessions
    const sessions = await this.sessionRepository.findAll();
    const activeSessions = sessions.filter(s => s.status === 'active');
    
    // Get the maximum number of sessions from environment variable or use default
    const maxSessions = parseInt(process.env.MAX_SESSIONS || '20', 10);
    
    if (activeSessions.length >= maxSessions) {
      logger.warn(`Maximum number of active sessions (${maxSessions}) reached. Current count: ${activeSessions.length}`);
      throw new BadRequestError(`Maximum number of active sessions (${maxSessions}) reached. Please delete some sessions before creating new ones.`);
    }

    // Generate session ID
    const sessionId = uuidv4();
    const containerName = `gam-session-${sessionId.substring(0, 8)}`;
    const containerId = `container-${sessionId}`;

    // Create the session record
    const newSession = {
      id: sessionId,
      name: sessionData.name,
      containerId,
      containerName,
      imageId: sessionData.imageId || 'default-gam-image',
      imageName: sessionData.imageName || 'Default GAM Image',
      config: sessionData.config || {},
      status: 'active',
      userId: sessionData.userId || null // Store userId in the session
    };

    // --- GCS Bucket Creation ---
    let gcsBucketName = null;
    if (this.storage) {
      gcsBucketName = `${GCS_BUCKET_PREFIX}${sessionId}`;
      try {
        logger.info(`Creating GCS bucket: ${gcsBucketName} in project ${GCS_PROJECT_ID}`);
        await this.storage.createBucket(gcsBucketName, {
          location: process.env.GCS_BUCKET_LOCATION || 'US-CENTRAL1', // Make location configurable
          storageClass: 'STANDARD', // Or configure as needed
          lifecycle: { // Optional: Auto-delete objects/bucket after some time
             rule: [{
               action: { type: 'Delete' },
               condition: { age: 7 } // Delete objects older than 7 days
             }]
          }
        });
        logger.info(`Successfully created GCS bucket: ${gcsBucketName}`);
        // Add bucket name to session data
        newSession.gcsBucketName = gcsBucketName;
      } catch (gcsError) {
        logger.error(`Failed to create GCS bucket ${gcsBucketName}:`, gcsError);
        // Rollback session record creation if bucket creation fails
        try {
          await this.sessionRepository.delete(sessionId);
          logger.warn(`Rolled back session record creation for ${sessionId} due to GCS bucket error.`);
        } catch (deleteError) {
          logger.error(`Failed to rollback session record for ${sessionId}:`, deleteError);
        }
        // Re-throw the error to prevent further session setup
        throw new Error(`Failed to create GCS bucket: ${gcsError.message}`);
      }
    } else {
       logger.warn(`GCS storage client not initialized. Skipping bucket creation for session ${sessionId}.`);
    }
    // --- End GCS Bucket Creation ---

    // Save the session (now potentially includes gcsBucketName)
    await this.sessionRepository.save(newSession);
    logger.info(`Created session: ${sessionId} ${gcsBucketName ? `with GCS bucket ${gcsBucketName}` : ''}`);

    // Create container for the session
    let containerInfo;
    try {
      containerInfo = await this.containerService.createContainer(sessionId, {
        cpu: sessionData.config?.resources?.cpu || '500m',
        memory: sessionData.config?.resources?.memory || '512Mi',
        credentialsSecret: sessionData.credentialsSecret || 'gam-credentials'
      });

      // Save container info
      this.sessionRepository.saveContainerInfo(sessionId, containerInfo);
      logger.info(`Created container for session: ${sessionId}`);
    } catch (error) {
      logger.error(`Error creating container for session ${sessionId}:`, error);
      // IMPORTANT: Do not save fallback virtual info if a container was attempted.
      // Let the session creation fail cleanly or attempt cleanup if needed.
      // We re-throw the error to indicate session creation failed.
      // Cleanup potentially created resources might be needed here or in ContainerService.
      
      // Attempt to delete the session record we created earlier
      try {
        await this.sessionRepository.delete(sessionId);
        logger.warn(`Rolled back session record creation for ${sessionId} due to container error.`);
      } catch (deleteError) {
        logger.error(`Failed to rollback session record for ${sessionId}:`, deleteError);
      }
      
      // --- Rollback GCS Bucket on Container Error ---
      if (gcsBucketName && this.storage) {
        logger.warn(`Attempting to delete GCS bucket ${gcsBucketName} due to container creation error for session ${sessionId}.`);
        try {
          // Force delete bucket and contents
          await this.storage.bucket(gcsBucketName).delete({ force: true });
          logger.info(`Successfully deleted GCS bucket ${gcsBucketName} during rollback.`);
        } catch (gcsDeleteError) {
          logger.error(`Failed to delete GCS bucket ${gcsBucketName} during rollback:`, gcsDeleteError);
          // Log error but continue throwing the original container error
        }
      }
      // --- End Rollback GCS Bucket ---

      // Re-throw the original container creation error
      throw error;

      /* // Original fallback logic (removed):
      containerInfo = {
        id: containerId,
        sessionId,
        virtual: true,
        stream: null
      };
      this.sessionRepository.saveContainerInfo(sessionId, containerInfo);
      logger.info(`Created virtual session: ${sessionId}`);
      */
    }

    // Return session and websocket info
    return {
      session: newSession,
      websocketInfo: containerInfo.websocketPath ? {
        path: containerInfo.websocketPath,
        serviceName: containerInfo.serviceName
      } : null
    };
  }

  /**
   * Delete a session
   * @param {string} sessionId - The session ID
   * @returns {Promise<void>}
   * @throws {NotFoundError} - If the session is not found
   */
  async deleteSession(sessionId) {
    const session = this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }

    // Get container info
    const containerInfo = this.sessionRepository.getContainerInfo(sessionId);

    if (containerInfo) {
      try {
        // Delete container
        await this.containerService.deleteContainer(sessionId);
        logger.info(`Deleted container for session: ${sessionId}`);
      } catch (error) {
        logger.error(`Error deleting container for session ${sessionId}:`, error);
        // Continue with session removal even if container deletion fails
      }

      // Delete container info
      this.sessionRepository.deleteContainerInfo(sessionId);
    }

    // --- GCS Bucket Deletion ---
    if (session.gcsBucketName && this.storage) {
      const bucketName = session.gcsBucketName;
      logger.info(`Attempting to delete GCS bucket: ${bucketName} for session ${sessionId}`);
      try {
        // Optional: Empty the bucket first if force delete isn't desired or reliable
        // await this.storage.bucket(bucketName).deleteFiles({ force: true });
        // logger.info(`Emptied GCS bucket: ${bucketName}`);

        // Delete the bucket - use force: true to delete non-empty buckets
        await this.storage.bucket(bucketName).delete({ force: true });
        logger.info(`Successfully deleted GCS bucket: ${bucketName}`);
      } catch (gcsError) {
        // Log error but continue with session deletion
        logger.error(`Failed to delete GCS bucket ${bucketName} for session ${sessionId}:`, gcsError);
        if (gcsError.code === 404) {
           logger.warn(`Bucket ${bucketName} not found, likely already deleted.`);
        } else {
           // Log other errors more prominently
           logger.error(`Error deleting bucket ${bucketName}: ${gcsError.message}`);
        }
      }
    } else if (this.storage) {
       logger.warn(`Session ${sessionId} has no associated GCS bucket name (gcsBucketName missing) or storage client not initialized. Skipping GCS deletion.`);
    }
    // --- End GCS Bucket Deletion ---


    // Delete session record from repository
    this.sessionRepository.delete(sessionId);
    logger.info(`Deleted session record: ${sessionId}`);
  }

  /**
   * Get websocket information for a session
   * @param {string} sessionId - The session ID
   * @returns {Promise<object>} - Websocket information
   * @throws {NotFoundError} - If the session is not found
   */
  async getWebsocketInfo(sessionId) {
    const session = this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }

    const containerInfo = this.sessionRepository.getContainerInfo(sessionId);
    if (!containerInfo) {
      throw new NotFoundError(`Session container ${sessionId} not found`);
    }

    // Generate websocket path if not already set
    if (!containerInfo.websocketPath && containerInfo.kubernetes) {
      containerInfo.websocketPath = this.containerService.getWebsocketPath(sessionId);
      this.sessionRepository.saveContainerInfo(sessionId, containerInfo);
    }
    
    // Construct the full external WebSocket URL using the template from env vars
    let fullWebsocketUrl = null;
    const urlTemplate = process.env.EXTERNAL_WEBSOCKET_URL_TEMPLATE;
    
    if (urlTemplate && containerInfo.websocketPath) {
      // Replace the placeholder with the actual session ID
      fullWebsocketUrl = urlTemplate.replace('{{SESSION_ID}}', sessionId);
      logger.info(`Generated external WebSocket URL for session ${sessionId}: ${fullWebsocketUrl}`);
    } else {
       logger.warn(`Could not generate external WebSocket URL for session ${sessionId}. Template: ${urlTemplate}, Path: ${containerInfo.websocketPath}`);
    }

    return {
      sessionId,
      websocketUrl: fullWebsocketUrl, // Return the full URL
      // Keep path and serviceName for potential internal use or debugging
      websocketPath: containerInfo.websocketPath || null, 
      serviceName: containerInfo.serviceName || null,
      kubernetes: containerInfo.kubernetes || false,
      websocket: containerInfo.websocket || false // Pass the websocket flag if available
    };
  }

  /**
   * Get container info for a session
   * @param {string} sessionId - The session ID
   * @returns {Promise<import('./SessionRepository').ContainerInfo>} - Container info
   * @throws {NotFoundError} - If the session or container is not found
   */
  async getContainerInfo(sessionId) {
    const session = this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }

    const containerInfo = this.sessionRepository.getContainerInfo(sessionId);
    if (!containerInfo) {
      throw new NotFoundError(`Session container ${sessionId} not found`);
    }

    return containerInfo;
  }

  /**
   * Update container info for a session
   * @param {string} sessionId - The session ID
   * @param {object} updates - Updates to apply
   * @returns {Promise<import('./SessionRepository').ContainerInfo>} - Updated container info
   * @throws {NotFoundError} - If the session or container is not found
   */
  async updateContainerInfo(sessionId, updates) {
    const containerInfo = await this.getContainerInfo(sessionId);
    
    // Apply updates
    Object.assign(containerInfo, updates);
    
    // Save updated container info
    this.sessionRepository.saveContainerInfo(sessionId, containerInfo);
    
    return containerInfo;
  }
}

module.exports = SessionService;
