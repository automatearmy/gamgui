/**
 * User Store - Unified User ID Management for Frontend
 * 
 * This store provides a centralized, deterministic approach to user identification
 * that matches the backend UserService implementation.
 */
import { getCurrentUser } from './api';


// Synchronous version using a simple hash for immediate use
function generateUserIdSync(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required and must be a string');
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  
  // Normalize email (lowercase, trim)
  const normalizedEmail = email.toLowerCase().trim();
  
  // Simple hash function for synchronous operation
  let hash = 0;
  for (let i = 0; i < normalizedEmail.length; i++) {
    const char = normalizedEmail.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive hex string
  const hashHex = Math.abs(hash).toString(16).padStart(12, '0').substring(0, 12);
  return `usr_${hashHex}`;
}

interface UserInfo {
  id: string;
  email: string;
  domain: string;
  emailPrefix: string;
  legacyId: string;
  isAuthenticated: boolean;
  generatedAt: string;
}

interface MigrationInfo {
  legacyId: string;
  newUserId: string;
  email: string;
  migratedAt: string;
  migrationRequired: boolean;
}

class UserStore {
  private static instance: UserStore;
  private userInfo: UserInfo | null = null;
  private migrationInfo: MigrationInfo | null = null;
  
  static getInstance(): UserStore {
    if (!this.instance) {
      this.instance = new UserStore();
    }
    return this.instance;
  }
  
  /**
   * Initialize user from authentication system
   */
  async initializeUser(): Promise<UserInfo | null> {
    try {
      // Get user info from API
      const userResponse = await getCurrentUser();
      
      if (userResponse.error || !userResponse.email) {
        console.warn('User not authenticated or email not available');
        return null;
      }
      
      // Generate deterministic user ID
      const userId = generateUserIdSync(userResponse.email);
      const domain = this.extractDomain(userResponse.email);
      const emailPrefix = userResponse.email.split('@')[0];
      
      this.userInfo = {
        id: userId,
        email: userResponse.email,
        domain: domain,
        emailPrefix: emailPrefix,
        legacyId: emailPrefix,
        isAuthenticated: true,
        generatedAt: new Date().toISOString()
      };
      
      // Handle migration from legacy localStorage
      this.handleLegacyMigration();
      
      console.log('User initialized with unified ID:', {
        email: this.userInfo.email,
        userId: this.userInfo.id,
        legacyId: this.userInfo.legacyId,
        domain: this.userInfo.domain
      });
      
      return this.userInfo;
    } catch (error) {
      console.error('Error initializing user:', error);
      return null;
    }
  }
  
  /**
   * Get current user info
   */
  getUserInfo(): UserInfo | null {
    return this.userInfo;
  }
  
  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.userInfo?.id || null;
  }
  
  /**
   * Get legacy user ID for backward compatibility
   */
  getLegacyUserId(): string | null {
    return this.userInfo?.legacyId || null;
  }
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.userInfo?.isAuthenticated || false;
  }
  
  /**
   * Extract domain from email
   */
  private extractDomain(email: string): string {
    return email.toLowerCase().split('@')[1];
  }
  
  /**
   * Handle migration from legacy localStorage system
   */
  private handleLegacyMigration(): void {
    if (!this.userInfo) return;
    
    try {
      // Check for legacy user ID in localStorage
      const legacyStoredId = localStorage.getItem('gamgui-user-id');
      
      if (legacyStoredId && !legacyStoredId.startsWith('usr_')) {
        // Found legacy ID, create migration info
        this.migrationInfo = {
          legacyId: legacyStoredId,
          newUserId: this.userInfo.id,
          email: this.userInfo.email,
          migratedAt: new Date().toISOString(),
          migrationRequired: legacyStoredId !== this.userInfo.id
        };
        
        console.log('Legacy user ID migration detected:', this.migrationInfo);
        
        // Update localStorage with new format
        localStorage.setItem('gamgui-user-id', this.userInfo.id);
        
        // Optionally notify about migration
        this.notifyMigration();
      } else {
        // Store current user ID in localStorage for consistency
        localStorage.setItem('gamgui-user-id', this.userInfo.id);
      }
    } catch (error) {
      console.error('Error during legacy migration:', error);
    }
  }
  
  /**
   * Notify about migration (can be extended for UI notifications)
   */
  private notifyMigration(): void {
    if (this.migrationInfo?.migrationRequired) {
      console.info('User ID migrated to new deterministic format:', {
        from: this.migrationInfo.legacyId,
        to: this.migrationInfo.newUserId,
        email: this.migrationInfo.email
      });
      
      // Could emit event for UI notification
      window.dispatchEvent(new CustomEvent('userMigrated', {
        detail: this.migrationInfo
      }));
    }
  }
  
  /**
   * Get migration info
   */
  getMigrationInfo(): MigrationInfo | null {
    return this.migrationInfo;
  }
  
  /**
   * Clear user data (logout)
   */
  clearUser(): void {
    this.userInfo = null;
    this.migrationInfo = null;
    localStorage.removeItem('gamgui-user-id');
  }
  
  /**
   * Check if user belongs to specific domain
   */
  belongsToDomain(domain: string): boolean {
    if (!this.userInfo) return false;
    return this.userInfo.domain === domain.toLowerCase();
  }
  
  /**
   * Get user info for API calls
   */
  getApiUserInfo(): { userId: string; legacyId?: string } | null {
    if (!this.userInfo) return null;
    
    return {
      userId: this.userInfo.id,
      legacyId: this.userInfo.legacyId
    };
  }
  
  /**
   * Generate user ID from email (static utility)
   */
  static generateUserId(email: string): string {
    return generateUserIdSync(email);
  }
  
  /**
   * Validate email format (static utility)
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Export singleton instance
export const userStore = UserStore.getInstance();

// Export utilities
export { generateUserIdSync as generateUserId, UserStore };
export type { UserInfo, MigrationInfo };
