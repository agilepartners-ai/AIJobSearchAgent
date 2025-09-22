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
  private static documentPath(userId: string): string {
    if (!userId) {
      throw new Error("User ID is required to access job preferences.");
    }
    // Use a fixed document ID for each user's job preferences
    return `users/${userId}/jobPreferences/default`;
  }

  static async getJobPreferences(userId: string): Promise<JobPreferences | null> {
    const doc = await FirebaseDBService.read<JobPreferences>(this.documentPath(userId));
    // Attach the ID since it's not stored in the document data
    return doc ? { ...doc, id: 'default' } : null;
  }

  static async saveJobPreferences(userId: string, preferences: Omit<JobPreferences, 'id' | 'user_id'>): Promise<string> {
    const fullPreferences = {
      ...preferences,
      user_id: userId,
    };
    // Use 'set' to create or overwrite the single preferences document
    await FirebaseDBService.set(this.documentPath(userId), fullPreferences);
    return 'default';
  }

  static async updateJobPreferences(userId: string, updates: Partial<JobPreferences>): Promise<void> {
    // 'update' requires a document path, which is now correctly provided
    return FirebaseDBService.update(this.documentPath(userId), updates);
  }
}
