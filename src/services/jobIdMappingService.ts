/**
 * Job ID Mapping Service
 * Maps temporary local job IDs to actual Firebase document IDs
 */

export interface JobIdMapping {
  localId: string;
  firebaseId: string;
  userId: string;
  jobTitle: string;
  companyName: string;
  createdAt: string;
}

export class JobIdMappingService {
  private static MAPPING_KEY = 'job_id_mappings';

  /**
   * Add a mapping between local ID and Firebase ID
   */
  static addMapping(localId: string, firebaseId: string, userId: string, jobTitle: string, companyName: string): void {
    try {
      const mappings = this.getAllMappings();
      
      const newMapping: JobIdMapping = {
        localId,
        firebaseId,
        userId,
        jobTitle,
        companyName,
        createdAt: new Date().toISOString()
      };
      
      // Remove any existing mapping for this local ID
      const filteredMappings = mappings.filter(m => m.localId !== localId);
      
      // Add new mapping
      filteredMappings.push(newMapping);
      
      // Keep only last 1000 mappings to avoid storage bloat
      const trimmedMappings = filteredMappings.slice(-1000);
      
      localStorage.setItem(this.MAPPING_KEY, JSON.stringify(trimmedMappings));
      
      console.log(`JobIdMappingService: Added mapping ${localId} -> ${firebaseId}`);
    } catch (error) {
      console.error('JobIdMappingService: Error adding mapping:', error);
    }
  }

  /**
   * Get Firebase ID from local ID
   */
  static getFirebaseId(localId: string): string | null {
    try {
      const mappings = this.getAllMappings();
      const mapping = mappings.find(m => m.localId === localId);
      return mapping ? mapping.firebaseId : null;
    } catch (error) {
      console.error('JobIdMappingService: Error getting Firebase ID:', error);
      return null;
    }
  }

  /**
   * Get local ID from Firebase ID
   */
  static getLocalId(firebaseId: string): string | null {
    try {
      const mappings = this.getAllMappings();
      const mapping = mappings.find(m => m.firebaseId === firebaseId);
      return mapping ? mapping.localId : null;
    } catch (error) {
      console.error('JobIdMappingService: Error getting local ID:', error);
      return null;
    }
  }

  /**
   * Get all mappings
   */
  static getAllMappings(): JobIdMapping[] {
    try {
      const mappingsData = localStorage.getItem(this.MAPPING_KEY);
      if (!mappingsData) {
        return [];
      }
      return JSON.parse(mappingsData);
    } catch (error) {
      console.error('JobIdMappingService: Error reading mappings:', error);
      return [];
    }
  }

  /**
   * Get all mappings for a user
   */
  static getUserMappings(userId: string): JobIdMapping[] {
    try {
      const mappings = this.getAllMappings();
      return mappings.filter(m => m.userId === userId);
    } catch (error) {
      console.error('JobIdMappingService: Error getting user mappings:', error);
      return [];
    }
  }

  /**
   * Check if a local ID has been mapped
   */
  static isMapped(localId: string): boolean {
    return this.getFirebaseId(localId) !== null;
  }

  /**
   * Remove a mapping
   */
  static removeMapping(localId: string): void {
    try {
      const mappings = this.getAllMappings();
      const filteredMappings = mappings.filter(m => m.localId !== localId);
      localStorage.setItem(this.MAPPING_KEY, JSON.stringify(filteredMappings));
      
      console.log(`JobIdMappingService: Removed mapping for ${localId}`);
    } catch (error) {
      console.error('JobIdMappingService: Error removing mapping:', error);
    }
  }

  /**
   * Clear old mappings (older than 30 days)
   */
  static clearOldMappings(): void {
    try {
      const mappings = this.getAllMappings();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      
      const recentMappings = mappings.filter(mapping => {
        const mappingDate = new Date(mapping.createdAt);
        return mappingDate > cutoffDate;
      });
      
      localStorage.setItem(this.MAPPING_KEY, JSON.stringify(recentMappings));
      
      console.log(`JobIdMappingService: Cleared ${mappings.length - recentMappings.length} old mappings`);
    } catch (error) {
      console.error('JobIdMappingService: Error clearing old mappings:', error);
    }
  }

  /**
   * Clear all mappings
   */
  static clearAllMappings(): void {
    try {
      localStorage.removeItem(this.MAPPING_KEY);
      console.log('JobIdMappingService: Cleared all mappings');
    } catch (error) {
      console.error('JobIdMappingService: Error clearing mappings:', error);
    }
  }

  /**
   * Export mappings for debugging
   */
  static exportMappings(): string {
    try {
      const mappings = this.getAllMappings();
      return JSON.stringify(mappings, null, 2);
    } catch (error) {
      console.error('JobIdMappingService: Error exporting mappings:', error);
      return '[]';
    }
  }
}
