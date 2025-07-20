// Supabase Job Preferences Service
import { supabase } from '../lib/supabase';
import { JobPreferences, JobPreferencesInsert, JobPreferencesUpdate } from '../types/supabase';

export class SupabaseJobPreferencesService {
  // Get user job preferences
  static async getUserJobPreferences(userId: string): Promise<JobPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('job_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Create or update job preferences
  static async saveJobPreferences(userId: string, preferences: Partial<JobPreferencesInsert>): Promise<JobPreferences> {
    try {
      const { data, error } = await supabase
        .from('job_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Update job preferences
  static async updateJobPreferences(userId: string, updates: JobPreferencesUpdate): Promise<JobPreferences> {
    try {
      const { data, error } = await supabase
        .from('job_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Delete job preferences
  static async deleteJobPreferences(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('job_preferences')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }
}

export default SupabaseJobPreferencesService;