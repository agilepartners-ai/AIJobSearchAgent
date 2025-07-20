import { FirebaseDBService } from './firebaseDBService';

export interface JobPreferences {
  id: string;
  user_id: string;
  preferred_job_titles: string[];
  preferred_locations: string[];
  employment_type: string;
  salary_range: string;
  skills: string[];
}

export class JobPreferencesService {
  private static basePath(userId: string) {
    return `users/${userId}/jobPreferences`;
  }

  static async getJobPreferences(userId: string): Promise<JobPreferences | null> {
    return FirebaseDBService.read<JobPreferences>(this.basePath(userId));
  }

  static async saveJobPreferences(userId: string, preferences: Omit<JobPreferences, 'id' | 'user_id'>): Promise<string> {
    const fullPreferences = {
      ...preferences,
      user_id: userId,
    };
    return FirebaseDBService.create(this.basePath(userId), fullPreferences);
  }

  static async updateJobPreferences(userId: string, updates: Partial<JobPreferences>): Promise<void> {
    return FirebaseDBService.update(this.basePath(userId), updates);
  }
}
