import { FirebaseDBService } from './firebaseDBService';

// Assuming these interfaces are defined in a shared types file
export interface JobApplication {
  id: string;
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
  created_at: string;
  updated_at: string | null;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  interviews: number;
  offers: number;
  rejected: number;
  applied: number;
}

export class FirebaseJobApplicationService {
  private static basePath(userId: string) {
    return `users/${userId}/jobApplications`;
  }

  static async getUserApplications(userId: string): Promise<JobApplication[]> {
    return FirebaseDBService.getList<JobApplication>(this.basePath(userId));
  }

  static async getApplication(userId: string, applicationId: string): Promise<JobApplication | null> {
    return FirebaseDBService.read<JobApplication>(`${this.basePath(userId)}/${applicationId}`);
  }

  static async addApplication(userId: string, applicationData: Omit<JobApplication, 'id' | 'created_at' | 'user_id' | 'last_updated' | 'updated_at'>): Promise<string> {
    const fullApplicationData: Omit<JobApplication, 'id'> = {
      ...applicationData,
      user_id: userId,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Ensure all nullable fields have a default value
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
    return FirebaseDBService.create(this.basePath(userId), fullApplicationData);
  }

  static async updateApplication(userId: string, applicationId: string, updates: Partial<JobApplication>): Promise<void> {
    const updateData = {
        ...updates,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    return FirebaseDBService.update(`${this.basePath(userId)}/${applicationId}`, updateData);
  }

  static async deleteApplication(userId: string, applicationId: string): Promise<void> {
    return FirebaseDBService.delete(`${this.basePath(userId)}/${applicationId}`);
  }

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
}
