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

  // Detailed AI-enhanced sections from aiEnhancementService
  detailedResumeSections?: {
    professional_summary?: string;
    technical_skills?: string[];
    soft_skills?: string[];
    experience?: Array<{
      company: string;
      position: string;
      duration: string;
      location: string;
      achievements: string[];
      key_responsibilities: string[];
      technologies_used: string[];
      quantified_results: string[];
    }>;
    education?: Array<{
      institution: string;
      degree: string;
      field_of_study: string;
      graduation_date: string;
      gpa?: string;
      relevant_coursework: string[];
      honors: string[];
    }>;
    projects?: Array<{
      name: string;
      description: string;
      technologies: string[];
      achievements: string[];
      duration: string;
      team_size?: string;
      role: string;
    }>;
    certifications?: Array<{
      name: string;
      issuing_organization: string;
      issue_date: string;
      expiration_date?: string;
      credential_id?: string;
    }>;
    awards?: Array<{
      title: string;
      issuing_organization: string;
      date: string;
      description: string;
    }>;
    volunteer_work?: Array<{
      organization: string;
      role: string;
      duration: string;
      description: string;
      achievements: string[];
    }>;
    publications?: Array<{
      title: string;
      publication: string;
      date: string;
      authors: string[];
      description: string;
    }>;
  };

  // Detailed cover letter from AI enhancement
  detailedCoverLetter?: {
    opening_paragraph?: string;
    body_paragraph?: string;
    closing_paragraph?: string;
  };
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

