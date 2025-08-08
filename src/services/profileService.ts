/**
 * Profile Service - Database Agnostic
 * 
 * Handles user profile operations using the database abstraction layer
 */

import { getDatabase } from '../database/DatabaseFactory';
import { DatabaseDocument } from '../database/interfaces/IDatabase';

export interface Profile extends DatabaseDocument {
  email: string;
  full_name: string;
  phone?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  resume_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
}

export class ProfileService {
  private static readonly COLLECTION = 'users';

  /**
   * Get or create a user profile
   */
  static async getOrCreateProfile(
    uid: string,
    email: string,
    fullName: string
  ): Promise<Profile> {
    try {
      const db = getDatabase();
      
      // Try to get existing profile
      const existingProfile = await db.read<Profile>(this.COLLECTION, uid);
      
      if (existingProfile) {
        return existingProfile;
      }

      // Create new profile if it doesn't exist
      const newProfile: Omit<Profile, 'created_at' | 'updated_at'> = {
        id: uid,
        email,
        full_name: fullName,
      };

      await db.set(this.COLLECTION, uid, newProfile);
      
      // Return the created profile with timestamps
      const createdProfile = await db.read<Profile>(this.COLLECTION, uid);
      if (!createdProfile) {
        throw new Error('Failed to create profile');
      }
      
      return createdProfile;
    } catch (error) {
      console.error('Error in getOrCreateProfile:', error);
      throw error;
    }
  }

  /**
   * Get user profile by ID
   */
  static async getProfile(uid: string): Promise<Profile | null> {
    try {
      const db = getDatabase();
      return await db.read<Profile>(this.COLLECTION, uid);
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(uid: string, updates: Partial<Profile>): Promise<void> {
    try {
      const db = getDatabase();
      await db.update(this.COLLECTION, uid, updates);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Delete user profile
   */
  static async deleteProfile(uid: string): Promise<void> {
    try {
      const db = getDatabase();
      await db.delete(this.COLLECTION, uid);
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  }

  /**
   * Update profile skills
   */
  static async updateSkills(uid: string, skills: string[]): Promise<void> {
    try {
      await this.updateProfile(uid, { skills });
    } catch (error) {
      console.error('Error updating skills:', error);
      throw error;
    }
  }

  /**
   * Update profile resume URL
   */
  static async updateResumeUrl(uid: string, resumeUrl: string): Promise<void> {
    try {
      await this.updateProfile(uid, { resume_url: resumeUrl });
    } catch (error) {
      console.error('Error updating resume URL:', error);
      throw error;
    }
  }

  /**
   * Search profiles by skills (for admin/matching purposes)
   */
  static async searchProfilesBySkills(skills: string[], limit: number = 10): Promise<Profile[]> {
    try {
      const db = getDatabase();
      const result = await db.query<Profile>(this.COLLECTION, {
        where: [{ field: 'skills', operator: 'array-contains', value: skills[0] }],
        limit,
        orderBy: 'updated_at',
        orderDirection: 'desc'
      });
      return result.data;
    } catch (error) {
      console.error('Error searching profiles by skills:', error);
      throw error;
    }
  }
}