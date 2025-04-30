/**
 * Script to clean up old sessions from Firestore
 * This script will delete sessions that are older than a specified age
 */
const { Firestore } = require('@google-cloud/firestore');
const logger = require('../../utils/logger');

// Configuration
const MAX_SESSION_AGE_HOURS = process.env.MAX_SESSION_AGE_HOURS || 24; // Default: 24 hours
const DRY_RUN = process.env.DRY_RUN === 'true'; // Set to 'true' to only log without deleting
const SESSIONS_COLLECTION = 'sessions';
const CONTAINER_INFO_COLLECTION = 'containerInfo';
const BATCH_SIZE = 100; // Maximum number of sessions to delete in one batch

/**
 * Main function to clean up old sessions
 */
async function cleanupOldSessions() {
  try {
    logger.info(`Starting cleanup of sessions older than ${MAX_SESSION_AGE_HOURS} hours`);
    if (DRY_RUN) {
      logger.info('DRY RUN MODE: Will only log sessions that would be deleted');
    }

    // Initialize Firestore
    const db = new Firestore();
    
    // Calculate cutoff time
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - (MAX_SESSION_AGE_HOURS * 60 * 60 * 1000));
    logger.info(`Cutoff time: ${cutoffTime.toISOString()}`);
    
    // Query for old sessions
    const sessionsRef = db.collection(SESSIONS_COLLECTION);
    const oldSessionsQuery = sessionsRef
      .where('lastModified', '<', Firestore.Timestamp.fromDate(cutoffTime))
      .limit(BATCH_SIZE);
    
    const snapshot = await oldSessionsQuery.get();
    
    if (snapshot.empty) {
      logger.info('No old sessions found to delete');
      return;
    }
    
    logger.info(`Found ${snapshot.size} old sessions to delete`);
    
    // Process sessions in batches
    const batch = db.batch();
    let batchCount = 0;
    
    // Track session IDs for container info deletion
    const sessionIds = [];
    
    snapshot.forEach(doc => {
      const sessionData = doc.data();
      const sessionId = doc.id;
      const lastModified = sessionData.lastModified?.toDate() || new Date(0);
      
      logger.info(`Session ${sessionId} (${sessionData.name || 'unnamed'}) last modified: ${lastModified.toISOString()}`);
      
      if (!DRY_RUN) {
        batch.delete(doc.ref);
        sessionIds.push(sessionId);
        batchCount++;
      }
    });
    
    // Commit the batch if not in dry run mode
    if (!DRY_RUN && batchCount > 0) {
      await batch.commit();
      logger.info(`Deleted ${batchCount} sessions from Firestore`);
      
      // Now delete container info for these sessions
      await deleteContainerInfo(db, sessionIds);
    }
    
    logger.info('Session cleanup completed successfully');
  } catch (error) {
    logger.error('Error cleaning up old sessions:', error);
    process.exit(1);
  }
}

/**
 * Delete container info for the specified session IDs
 * @param {Firestore} db - Firestore instance
 * @param {string[]} sessionIds - Array of session IDs
 */
async function deleteContainerInfo(db, sessionIds) {
  try {
    if (sessionIds.length === 0) {
      return;
    }
    
    logger.info(`Deleting container info for ${sessionIds.length} sessions`);
    
    const batch = db.batch();
    let batchCount = 0;
    
    for (const sessionId of sessionIds) {
      const containerInfoRef = db.collection(CONTAINER_INFO_COLLECTION).doc(sessionId);
      batch.delete(containerInfoRef);
      batchCount++;
    }
    
    await batch.commit();
    logger.info(`Deleted ${batchCount} container info documents from Firestore`);
  } catch (error) {
    logger.error('Error deleting container info:', error);
    // Continue execution even if container info deletion fails
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupOldSessions()
    .then(() => {
      logger.info('Cleanup script completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Cleanup script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupOldSessions };
