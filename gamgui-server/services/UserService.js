/**
 * User Service - Unified User ID Management
 * 
 * This service provides a deterministic, secure, and scalable approach
 * to user identification across the entire GAMGUI system.
 */
const crypto = require('crypto');
const logger = require('../utils/logger');

class UserService {
  /**
   * Generate a deterministic user ID based on email
   * @param {string} email - User's email address
   * @returns {string} - Deterministic user ID (usr_xxxxxxxxxxxx)
   */
  static generateUserId(email) {
    if (!email || typeof email !== 'string') {
      throw new Error('Email is required and must be a string');
    }
    
    // Validate email format
    if (!this.validateEmail(email)) {
      throw new Error('Invalid email format');
    }
    
    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();
    
    // Generate deterministic hash
    const hash = crypto.createHash('sha256')
      .update(normalizedEmail)
      .digest('hex')
      .substring(0, 12); // 12 characters for readability
    
    const userId = `usr_${hash}`;
    
    // Log for audit purposes (without exposing email)
    this.logUserIdGeneration(normalizedEmail, userId);
    
    return userId;
  }
  
  /**
   * Get current user ID from request object
   * @param {Object} req - Express request object
   * @returns {string} - User ID
   */
  static getCurrentUserId(req) {
    const email = req.user?.email;
    if (!email) {
      throw new Error('User not authenticated or email not available');
    }
    
    return this.generateUserId(email);
  }
  
  /**
   * Resolve user ID with fallback support for legacy systems
   * @param {string} legacyId - Legacy user ID (optional)
   * @param {string} email - User email (optional)
   * @returns {string} - Resolved user ID
   */
  static resolveUserId(legacyId, email) {
    // Priority 1: Generate from email if available
    if (email) {
      return this.generateUserId(email);
    }
    
    // Priority 2: Use existing new format ID
    if (legacyId && legacyId.startsWith('usr_')) {
      return legacyId;
    }
    
    // Priority 3: Legacy format (for backward compatibility)
    if (legacyId) {
      logger.warn('Using legacy user ID format', { legacyId });
      return legacyId;
    }
    
    // Fallback
    return 'anonymous';
  }
  
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} - True if valid
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Extract domain from email
   * @param {string} email - User email
   * @returns {string} - Domain part of email
   */
  static extractDomain(email) {
    if (!this.validateEmail(email)) {
      throw new Error('Invalid email format');
    }
    
    return email.toLowerCase().split('@')[1];
  }
  
  /**
   * Check if user belongs to specific domain
   * @param {string} email - User email
   * @param {string} domain - Domain to check
   * @returns {boolean} - True if user belongs to domain
   */
  static belongsToDomain(email, domain) {
    try {
      const userDomain = this.extractDomain(email);
      return userDomain === domain.toLowerCase();
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get user info object with standardized format
   * @param {Object} req - Express request object
   * @returns {Object} - Standardized user info
   */
  static getUserInfo(req) {
    const email = req.user?.email;
    if (!email) {
      return null;
    }
    
    const userId = this.generateUserId(email);
    const domain = this.extractDomain(email);
    const emailPrefix = email.split('@')[0];
    
    return {
      id: userId,
      email: email,
      domain: domain,
      emailPrefix: emailPrefix,
      legacyId: emailPrefix, // For backward compatibility
      isAuthenticated: true,
      generatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Migrate from legacy user ID to new format
   * @param {string} legacyId - Old user ID
   * @param {string} email - User email
   * @returns {Object} - Migration info
   */
  static migrateLegacyUserId(legacyId, email) {
    const newUserId = this.generateUserId(email);
    
    const migrationInfo = {
      legacyId: legacyId,
      newUserId: newUserId,
      email: email,
      migratedAt: new Date().toISOString(),
      migrationRequired: legacyId !== newUserId
    };
    
    if (migrationInfo.migrationRequired) {
      this.logMigration(legacyId, newUserId);
    }
    
    return migrationInfo;
  }
  
  /**
   * Log user ID generation for audit purposes
   * @param {string} email - User email (will be hashed for privacy)
   * @param {string} userId - Generated user ID
   */
  static logUserIdGeneration(email, userId) {
    const hashedEmail = crypto.createHash('sha256').update(email).digest('hex');
    
    logger.info('User ID generated', {
      hashedEmail: hashedEmail.substring(0, 16), // First 16 chars for correlation
      userId: userId,
      timestamp: new Date().toISOString(),
      version: '2.0'
    });
  }
  
  /**
   * Log user ID migration for audit purposes
   * @param {string} oldId - Old user ID
   * @param {string} newId - New user ID
   */
  static logMigration(oldId, newId) {
    logger.info('User ID migrated', {
      oldId: oldId,
      newId: newId,
      timestamp: new Date().toISOString(),
      version: '2.0'
    });
  }
  
  /**
   * Generate secret name with user ID prefix
   * @param {string} secretType - Type of secret (oauth2, client-secrets, etc.)
   * @param {string} userId - User ID
   * @returns {string} - Full secret name
   */
  static generateSecretName(secretType, userId) {
    if (!userId || !secretType) {
      throw new Error('Both secretType and userId are required');
    }
    
    // New format: user-{userId}-{secretType}
    return `user-${userId}-${secretType}`;
  }
  
  /**
   * Parse secret name to extract user ID
   * @param {string} secretName - Full secret name
   * @returns {Object} - Parsed info
   */
  static parseSecretName(secretName) {
    const parts = secretName.split('-');
    
    if (parts.length >= 3 && parts[0] === 'user') {
      return {
        userId: parts[1],
        secretType: parts.slice(2).join('-'),
        isUserSecret: true,
        format: parts[1].startsWith('usr_') ? 'new' : 'legacy'
      };
    }
    
    return {
      userId: null,
      secretType: secretName,
      isUserSecret: false,
      format: 'global'
    };
  }
}

module.exports = UserService;
