import { FirebaseDBService } from './firebaseDBService';

export interface WorkExperience {
  id: string;
  job_title: string;
  company: string;
  duration: string;
  description?: string;
  created_at: string;
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  graduation_year: string;
  description?: string;
  created_at: string;
}

export class FirebaseProfileExtrasService {
  // Work Experience Methods
  private static workExperiencePath(userId: string) {
    return `users/${userId}/workExperience`;
  }

  static async getWorkExperience(userId: string): Promise<WorkExperience[]> {
    return FirebaseDBService.getList<WorkExperience>(this.workExperiencePath(userId));
  }

  static async addWorkExperience(userId: string, experience: Omit<WorkExperience, 'id' | 'created_at'>): Promise<string> {
    const fullExperience = { ...experience, created_at: new Date().toISOString() };
    return FirebaseDBService.create(this.workExperiencePath(userId), fullExperience);
  }

  static async updateWorkExperience(userId: string, experienceId: string, updates: Partial<WorkExperience>): Promise<void> {
    return FirebaseDBService.update(`${this.workExperiencePath(userId)}/${experienceId}`, updates);
  }

  static async deleteWorkExperience(userId: string, experienceId: string): Promise<void> {
    return FirebaseDBService.delete(`${this.workExperiencePath(userId)}/${experienceId}`);
  }

  // Education Methods
  private static educationPath(userId: string) {
    return `users/${userId}/education`;
  }

  static async getEducation(userId: string): Promise<Education[]> {
    return FirebaseDBService.getList<Education>(this.educationPath(userId));
  }

  static async addEducation(userId: string, education: Omit<Education, 'id' | 'created_at'>): Promise<string> {
    const fullEducation = { ...education, created_at: new Date().toISOString() };
    return FirebaseDBService.create(this.educationPath(userId), fullEducation);
  }

  static async updateEducation(userId: string, educationId: string, updates: Partial<Education>): Promise<void> {
    return FirebaseDBService.update(`${this.educationPath(userId)}/${educationId}`, updates);
  }

  static async deleteEducation(userId: string, educationId: string): Promise<void> {
    return FirebaseDBService.delete(`${this.educationPath(userId)}/${educationId}`);
  }
}
