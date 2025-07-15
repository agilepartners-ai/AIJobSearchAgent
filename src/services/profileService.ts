
import { Profile } from '../types/supabase';

export interface CreateProfileData {
  full_name?: string | null;
  phone?: string | null;
  location?: string | null;
  resume_url?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  current_job_title?: string | null;
  years_of_experience?: number;
  skills?: string[] | null;
  bio?: string | null;
  avatar_url?: string | null;
  expected_salary?: string | null;
  current_ctc?: string | null;
  work_authorization?: string | null;
  notice_period?: string | null;
  availability?: string | null;
  willingness_to_relocate?: boolean;
  twitter_url?: string | null;
  dribbble_url?: string | null;
  medium_url?: string | null;
  reference_contacts?: string | null;
  job_preferences?: any;
}

export interface UserProfileData {
  // Personal Information
  fullName: string | null;
  streetAddress?: string | null;
  city?: string | null;
  county?: string | null;
  state?: string | null;
  zipCode?: string | null;
  contactNumber?: string | null;
  contactNumber?: string;
  hasPhoneAccess?: boolean;
  gender?: string;
  dateOfBirth?: string;
  includeAge?: boolean;
  ethnicity?: string;
  race?: string;
  hasDisabilities?: boolean;
  disabilityDescription?: string;
  veteranStatus?: string;
  travelPercentage?: string;
  openToTravel?: boolean;
  willingToRelocate?: boolean;
  canWorkEveningsWeekends?: boolean;
  otherLanguages?: string;
  nationality?: string;
  additionalNationalities?: string;
  hasOtherCitizenship?: boolean;
  visaType?: string;
  expectedSalaryFrom?: string;
  expectedSalaryTo?: string;
  salaryNotes?: string;
  linkedin_url?: string;
  location?: string;

  // Professional Information
  authorizedToWork?: boolean;
  requiresSponsorship?: boolean;
  sponsorshipType?: string;

  // References
  references?: Array<{
    fullName: string;
    relationship: string;
    companyName: string;
    jobTitle: string;
    companyAddress: string;
    phoneNumber: string;
    email: string;
  }>;

  // Education
  education?: Array<{
    degreeType: string;
    universityName: string;
    universityAddress: string;
    major: string;
    minor: string;
    timeframeFrom: string;
    timeframeTo: string;
    gpa: string;
  }>;

  // Certifications
  certifications?: Array<{
    name: string;
    licenseNumber: string;
    issuingOrganization: string;
    dateAchieved: string;
    expirationDate: string;
  }>;

  // Additional Questions
  governmentEmployment?: boolean;
  governmentDetails?: string;
  hasAgreements?: boolean;
  agreementDetails?: string;
  hasConvictions?: boolean;
  convictionDetails?: string;
  interviewAvailability?: string;

  // Metadata
  created_at?: string;
  updated_at?: string;
}

export class SupabaseProfileService {
  // Get user profile
  static async getUserProfile(): Promise<Profile | null> {
    try {
      const response = await fetch('/api/profile');

      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not authenticated');
          return null;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load user profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Return null or re-throw, depending on desired error handling
      return null;
    }
  }

  // Get or create user profile
  static async getOrCreateProfile(): Promise<Profile | null> {
    // The server-side route now handles creation, so we just call getUserProfile
    return this.getUserProfile();
  }

  // Create or update user profile
  static async saveUserProfile(profileData: CreateProfileData): Promise<Profile> {
    return this.updateProfile(profileData);
  }

  // Update user profile
  static async updateProfile(updates: Partial<CreateProfileData>): Promise<Profile> {
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  // Upload and update resume
  static async uploadResume(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/profile/resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload resume');
      }

      const { resume_url } = await response.json();
      return resume_url;
    } catch (error) {
      console.error('Error uploading resume:', error);
      throw new Error('Failed to upload resume');
    }
  }

  // Delete user profile
  static async deleteProfile(): Promise<void> {
    try {
      const response = await fetch('/api/profile', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user profile');
      }
    } catch (error) {
      console.error('Error deleting user profile:', error);
      throw new Error('Failed to delete user profile');
    }
  }
  
  // Convert Supabase Profile to UserProfileData
  static convertProfileToUserProfileData(profile: Profile): UserProfileData {
    return {
      fullName: profile.full_name || '',
      contactNumber: profile.phone || '',
      location: profile.location || '',
      linkedin_url: profile.linkedin_url || '',
      streetAddress: profile.location || '', // Use location as address
      willingToRelocate: profile.willingness_to_relocate || false,
      visaType: profile.work_authorization || '',
      expectedSalaryFrom: profile.expected_salary || '',
      interviewAvailability: profile.availability || '',
      // Add other fields as needed
    };
  }
}

// Export both class names for compatibility
export class ProfileService extends SupabaseProfileService {
  // Legacy alias for compatibility
}

// Export the service as default
export default SupabaseProfileService;