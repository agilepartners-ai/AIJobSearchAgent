import { authedFetch } from '../lib/api/authedFetch';

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

/**
 * Job applications, stored in Postgres behind /api/applications.
 *
 * The `userId` arguments are kept so existing call sites did not have to change;
 * they are not sent. The server scopes every request to the signed-in user from
 * the session token, so no caller can read or write another account's data.
 */
export class JobApplicationService {
  static getUserApplications(_userId: string): Promise<JobApplication[]> {
    return authedFetch<JobApplication[]>('/api/applications');
  }

  static async getApplication(_userId: string, applicationId: string): Promise<JobApplication | null> {
    try {
      return await authedFetch<JobApplication>(`/api/applications/${encodeURIComponent(applicationId)}`);
    } catch (error) {
      if ((error as { status?: number }).status === 404) return null;
      throw error;
    }
  }

  static async addApplication(
    _userId: string,
    applicationData: Omit<JobApplication, 'id' | 'created_at' | 'user_id' | 'last_updated' | 'updated_at'>,
  ): Promise<string> {
    const created = await authedFetch<JobApplication>('/api/applications', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
    return created.id;
  }

  static async updateApplication(_userId: string, applicationId: string, updates: Partial<JobApplication>): Promise<void> {
    await authedFetch(`/api/applications/${encodeURIComponent(applicationId)}`, { method: 'PATCH', body: JSON.stringify(updates) });
  }

  static async deleteApplication(_userId: string, applicationId: string): Promise<void> {
    await authedFetch(`/api/applications/${encodeURIComponent(applicationId)}`, { method: 'DELETE' });
  }

  static async getApplicationStats(userId: string): Promise<ApplicationStats> {
    return statsOf(await this.getUserApplications(userId));
  }
}

export function statsOf(applications: JobApplication[]): ApplicationStats {
  const stats: ApplicationStats = { total: applications.length, pending: 0, interviews: 0, offers: 0, rejected: 0, applied: 0 };
  for (const app of applications) {
    switch (app.status) {
      case 'not_applied': stats.pending++; break;
      case 'applied': stats.applied++; break;
      case 'interviewing': stats.interviews++; break;
      case 'offered': stats.offers++; break;
      case 'rejected':
      case 'declined': stats.rejected++; break;
    }
  }
  return stats;
}
