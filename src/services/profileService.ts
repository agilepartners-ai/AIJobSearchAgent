import { supabase, TABLES } from '../lib/supabase';
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
  fullName: string;
  streetAddress?: string;
  city?: string;
  county?: string;
  state?: string;
  zipCode?: string;
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
  static async getUserProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      throw new Error('Failed to load user profile');
    }
  }

  // Get or create user profile
  static async getOrCreateProfile(userId: string, email?: string, displayName?: string): Promise<Profile> {
    try {
      // First try to get existing profile
      const existingProfile = await this.getUserProfile(userId);
      if (existingProfile) {
        return existingProfile;
      }
      
      // If profile doesn't exist, create it
      const defaultData: CreateProfileData = {
        full_name: displayName || null,
        phone: null,
        location: null,
        resume_url: null,
        linkedin_url: null,
        github_url: null,
        portfolio_url: null,
        current_job_title: null,
        years_of_experience: 0,
        skills: null,
        bio: null,
        avatar_url: null,
        expected_salary: null,
        current_ctc: null,
        work_authorization: null,
        notice_period: null,
        availability: null,
        willingness_to_relocate: false,
        twitter_url: null,
        dribbble_url: null,
        medium_url: null,
        reference_contacts: null,
        job_preferences: null
      };

      return await this.saveUserProfile(userId, defaultData);
    } catch (error) {
      throw new Error('Failed to get or create user profile');
    }
  }

  // Create or update user profile
  static async saveUserProfile(userId: string, profileData: CreateProfileData): Promise<Profile> {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .upsert({ 
          id: userId, 
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      throw new Error('Failed to save user profile');
    }
  }

  // Update user profile
  static async updateProfile(userId: string, updates: Partial<CreateProfileData>): Promise<Profile> {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .update({ 
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      throw new Error('Failed to update user profile');
    }
  }

  // Upload and update resume
  static async uploadResume(userId: string, file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-resume-${Math.random()}.${fileExt}`;
      const filePath = `resumes/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Update profile with new resume URL
      await this.updateProfile(userId, { resume_url: data.publicUrl });

      return data.publicUrl;
    } catch (error) {
      throw new Error('Failed to upload resume');
    }
  }

  // Delete user profile
  static async deleteProfile(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.PROFILES)
        .delete()
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
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