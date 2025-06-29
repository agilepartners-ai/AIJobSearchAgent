import { supabase, TABLES } from '../lib/supabase';
import { JobApplication, JobApplicationInsert, JobApplicationUpdate } from '../types/supabase';

export interface ApplicationStats {
  total: number;
  pending: number;
  interviews: number;
  offers: number;
  rejected?: number;
  applied?: number;
}

export interface CreateJobApplicationData {
  company_name: string;
  position: string;
  status?: 'not_applied' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'accepted' | 'declined';
  application_date?: string;
  job_posting_url?: string;
  job_description?: string;
  notes?: string;
  salary_range?: string;
  location?: string;
  employment_type?: string;
  remote_option?: boolean;
  contact_person?: string;
  contact_email?: string;
  priority?: number;
  source?: string;
}

export class SupabaseJobApplicationService {
  // Get all job applications for a user
  static async getUserApplications(userId: string): Promise<JobApplication[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.JOB_APPLICATIONS)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error('Failed to load job applications');
    }
  }

  // Get a single job application by ID
  static async getApplication(applicationId: string): Promise<JobApplication | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.JOB_APPLICATIONS)
        .select('*')
        .eq('id', applicationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data;
    } catch (error) {
      throw new Error('Failed to load job application');
    }
  }

  // Add a new job application
  static async addApplication(userId: string, applicationData: CreateJobApplicationData): Promise<JobApplication> {
    try {
      const insertData: JobApplicationInsert = {
        user_id: userId,
        company_name: applicationData.company_name,
        position: applicationData.position,
        status: applicationData.status || 'not_applied',
        application_date: applicationData.application_date || new Date().toISOString(),
        job_posting_url: applicationData.job_posting_url || null,
        job_description: applicationData.job_description || null,
        notes: applicationData.notes || null,
        salary_range: applicationData.salary_range || null,
        location: applicationData.location || null,
        employment_type: applicationData.employment_type || null,
        remote_option: applicationData.remote_option || false,
        contact_person: applicationData.contact_person || null,
        contact_email: applicationData.contact_email || null,
        priority: applicationData.priority || 1,
        source: applicationData.source || null,
      };

      const { data, error } = await supabase
        .from(TABLES.JOB_APPLICATIONS)
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error('Failed to add job application');
    }
  }

  // Update an existing job application
  static async updateApplication(applicationId: string, updates: Partial<CreateJobApplicationData>): Promise<JobApplication> {
    try {
      // Get current user to verify auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required. Please log in again.');
      }

      const updateData: JobApplicationUpdate = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from(TABLES.JOB_APPLICATIONS)
        .update(updateData)
        .eq('id', applicationId)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
      }
      
      if (!data) {
        throw new Error('No data returned after update. Application may not exist or you may not have permission to update it.');
      }
      
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update job application');
    }
  }

  // Delete a job application
  static async deleteApplication(applicationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.JOB_APPLICATIONS)
        .delete()
        .eq('id', applicationId);

      if (error) throw error;
    } catch (error) {
      throw new Error('Failed to delete job application');
    }
  }

  // Get application statistics for a user
  static async getApplicationStats(userId: string): Promise<ApplicationStats> {
    try {
      // Get the stats from the view if available, otherwise calculate manually
      const { data, error } = await supabase
        .from('application_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // If view doesn't exist or other error, calculate manually
        return await this.calculateStatsManually(userId);
      }

      if (!data) {
        return {
          total: 0,
          pending: 0,
          interviews: 0,
          offers: 0,
          rejected: 0,
          applied: 0,
        };
      }

      return {
        total: data.total_applications || 0,
        pending: data.pending_count || 0,
        interviews: data.interview_count || 0,
        offers: data.offer_count || 0,
        rejected: data.rejected_count || 0,
        applied: data.applied_count || 0,
      };
    } catch (error) {
      // Fallback to manual calculation
      return await this.calculateStatsManually(userId);
    }
  }

  // Manually calculate stats if view is not available
  private static async calculateStatsManually(userId: string): Promise<ApplicationStats> {
    try {
      const { data, error } = await supabase
        .from(TABLES.JOB_APPLICATIONS)
        .select('status')
        .eq('user_id', userId);

      if (error) throw error;

      const stats = {
        total: data.length,
        pending: 0,
        interviews: 0,
        offers: 0,
        rejected: 0,
        applied: 0,
      };

      data.forEach((app) => {
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
    } catch (error) {
      return {
        total: 0,
        pending: 0,
        interviews: 0,
        offers: 0,
        rejected: 0,
        applied: 0,
      };
    }
  }

  // Search applications
  static async searchApplications(
    userId: string,
    searchTerm: string,
    statusFilter?: string
  ): Promise<JobApplication[]> {
    try {
      let query = supabase
        .from(TABLES.JOB_APPLICATIONS)
        .select('*')
        .eq('user_id', userId);

      // Add search term filter
      if (searchTerm) {
        query = query.or(`company_name.ilike.%${searchTerm}%,position.ilike.%${searchTerm}%`);
      }

      // Add status filter
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error('Failed to search job applications');
    }
  }

  // Get applications by status
  static async getApplicationsByStatus(userId: string, status: string): Promise<JobApplication[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.JOB_APPLICATIONS)
        .select('*')
        .eq('user_id', userId)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error('Failed to load job applications');
    }
  }

  // Bulk update application statuses
  static async bulkUpdateStatus(applicationIds: string[], newStatus: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.JOB_APPLICATIONS)
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .in('id', applicationIds);

      if (error) throw error;
    } catch (error) {
      throw new Error('Failed to update job applications');
    }
  }

  // Get recent applications (last 30 days)
  static async getRecentApplications(userId: string, days: number = 30): Promise<JobApplication[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from(TABLES.JOB_APPLICATIONS)
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error('Failed to load recent job applications');
    }
  }
}

export default SupabaseJobApplicationService;