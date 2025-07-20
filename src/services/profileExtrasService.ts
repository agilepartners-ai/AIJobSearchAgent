import { supabase } from '../lib/supabase';

export interface WorkExperience {
  id?: string;
  user_id: string;
  job_title: string;
  company: string;
  duration: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Education {
  id?: string;
  user_id: string;
  degree: string;
  institution: string;
  graduation_year: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export class ProfileExtrasService {
  // Work Experience Methods
  static async getWorkExperience(userId: string): Promise<WorkExperience[]> {
    try {
      const { data, error } = await supabase
        .from('work_experience')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching work experience:', error);
      return [];
    }
  }

  static async addWorkExperience(experience: Omit<WorkExperience, 'id' | 'created_at' | 'updated_at'>): Promise<WorkExperience | null> {
    try {
      const { data, error } = await supabase
        .from('work_experience')
        .insert(experience)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding work experience:', error);
      return null;
    }
  }

  static async updateWorkExperience(id: string, updates: Partial<WorkExperience>): Promise<WorkExperience | null> {
    try {
      const { data, error } = await supabase
        .from('work_experience')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating work experience:', error);
      return null;
    }
  }

  static async deleteWorkExperience(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('work_experience')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting work experience:', error);
      return false;
    }
  }

  // Education Methods
  static async getEducation(userId: string): Promise<Education[]> {
    try {
      const { data, error } = await supabase
        .from('education')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching education:', error);
      return [];
    }
  }

  static async addEducation(education: Omit<Education, 'id' | 'created_at' | 'updated_at'>): Promise<Education | null> {
    try {
      const { data, error } = await supabase
        .from('education')
        .insert(education)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding education:', error);
      return null;
    }
  }

  static async updateEducation(id: string, updates: Partial<Education>): Promise<Education | null> {
    try {
      const { data, error } = await supabase
        .from('education')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating education:', error);
      return null;
    }
  }

  static async deleteEducation(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('education')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting education:', error);
      return false;
    }
  }
}
