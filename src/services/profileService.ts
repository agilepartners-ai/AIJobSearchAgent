import { FirebaseDBService } from './firebaseDBService';

export interface UserProfileData {
  // Basic Information
  fullName: string;
  email: string;
  phone?: string;
  location?: string;

  // Job Information
  currentJobTitle?: string;
  jobProfile?: string;
  experience?: 'Fresher' | 'Experienced';
  workExperience?: {
    jobTitle: string;
    company: string;
    duration: string;
  }[];

  // Education
  education?: {
    degree: string;
    institution: string;
    graduationYear: string;
  }[];

  // Skills and Preferences
  skills?: string[];
  expectedSalary?: string;
  currentCTC?: string;

  // Job Search Preferences
  employmentType?: string;
  remoteJobsOnly?: boolean;
  datePosted?: string;

  // Work Authorization
  willingnessToRelocate?: boolean;
  workAuthorization?: string;
  noticePeriod?: string;
  availability?: string;

  // References and Social Links
  references?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;

  // Optional Fields You Already Had
  resume_url?: string;
  cover_letter_template?: string;
  subscription_status?: string;
}


export class ProfileService {
  private static basePath(userId: string) {
    return `users/${userId}/profile/main`; // ✅ This is a document path, not a collection
  }

  static async getUserProfile(userId: string): Promise<UserProfileData | null> {
    return FirebaseDBService.read<UserProfileData>(this.basePath(userId));
  }

  static async updateUserProfile(userId: string, profileData: Partial<UserProfileData>): Promise<void> {
    return FirebaseDBService.update(this.basePath(userId), profileData); // ✅ Already correct
  }

  static async getOrCreateProfile(userId: string, email: string, fullName?: string): Promise<UserProfileData> {
    let profile = await this.getUserProfile(userId);
    if (!profile) {
      profile = {
        email,
        fullName: fullName || '',
        subscription_status: 'free',
      };
      // ❌ WRONG: await FirebaseDBService.create(...); ← this causes "document path must be even"
      // ✅ FIXED:
      await FirebaseDBService.set(this.basePath(userId), profile);
    }
    return profile;
  }
}

