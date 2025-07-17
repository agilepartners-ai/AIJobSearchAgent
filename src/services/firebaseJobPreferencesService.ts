import { FirebaseDBService } from './firebaseDBService';

export interface JobPreferences {
  id: string;
  job_titles?: string[];
  locations?: string[];
  salary_expectation?: number;
  employment_types?: string[];
  remote_only?: boolean;
  skills?: string[];
  updated_at?: string;
}

export class FirebaseJobPreferencesService {
  private static basePath(userId: string) {
    return `users/${userId}/jobPreferences`;
  }

  static async getUserJobPreferences(userId: string): Promise<JobPreferences | null> {
    return FirebaseDBService.read<JobPreferences>(this.basePath(userId));
  }

  static async saveJobPreferences(userId: string, preferences: Omit<JobPreferences, 'id' | 'updated_at'>): Promise<void> {
    const fullPreferences = {
      ...preferences,
      updated_at: new Date().toISOString(),
    };
    return FirebaseDBService.update(this.basePath(userId), fullPreferences);
  }

  static async deleteJobPreferences(userId: string): Promise<void> {
    return FirebaseDBService.delete(this.basePath(userId));
  }
}
