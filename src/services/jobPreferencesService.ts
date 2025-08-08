/**
 * Job Preferences Service - Database Agnostic
 * 
 * Handles user job preferences using the database abstraction layer
 */

import { getDatabase } from '../database/DatabaseFactory';
import { DatabaseDocument } from '../database/interfaces/IDatabase';

export interface JobPreferences extends DatabaseDocument {
  user_id: string;
  job_titles?: string[];
  locations?: string[];
  salary_expectation?: number | null;
  employment_types?: string[];
  remote_only?: boolean;
  skills?: string[];
}

export class JobPreferencesService {
  private static readonly COLLECTION = 'job_preferences';
  private static readonly USER_COLLECTION = 'users';

  /**
   * Get user job preferences
   */
  static async getUserJobPreferences(userId: string): Promise<JobPreferences | null> {
    try {
      const db = getDatabase();
      const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
      
      if (config?.type === 'firebase') {
        // For Firebase, use the user ID as document ID in job_preferences collection
        return await db.read<JobPreferences>(this.COLLECTION, userId);
      } else {
        // For SQL databases, query by user_id field
        const result = await db.query<JobPreferences>(this.COLLECTION, {
          where: [{ field: 'user_id', operator: '==', value: userId }],
          limit: 1
        });
        return result.data.length > 0 ? result.data[0] : null;
      }
    } catch (error) {
      console.error('Error getting job preferences:', error);
      throw error;
    }
  }

  /**
   * Save or update user job preferences
   */
  static async saveJobPreferences(
    userId: string, 
    preferences: Omit<JobPreferences, 'id' | 'created_at' | 'updated_at' | 'user_id'>
  ): Promise<void> {
    try {
      const db = getDatabase();
      const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
      
      const fullPreferences: Omit<JobPreferences, 'id' | 'created_at' | 'updated_at'> = {
        ...preferences,
        user_id: userId,
      };

      if (config?.type === 'firebase') {
        // For Firebase, use user ID as document ID
        await db.set(this.COLLECTION, userId, fullPreferences);
      } else {
        // For SQL databases, check if preferences exist and update or create
        const existing = await this.getUserJobPreferences(userId);
        if (existing) {
          await db.update(this.COLLECTION, existing.id, fullPreferences);
        } else {
          await db.create(this.COLLECTION, fullPreferences);
        }
      }
    } catch (error) {
      console.error('Error saving job preferences:', error);
      throw error;
    }
  }

  /**
   * Update specific job preference fields
   */
  static async updateJobPreferences(
    userId: string,
    updates: Partial<Omit<JobPreferences, 'id' | 'created_at' | 'updated_at' | 'user_id'>>
  ): Promise<void> {
    try {
      const db = getDatabase();
      const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
      
      if (config?.type === 'firebase') {
        await db.update(this.COLLECTION, userId, updates);
      } else {
        const existing = await this.getUserJobPreferences(userId);
        if (existing) {
          await db.update(this.COLLECTION, existing.id, updates);
        } else {
          throw new Error('Job preferences not found for user');
        }
      }
    } catch (error) {
      console.error('Error updating job preferences:', error);
      throw error;
    }
  }

  /**
   * Delete user job preferences
   */
  static async deleteJobPreferences(userId: string): Promise<void> {
    try {
      const db = getDatabase();
      const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
      
      if (config?.type === 'firebase') {
        await db.delete(this.COLLECTION, userId);
      } else {
        const existing = await this.getUserJobPreferences(userId);
        if (existing) {
          await db.delete(this.COLLECTION, existing.id);
        }
      }
    } catch (error) {
      console.error('Error deleting job preferences:', error);
      throw error;
    }
  }

  /**
   * Get all users with specific job preferences (for matching/admin purposes)
   */
  static async getUsersWithJobTitle(jobTitle: string, limit: number = 10): Promise<JobPreferences[]> {
    try {
      const db = getDatabase();
      const result = await db.query<JobPreferences>(this.COLLECTION, {
        where: [{ field: 'job_titles', operator: 'array-contains', value: jobTitle }],
        limit,
        orderBy: 'updated_at',
        orderDirection: 'desc'
      });
      return result.data;
    } catch (error) {
      console.error('Error getting users with job title:', error);
      throw error;
    }
  }

  /**
   * Get users looking for remote work
   */
  static async getRemoteJobSeekers(limit: number = 10): Promise<JobPreferences[]> {
    try {
      const db = getDatabase();
      const result = await db.query<JobPreferences>(this.COLLECTION, {
        where: [{ field: 'remote_only', operator: '==', value: true }],
        limit,
        orderBy: 'updated_at',
        orderDirection: 'desc'
      });
      return result.data;
    } catch (error) {
      console.error('Error getting remote job seekers:', error);
      throw error;
    }
  }

  /**
   * Get users by salary expectation range
   */
  static async getUsersBySalaryRange(
    minSalary: number, 
    maxSalary: number, 
    limit: number = 10
  ): Promise<JobPreferences[]> {
    try {
      const db = getDatabase();
      const result = await db.query<JobPreferences>(this.COLLECTION, {
        where: [
          { field: 'salary_expectation', operator: '>=', value: minSalary },
          { field: 'salary_expectation', operator: '<=', value: maxSalary }
        ],
        limit,
        orderBy: 'salary_expectation',
        orderDirection: 'asc'
      });
      return result.data;
    } catch (error) {
      console.error('Error getting users by salary range:', error);
      throw error;
    }
  }
}