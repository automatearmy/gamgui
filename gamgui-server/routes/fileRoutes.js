const express = require('express');
const multer = require('multer');
const logger = require('../utils/logger'); // Assuming logger is available

// Use memory storage to handle files as buffers
const upload = multer({ storage: multer.memoryStorage() });

// Factory function to create the router with dependency injection
const createFileRouter = (sessionService) => {
  const router = express.Router();

  if (!sessionService || !sessionService.storage) {
    logger.warn('SessionService or GCS storage client not available in fileRoutes. File upload endpoint will be disabled.');
    // Optionally return a router that returns errors or is empty
    router.post('/:id/files', (req, res) => {
      res.status(503).json({ message: 'File upload service is not configured or available.' });
    });
    return router;
  }

/**
   * @route   POST /api/sessions/:id/files
   * @desc    Upload files to the session's GCS bucket
   * @access  Public
   */
  router.post('/:id/files', upload.array('files'), async (req, res) => {
    const sessionId = req.params.id;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    logger.info(`Received ${files.length} file(s) for session ${sessionId}`);

    try {
      // Get session details to find the GCS bucket name
      const session = await sessionService.getSession(sessionId); // Use injected service
      if (!session) {
        // getSession throws NotFoundError, but double-check
        return res.status(404).json({ message: 'Session not found' });
      }

      if (!session.gcsBucketName) {
        logger.error(`Session ${sessionId} does not have an associated GCS bucket name.`);
        return res.status(500).json({ message: 'GCS bucket not configured for this session' });
      }

      const bucketName = session.gcsBucketName;
      const bucket = sessionService.storage.bucket(bucketName); // Use storage client from sessionService
      const uploadedFilesInfo = [];
      const uploadPromises = [];

      logger.info(`Uploading files to GCS bucket: ${bucketName}`);

      for (const file of files) {
        const gcsFileName = file.originalname; // Use original name as GCS object name
        const gcsFile = bucket.file(gcsFileName);

        logger.debug(`Uploading ${gcsFileName} (${file.size} bytes)`);

        // Create a write stream and pipe the buffer
        const uploadPromise = new Promise((resolve, reject) => {
          const stream = gcsFile.createWriteStream({
            metadata: {
              contentType: file.mimetype,
            },
            resumable: false, // Use simple upload for smaller files potentially
          });

          stream.on('error', (err) => {
            logger.error(`Error uploading ${gcsFileName} to ${bucketName}:`, err);
            reject(err);
          });

          stream.on('finish', () => {
            logger.debug(`Successfully uploaded ${gcsFileName} to ${bucketName}`);
            uploadedFilesInfo.push({
              name: gcsFileName,
              size: file.size,
              bucket: bucketName,
              path: `gs://${bucketName}/${gcsFileName}` // GCS path representation
            });
            resolve();
          });

          stream.end(file.buffer); // Write the buffer from memoryStorage
        });
        uploadPromises.push(uploadPromise);
      }

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      logger.info(`Successfully uploaded ${uploadedFilesInfo.length} file(s) for session ${sessionId}`);
      return res.status(200).json({
        message: 'Files uploaded successfully to GCS',
        files: uploadedFilesInfo
      });

    } catch (error) {
      logger.error(`Error processing file upload for session ${sessionId}:`, error);
      if (error.name === 'NotFoundError') {
         return res.status(404).json({ message: 'Session not found' });
      }
      // Handle potential GCS errors during upload
      return res.status(500).json({
        message: 'Server error during file upload',
        error: error.message
      });
    }
  });

  return router;
};

module.exports = { createFileRouter }; // Export the factory function
