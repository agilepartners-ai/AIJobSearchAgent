import { ProfileApi } from './profileApi';

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


/**
 * The detailed profile form (UserProfileData) lives in the signed-in user's
 * profile row under `profileData`, via /api/profile. `userId` arguments are kept
 * for call-site compatibility; the server uses the session.
 */
export class ProfileService {
  static async getUserProfile(_userId: string): Promise<UserProfileData | null> {
    const profile = await ProfileApi.get();
    return (profile.profileData as UserProfileData | undefined) ?? null;
  }

  static async updateUserProfile(userId: string, profileData: Partial<UserProfileData>): Promise<void> {
    const current = (await this.getUserProfile(userId)) ?? ({} as UserProfileData);
    await ProfileApi.update({ profileData: { ...current, ...profileData } });
  }

  static async getOrCreateProfile(userId: string, email: string, fullName?: string): Promise<UserProfileData> {
    const existing = await this.getUserProfile(userId);
    if (existing) return existing;
    const profile: UserProfileData = { email, fullName: fullName || '', subscription_status: 'free' };
    await ProfileApi.update({ profileData: profile });
    return profile;
  }
}
