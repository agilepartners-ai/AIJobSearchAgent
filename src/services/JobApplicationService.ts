/**
 * Job Application Service - Database Agnostic
 * 
 * This service uses the database abstraction layer and can work with any database
 */

import { getDatabase } from '../database/DatabaseFactory';
import { DatabaseDocument } from '../database/interfaces/IDatabase';

export interface JobApplication extends DatabaseDocument {
  user_id: string;
  company_name: string;
  position: string;
  status: 'not_applied' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'accepted' | 'declined';
  application_date: string;
  last_updated: string | null;
  location: string | null;
  job_posting_url: string | null;
  job_description: string | null;
  notes: string | null;
  resume_url: string | null;
  cover_letter_url: string | null;
  salary_range: string | null;
  employment_type: string | null;
  remote_option: boolean;
  contact_person: string | null;
  contact_email: string | null;
  interview_date: string | null;
  response_date: string | null;
  follow_up_date: string | null;
  priority: number;
  source: string | null;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  interviews: number;
  offers: number;
  rejected: number;
  applied: number;
}

export class JobApplicationService {
  private static readonly COLLECTION = 'job_applications';
  private static readonly USER_COLLECTION = 'users';

  /**
   * Get all job applications for a user
   */
  static async getUserApplications(userId: string): Promise<JobApplication[]> {
    const db = getDatabase();
    
    // For Firebase: use nested collections
    // For SQL databases: use foreign key relationships
    const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
    
    if (config?.type === 'firebase') {
      // Use nested collection for Firebase
      const result = await db.listNested<JobApplication>(
        this.USER_COLLECTION,
        userId,
        this.COLLECTION
      );
      return result.data;
    } else {
      // Use WHERE clause for SQL databases
      const result = await db.query<JobApplication>(this.COLLECTION, {
        where: [{ field: 'user_id', operator: '==', value: userId }],
        orderBy: 'created_at',
        orderDirection: 'desc'
      });
      return result.data;
    }
  }

  /**
   * Get a specific job application
   */
  static async getApplication(userId: string, applicationId: string): Promise<JobApplication | null> {
    const db = getDatabase();
    const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
    
    if (config?.type === 'firebase') {
      return db.readNested<JobApplication>(
        this.USER_COLLECTION,
        userId,
        this.COLLECTION,
        applicationId
      );
    } else {
      const application = await db.read<JobApplication>(this.COLLECTION, applicationId);
      // Verify the application belongs to the user
      if (application && application.user_id === userId) {
        return application;
      }
      return null;
    }
  }

  /**
   * Create a new job application
   */
  static async addApplication(
    userId: string,
    applicationData: Omit<JobApplication, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'last_updated'>
  ): Promise<string> {
    const db = getDatabase();
    const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
    
    const fullApplicationData: Omit<JobApplication, 'id' | 'created_at' | 'updated_at'> = {
      ...applicationData,
      user_id: userId,
      last_updated: new Date().toISOString(),
      // Ensure all nullable fields have default values
      location: applicationData.location || null,
      job_posting_url: applicationData.job_posting_url || null,
      job_description: applicationData.job_description || null,
      notes: applicationData.notes || null,
      resume_url: null,
      cover_letter_url: null,
      salary_range: applicationData.salary_range || null,
      employment_type: applicationData.employment_type || null,
      remote_option: applicationData.remote_option || false,
      contact_person: applicationData.contact_person || null,
      contact_email: applicationData.contact_email || null,
      interview_date: null,
      response_date: null,
      follow_up_date: null,
      priority: applicationData.priority || 1,
      source: applicationData.source || null,
    };

    if (config?.type === 'firebase') {
      return db.createNested(
        this.USER_COLLECTION,
        userId,
        this.COLLECTION,
        fullApplicationData
      );
    } else {
      return db.create(this.COLLECTION, fullApplicationData);
    }
  }

  /**
   * Update a job application
   */
  static async updateApplication(
    userId: string,
    applicationId: string,
    updates: Partial<JobApplication>
  ): Promise<void> {
    const db = getDatabase();
    const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
    
    const updateData = {
      ...updates,
      last_updated: new Date().toISOString(),
    };

    if (config?.type === 'firebase') {
      return db.updateNested(
        this.USER_COLLECTION,
        userId,
        this.COLLECTION,
        applicationId,
        updateData
      );
    } else {
      // For SQL databases, verify ownership before updating
      const existing = await db.read<JobApplication>(this.COLLECTION, applicationId);
      if (!existing || existing.user_id !== userId) {
        throw new Error('Application not found or access denied');
      }
      return db.update(this.COLLECTION, applicationId, updateData);
    }
  }

  /**
   * Delete a job application
   */
  static async deleteApplication(userId: string, applicationId: string): Promise<void> {
    const db = getDatabase();
    const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
    
    if (config?.type === 'firebase') {
      return db.deleteNested(
        this.USER_COLLECTION,
        userId,
        this.COLLECTION,
        applicationId
      );
    } else {
      // For SQL databases, verify ownership before deleting
      const existing = await db.read<JobApplication>(this.COLLECTION, applicationId);
      if (!existing || existing.user_id !== userId) {
        throw new Error('Application not found or access denied');
      }
      return db.delete(this.COLLECTION, applicationId);
    }
  }

  /**
   * Get application statistics for a user
   */
  static async getApplicationStats(userId: string): Promise<ApplicationStats> {
    const applications = await this.getUserApplications(userId);
    
    const stats: ApplicationStats = {
      total: applications.length,
      pending: 0,
      interviews: 0,
      offers: 0,
      rejected: 0,
      applied: 0,
    };

    applications.forEach(app => {
      switch (app.status) {
        case 'not_applied':
          stats.pending++;
          break;
        case 'applied':
          stats.applied++;
          break;
        case 'interviewing':
          stats.interviews++;
          break;
        case 'offered':
          stats.offers++;
          break;
        case 'rejected':
        case 'declined':
          stats.rejected++;
          break;
      }
    });

    return stats;
  }

  /**
   * Search applications with filters
   */
  static async searchApplications(
    userId: string,
    filters: {
      status?: JobApplication['status'];
      company?: string;
      position?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ applications: JobApplication[]; total: number }> {
    const db = getDatabase();
    const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
    
    const whereClause = [
      { field: 'user_id', operator: '==' as const, value: userId }
    ];

    if (filters.status) {
      whereClause.push({ field: 'status', operator: '==', value: filters.status });
    }

    if (config?.type === 'firebase') {
      const result = await db.listNested<JobApplication>(
        this.USER_COLLECTION,
        userId,
        this.COLLECTION,
        {
          where: whereClause.slice(1), // Remove user_id filter for nested query
          orderBy: 'created_at',
          orderDirection: 'desc',
          limit: filters.limit,
          offset: filters.offset
        }
      );
      return { applications: result.data, total: result.total };
    } else {
      const result = await db.query<JobApplication>(this.COLLECTION, {
        where: whereClause,
        orderBy: 'created_at',
        orderDirection: 'desc',
        limit: filters.limit,
        offset: filters.offset
      });
      return { applications: result.data, total: result.total };
    }
  }
}