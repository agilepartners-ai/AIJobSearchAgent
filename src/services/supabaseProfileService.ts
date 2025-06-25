import { supabase, TABLES } from '../lib/supabase';
import { Profile, ProfileInsert, ProfileUpdate } from '../types/supabase';

export interface CreateProfileData {
  full_name?: string;
  phone?: string;
  location?: string;
  resume_url?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  current_job_title?: string;
  years_of_experience?: number;
  skills?: string[];
  bio?: string;
  avatar_url?: string;
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
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to load user profile');
    }
  }

  // Create user profile
  static async createProfile(userId: string, email: string, profileData: CreateProfileData): Promise<Profile> {
    try {
      const insertData: ProfileInsert = {
        id: userId,
        email: email,
        full_name: profileData.full_name || null,
        phone: profileData.phone || null,
        location: profileData.location || null,
        resume_url: profileData.resume_url || null,
        linkedin_url: profileData.linkedin_url || null,
        github_url: profileData.github_url || null,
        portfolio_url: profileData.portfolio_url || null,
        current_job_title: profileData.current_job_title || null,
        years_of_experience: profileData.years_of_experience || 0,
        skills: profileData.skills || null,
        bio: profileData.bio || null,
        avatar_url: profileData.avatar_url || null,
      };

      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  // Update user profile
  static async updateProfile(userId: string, updates: CreateProfileData): Promise<Profile> {
    try {
      const updateData: ProfileUpdate = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  // Upload and update avatar
  static async uploadAvatar(userId: string, file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      await this.updateProfile(userId, { avatar_url: data.publicUrl });

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw new Error('Failed to upload avatar');
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
      console.error('Error uploading resume:', error);
      throw new Error('Failed to upload resume');
    }
  }

  // Add skill to profile
  static async addSkill(userId: string, skill: string): Promise<Profile> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) throw new Error('Profile not found');

      const currentSkills = profile.skills || [];
      if (!currentSkills.includes(skill)) {
        currentSkills.push(skill);
        return await this.updateProfile(userId, { skills: currentSkills });
      }
      return profile;
    } catch (error) {
      console.error('Error adding skill:', error);
      throw new Error('Failed to add skill');
    }
  }

  // Remove skill from profile
  static async removeSkill(userId: string, skill: string): Promise<Profile> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) throw new Error('Profile not found');

      const currentSkills = profile.skills || [];
      const updatedSkills = currentSkills.filter(s => s !== skill);
      return await this.updateProfile(userId, { skills: updatedSkills });
    } catch (error) {
      console.error('Error removing skill:', error);
      throw new Error('Failed to remove skill');
    }
  }

  // Get or create profile (helper method)
  static async getOrCreateProfile(userId: string, email: string, fullName?: string): Promise<Profile> {
    try {
      let profile = await this.getUserProfile(userId);
      
      if (!profile) {
        profile = await this.createProfile(userId, email, {
          full_name: fullName || '',
        });
      }
      
      return profile;
    } catch (error) {
      console.error('Error getting or creating profile:', error);
      throw new Error('Failed to load user profile');
    }
  }

  // Delete profile
  static async deleteProfile(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.PROFILES)
        .delete()
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw new Error('Failed to delete profile');
    }
  }
}

export default SupabaseProfileService;
