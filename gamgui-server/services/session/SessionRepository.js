/**
 * Repository for session data using Firestore
 * Abstracts the data storage for sessions
 */
const { Firestore } = require('@google-cloud/firestore');
const { NotFoundError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

// Firestore collection names
const SESSIONS_COLLECTION = 'sessions';
const CONTAINER_INFO_COLLECTION = 'containerInfo';

/**
 * Session data model (Firestore document structure)
 * @typedef {Object} Session
 * @property {string} id - Session ID (document ID)
 * @property {string} name - Session name
 * @property {string} containerId - Container ID
 * @property {string} containerName - Container name
 * @property {string} imageId - Image ID
 * @property {string} imageName - Image name
 * @property {Object} config - Session configuration
 * @property {Firestore.Timestamp} createdAt - Creation timestamp
 * @property {Firestore.Timestamp} lastModified - Last modified timestamp
 * @property {string} status - Session status
 */

/**
 * Container information (Firestore document structure)
 * @typedef {Object} ContainerInfo
 * @property {string} id - Container ID (document ID, same as sessionId)
 * @property {string} sessionId - Session ID
 * @property {string} [podName] - Pod name (for Kubernetes)
 * @property {string} [serviceName] - Service name (for Kubernetes)
 * @property {string} [websocketPath] - WebSocket path (for Kubernetes)
 * @property {boolean} [kubernetes] - Whether this is a Kubernetes container
 * @property {boolean} [virtual] - Whether this is a virtual container
 * @property {Object} [stream] - Stream information (consider if needed in Firestore)
 * @property {Object} [fs] - Virtual file system information (consider if needed in Firestore)
 */

/**
 * Repository for session data using Firestore
 */
class SessionRepository {
  /**
   * Create a new SessionRepository
   */
  constructor() {
    /**
     * Firestore database client
     * @type {Firestore}
     * @private
     */
    this._db = new Firestore(); // Assumes ADC or GOOGLE_APPLICATION_CREDENTIALS are set
    logger.info('Firestore SessionRepository initialized.');
  }

  /**
   * Find a session by ID
   * @param {string} sessionId - The session ID
   * @returns {Promise<Session|null>} - The session or null if not found
   */
  async findById(sessionId) {
    try {
      const docRef = this._db.collection(SESSIONS_COLLECTION).doc(sessionId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        logger.debug(`Session not found in Firestore: ${sessionId}`);
        return null;
      }

      const sessionData = docSnap.data();
      // Convert Timestamps back to ISO strings if needed, or handle as Timestamp objects
      return {
        id: docSnap.id,
        ...sessionData,
        createdAt: sessionData.createdAt?.toDate().toISOString(),
        lastModified: sessionData.lastModified?.toDate().toISOString(),
      };
    } catch (error) {
      logger.error(`Error finding session ${sessionId} in Firestore:`, error);
      throw error; // Re-throw the error for the service layer to handle
    }
  }

  /**
   * Get all sessions
   * @returns {Promise<Session[]>} - All sessions
   */
  async findAll() {
    try {
      const snapshot = await this._db.collection(SESSIONS_COLLECTION).get();
      const sessions = [];
      snapshot.forEach(doc => {
        const sessionData = doc.data();
        sessions.push({
          id: doc.id,
          ...sessionData,
          createdAt: sessionData.createdAt?.toDate().toISOString(),
          lastModified: sessionData.lastModified?.toDate().toISOString(),
        });
      });
      return sessions;
    } catch (error) {
      logger.error('Error finding all sessions in Firestore:', error);
      throw error;
    }
  }

  /**
   * Save a session (create or update)
   * @param {Session} session - The session to save
   * @returns {Promise<Session>} - The saved session
   */
  async save(session) {
    try {
      const docRef = this._db.collection(SESSIONS_COLLECTION).doc(session.id);
      const now = Firestore.Timestamp.now();

      // Prepare data for Firestore (convert dates to Timestamps)
      const sessionData = {
        ...session,
        createdAt: session.createdAt ? Firestore.Timestamp.fromDate(new Date(session.createdAt)) : now,
        lastModified: now,
      };
      delete sessionData.id; // Don't store the ID field within the document

      await docRef.set(sessionData, { merge: true }); // Use merge: true for updates
      logger.debug(`Saved/Updated session in Firestore: ${session.id}`);
      
      // Return the session with ISO string dates for consistency
      return {
        ...session,
        createdAt: sessionData.createdAt.toDate().toISOString(),
        lastModified: sessionData.lastModified.toDate().toISOString(),
      };
    } catch (error) {
      logger.error(`Error saving session ${session.id} to Firestore:`, error);
      throw error;
    }
  }

  /**
   * Delete a session
   * @param {string} sessionId - The session ID
   * @returns {Promise<boolean>} - Whether the session was deleted
   */
  async delete(sessionId) {
    try {
      const docRef = this._db.collection(SESSIONS_COLLECTION).doc(sessionId);
      // Optionally check if it exists first
      // const docSnap = await docRef.get();
      // if (!docSnap.exists) return false;

      await docRef.delete();
      logger.debug(`Deleted session from Firestore: ${sessionId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting session ${sessionId} from Firestore:`, error);
      // Decide if not found should return false or throw
      if (error.code === 5) { // Firestore NOT_FOUND error code
         logger.debug(`Session not found for deletion in Firestore: ${sessionId}`);
         return false;
      }
      throw error;
    }
  }

  /**
   * Get container info for a session
   * @param {string} sessionId - The session ID
   * @returns {Promise<ContainerInfo|null>} - The container info or null if not found
   */
  async getContainerInfo(sessionId) {
    try {
      const docRef = this._db.collection(CONTAINER_INFO_COLLECTION).doc(sessionId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        logger.debug(`Container info not found in Firestore for session: ${sessionId}`);
        return null;
      }
      // Note: Firestore doesn't store functions or complex objects like streams well.
      // We might need to adjust what's stored here.
      return { id: docSnap.id, ...docSnap.data() };
    } catch (error) {
      logger.error(`Error getting container info for session ${sessionId} from Firestore:`, error);
      throw error;
    }
  }

  /**
   * Save container info for a session
   * @param {string} sessionId - The session ID
   * @param {ContainerInfo} containerInfo - The container info
   * @returns {Promise<ContainerInfo>} - The saved container info
   */
  async saveContainerInfo(sessionId, containerInfo) {
    try {
      const docRef = this._db.collection(CONTAINER_INFO_COLLECTION).doc(sessionId);
      // Prepare data - remove complex objects if necessary
      const dataToSave = { ...containerInfo };
      delete dataToSave.stream; // Example: Don't save streams
      delete dataToSave.fs;     // Example: Don't save virtual FS

      await docRef.set(dataToSave, { merge: true });
      logger.debug(`Saved container info to Firestore for session: ${sessionId}`);
      return containerInfo; // Return original object
    } catch (error) {
      logger.error(`Error saving container info for session ${sessionId} to Firestore:`, error);
      throw error;
    }
  }

  /**
   * Delete container info for a session
   * @param {string} sessionId - The session ID
   * @returns {Promise<boolean>} - Whether the container info was deleted
   */
  async deleteContainerInfo(sessionId) {
     try {
      const docRef = this._db.collection(CONTAINER_INFO_COLLECTION).doc(sessionId);
      await docRef.delete();
      logger.debug(`Deleted container info from Firestore for session: ${sessionId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting container info for session ${sessionId} from Firestore:`, error);
       if (error.code === 5) { // Firestore NOT_FOUND error code
         logger.debug(`Container info not found for deletion in Firestore: ${sessionId}`);
         return false;
      }
      throw error;
    }
  }

  // Note: getActiveSessions was likely related to the in-memory Socket.IO adapter.
  // If session presence needs tracking across instances with Firestore,
  // a different mechanism (like Firestore listeners or a dedicated presence collection)
  // would be needed. This method is removed as it doesn't directly map to Firestore.
  // getActiveSessions() { ... }
}

module.exports = SessionRepository;
