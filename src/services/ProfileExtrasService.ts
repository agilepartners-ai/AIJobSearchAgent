/**
 * Profile Extras Service - Database Agnostic
 * 
 * Handles work experience and education data using the database abstraction layer
 */

import { getDatabase } from '../database/DatabaseFactory';
import { DatabaseDocument } from '../database/interfaces/IDatabase';

export interface WorkExperience extends DatabaseDocument {
  user_id: string;
  job_title: string;
  company: string;
  duration: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  skills_used?: string[];
}

export interface Education extends DatabaseDocument {
  user_id: string;
  degree: string;
  institution: string;
  graduation_year: string;
  description?: string;
  field_of_study?: string;
  gpa?: number;
  honors?: string[];
}

export class ProfileExtrasService {
  private static readonly WORK_EXPERIENCE_COLLECTION = 'work_experience';
  private static readonly EDUCATION_COLLECTION = 'education';
  private static readonly USER_COLLECTION = 'users';

  // ==================== WORK EXPERIENCE METHODS ====================

  /**
   * Get all work experience for a user
   */
  static async getWorkExperience(userId: string): Promise<WorkExperience[]> {
    try {
      const db = getDatabase();
      const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
      
      if (config?.type === 'firebase') {
        // Use nested collections for Firebase
        const result = await db.listNested<WorkExperience>(
          this.USER_COLLECTION,
          userId,
          this.WORK_EXPERIENCE_COLLECTION,
          {
            orderBy: 'created_at',
            orderDirection: 'desc'
          }
        );
        return result.data;
      } else {
        // Use WHERE clause for SQL databases
        const result = await db.query<WorkExperience>(this.WORK_EXPERIENCE_COLLECTION, {
          where: [{ field: 'user_id', operator: '==', value: userId }],
          orderBy: 'created_at',
          orderDirection: 'desc'
        });
        return result.data;
      }
    } catch (error) {
      console.error('Error getting work experience:', error);
      throw error;
    }
  }

  /**
   * Add new work experience
   */
  static async addWorkExperience(
    userId: string,
    experience: Omit<WorkExperience, 'id' | 'created_at' | 'updated_at' | 'user_id'>
  ): Promise<string> {
    try {
      const db = getDatabase();
      const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
      
      const fullExperience: Omit<WorkExperience, 'id' | 'created_at' | 'updated_at'> = {
        ...experience,
        user_id: userId,
      };

      if (config?.type === 'firebase') {
        return await db.createNested(
          this.USER_COLLECTION,
          userId,
          this.WORK_EXPERIENCE_COLLECTION,
          fullExperience
        );
      } else {
        return await db.create(this.WORK_EXPERIENCE_COLLECTION, fullExperience);
      }
    } catch (error) {
      console.error('Error adding work experience:', error);
      throw error;
    }
  }

  /**
   * Update work experience
   */
  static async updateWorkExperience(
    userId: string,
    experienceId: string,
    updates: Partial<WorkExperience>
  ): Promise<void> {
    try {
      const db = getDatabase();
      const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
      
      if (config?.type === 'firebase') {
        await db.updateNested(
          this.USER_COLLECTION,
          userId,
          this.WORK_EXPERIENCE_COLLECTION,
          experienceId,
          updates
        );
      } else {
        // Verify ownership before updating
        const existing = await db.read<WorkExperience>(this.WORK_EXPERIENCE_COLLECTION, experienceId);
        if (!existing || existing.user_id !== userId) {
          throw new Error('Work experience not found or access denied');
        }
        await db.update(this.WORK_EXPERIENCE_COLLECTION, experienceId, updates);
      }
    } catch (error) {
      console.error('Error updating work experience:', error);
      throw error;
    }
  }

  /**
   * Delete work experience
   */
  static async deleteWorkExperience(userId: string, experienceId: string): Promise<void> {
    try {
      const db = getDatabase();
      const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
      
      if (config?.type === 'firebase') {
        await db.deleteNested(
          this.USER_COLLECTION,
          userId,
          this.WORK_EXPERIENCE_COLLECTION,
          experienceId
        );
      } else {
        // Verify ownership before deleting
        const existing = await db.read<WorkExperience>(this.WORK_EXPERIENCE_COLLECTION, experienceId);
        if (!existing || existing.user_id !== userId) {
          throw new Error('Work experience not found or access denied');
        }
        await db.delete(this.WORK_EXPERIENCE_COLLECTION, experienceId);
      }
    } catch (error) {
      console.error('Error deleting work experience:', error);
      throw error;
    }
  }

  // ==================== EDUCATION METHODS ====================

  /**
   * Get all education records for a user
   */
  static async getEducation(userId: string): Promise<Education[]> {
    try {
      const db = getDatabase();
      const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
      
      if (config?.type === 'firebase') {
        // Use nested collections for Firebase
        const result = await db.listNested<Education>(
          this.USER_COLLECTION,
          userId,
          this.EDUCATION_COLLECTION,
          {
            orderBy: 'graduation_year',
            orderDirection: 'desc'
          }
        );
        return result.data;
      } else {
        // Use WHERE clause for SQL databases
        const result = await db.query<Education>(this.EDUCATION_COLLECTION, {
          where: [{ field: 'user_id', operator: '==', value: userId }],
          orderBy: 'graduation_year',
          orderDirection: 'desc'
        });
        return result.data;
      }
    } catch (error) {
      console.error('Error getting education:', error);
      throw error;
    }
  }

  /**
   * Add new education record
   */
  static async addEducation(
    userId: string,
    education: Omit<Education, 'id' | 'created_at' | 'updated_at' | 'user_id'>
  ): Promise<string> {
    try {
      const db = getDatabase();
      const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
      
      const fullEducation: Omit<Education, 'id' | 'created_at' | 'updated_at'> = {
        ...education,
        user_id: userId,
      };

      if (config?.type === 'firebase') {
        return await db.createNested(
          this.USER_COLLECTION,
          userId,
          this.EDUCATION_COLLECTION,
          fullEducation
        );
      } else {
        return await db.create(this.EDUCATION_COLLECTION, fullEducation);
      }
    } catch (error) {
      console.error('Error adding education:', error);
      throw error;
    }
  }

  /**
   * Update education record
   */
  static async updateEducation(
    userId: string,
    educationId: string,
    updates: Partial<Education>
  ): Promise<void> {
    try {
      const db = getDatabase();
      const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
      
      if (config?.type === 'firebase') {
        await db.updateNested(
          this.USER_COLLECTION,
          userId,
          this.EDUCATION_COLLECTION,
          educationId,
          updates
        );
      } else {
        // Verify ownership before updating
        const existing = await db.read<Education>(this.EDUCATION_COLLECTION, educationId);
        if (!existing || existing.user_id !== userId) {
          throw new Error('Education record not found or access denied');
        }
        await db.update(this.EDUCATION_COLLECTION, educationId, updates);
      }
    } catch (error) {
      console.error('Error updating education:', error);
      throw error;
    }
  }

  /**
   * Delete education record
   */
  static async deleteEducation(userId: string, educationId: string): Promise<void> {
    try {
      const db = getDatabase();
      const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
      
      if (config?.type === 'firebase') {
        await db.deleteNested(
          this.USER_COLLECTION,
          userId,
          this.EDUCATION_COLLECTION,
          educationId
        );
      } else {
        // Verify ownership before deleting
        const existing = await db.read<Education>(this.EDUCATION_COLLECTION, educationId);
        if (!existing || existing.user_id !== userId) {
          throw new Error('Education record not found or access denied');
        }
        await db.delete(this.EDUCATION_COLLECTION, educationId);
      }
    } catch (error) {
      console.error('Error deleting education:', error);
      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get complete profile extras (work experience + education)
   */
  static async getCompleteProfileExtras(userId: string): Promise<{
    workExperience: WorkExperience[];
    education: Education[];
  }> {
    try {
      const [workExperience, education] = await Promise.all([
        this.getWorkExperience(userId),
        this.getEducation(userId)
      ]);

      return { workExperience, education };
    } catch (error) {
      console.error('Error getting complete profile extras:', error);
      throw error;
    }
  }

  /**
   * Search work experience by company or job title
   */
  static async searchWorkExperience(
    searchTerm: string,
    limit: number = 10
  ): Promise<WorkExperience[]> {
    try {
      const db = getDatabase();
      
      // Note: This is a simplified search. For production, you might want to use
      // full-text search capabilities of your database
      const result = await db.query<WorkExperience>(this.WORK_EXPERIENCE_COLLECTION, {
        where: [{ field: 'company', operator: '==', value: searchTerm }],
        limit,
        orderBy: 'created_at',
        orderDirection: 'desc'
      });
      
      return result.data;
    } catch (error) {
      console.error('Error searching work experience:', error);
      throw error;
    }
  }

  /**
   * Get users by education institution
   */
  static async getUsersByInstitution(
    institution: string,
    limit: number = 10
  ): Promise<Education[]> {
    try {
      const db = getDatabase();
      const result = await db.query<Education>(this.EDUCATION_COLLECTION, {
        where: [{ field: 'institution', operator: '==', value: institution }],
        limit,
        orderBy: 'graduation_year',
        orderDirection: 'desc'
      });
      return result.data;
    } catch (error) {
      console.error('Error getting users by institution:', error);
      throw error;
    }
  }
}