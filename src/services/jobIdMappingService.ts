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
      return null;
    }
  }

  /**
   * Get all mappings
   */
  static getAllMappings(): JobIdMapping[] {
    try {
      const mappingsJson = localStorage.getItem(this.MAPPING_KEY);
      return mappingsJson ? JSON.parse(mappingsJson) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all mappings for a user
   */
  static getUserMappings(userId: string): JobIdMapping[] {
    try {
      const allMappings = this.getAllMappings();
      // This is a placeholder. In a real implementation, you'd filter by userId.
      return allMappings;
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
    }
  }

  /**
   * Clear all mappings
   */
  static clearAllMappings(): void {
    try {
      localStorage.removeItem(this.MAPPING_KEY);
    } catch (error) {
    }
  }

  /**
   * Export mappings for debugging
   */
  static exportMappings(): string {
    try {
      return localStorage.getItem(this.MAPPING_KEY) || '[]';
    } catch (error) {
      return '[]';
    }
  }
}
