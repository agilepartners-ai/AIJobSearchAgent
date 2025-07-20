// Supabase database type definitions
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          location: string | null;
          resume_url: string | null;
          linkedin_url: string | null;
          github_url: string | null;
          portfolio_url: string | null;
          current_job_title: string | null;
          years_of_experience: number;
          skills: string[] | null;
          bio: string | null;
          avatar_url: string | null;
          expected_salary: string | null;
          current_ctc: string | null;
          work_authorization: string | null;
          notice_period: string | null;
          availability: string | null;
          willingness_to_relocate: boolean;
          twitter_url: string | null;
          dribbble_url: string | null;
          medium_url: string | null;
          reference_contacts: string | null;
          job_preferences: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
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
          job_preferences?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
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
          job_preferences?: any | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_applications: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          position: string;
          status: 'not_applied' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'accepted' | 'declined';
          application_date: string;
          job_posting_url: string | null;
          job_description: string | null;
          notes: string | null;
          salary_range: string | null;
          location: string | null;
          employment_type: string | null;
          remote_option: boolean;
          contact_person: string | null;
          contact_email: string | null;
          interview_date: string | null;
          response_date: string | null;
          follow_up_date: string | null;
          priority: number;
          source: string | null;
          resume_url: string | null;
          cover_letter_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          position: string;
          status?: 'not_applied' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'accepted' | 'declined';
          application_date?: string;
          job_posting_url?: string | null;
          job_description?: string | null;
          notes?: string | null;
          salary_range?: string | null;
          location?: string | null;
          employment_type?: string | null;
          remote_option?: boolean;
          contact_person?: string | null;
          contact_email?: string | null;
          interview_date?: string | null;
          response_date?: string | null;
          follow_up_date?: string | null;
          priority?: number;
          source?: string | null;
          resume_url?: string | null;
          cover_letter_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          position?: string;
          status?: 'not_applied' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'accepted' | 'declined';
          application_date?: string;
          job_posting_url?: string | null;
          job_description?: string | null;
          notes?: string | null;
          salary_range?: string | null;
          location?: string | null;
          employment_type?: string | null;
          remote_option?: boolean;
          contact_person?: string | null;
          contact_email?: string | null;
          interview_date?: string | null;
          response_date?: string | null;
          follow_up_date?: string | null;
          priority?: number;
          source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_preferences: {
        Row: {
          id: string;
          user_id: string;
          preferred_job_titles: string[];
          preferred_locations: string[] | null;
          preferred_salary_min: number | null;
          preferred_salary_max: number | null;
          preferred_employment_types: string[] | null;
          remote_preference: 'remote_only' | 'hybrid' | 'on_site' | 'flexible';
          preferred_company_sizes: string[] | null;
          preferred_industries: string[] | null;
          excluded_companies: string[] | null;
          minimum_experience_years: number;
          maximum_experience_years: number | null;
          preferred_skills: string[] | null;
          deal_breakers: string[] | null;
          additional_notes: string | null;
          created_at: string;
          updated_at: string;
          willing_to_relocate?: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          preferred_job_titles: string[];
          preferred_locations?: string[] | null;
          preferred_salary_min?: number | null;
          preferred_salary_max?: number | null;
          preferred_employment_types?: string[] | null;
          remote_preference?: 'remote_only' | 'hybrid' | 'on_site' | 'flexible';
          preferred_company_sizes?: string[] | null;
          preferred_industries?: string[] | null;
          excluded_companies?: string[] | null;
          minimum_experience_years?: number;
          maximum_experience_years?: number | null;
          preferred_skills?: string[] | null;
          deal_breakers?: string[] | null;
          additional_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          willing_to_relocate?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          preferred_job_titles?: string[];
          preferred_locations?: string[] | null;
          preferred_salary_min?: number | null;
          preferred_salary_max?: number | null;
          preferred_employment_types?: string[] | null;
          remote_preference?: 'remote_only' | 'hybrid' | 'on_site' | 'flexible';
          preferred_company_sizes?: string[] | null;
          preferred_industries?: string[] | null;
          excluded_companies?: string[] | null;
          minimum_experience_years?: number;
          maximum_experience_years?: number | null;
          preferred_skills?: string[] | null;
          deal_breakers?: string[] | null;
          additional_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          willing_to_relocate?: boolean;
        };
      };
      application_activities: {
        Row: {
          id: string;
          application_id: string;
          activity_type: 'status_change' | 'note_added' | 'interview_scheduled' | 'follow_up' | 'document_sent' | 'response_received';
          old_status: string | null;
          new_status: string | null;
          description: string;
          activity_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          activity_type: 'status_change' | 'note_added' | 'interview_scheduled' | 'follow_up' | 'document_sent' | 'response_received';
          old_status?: string | null;
          new_status?: string | null;
          description: string;
          activity_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          activity_type?: 'status_change' | 'note_added' | 'interview_scheduled' | 'follow_up' | 'document_sent' | 'response_received';
          old_status?: string | null;
          new_status?: string | null;
          description?: string;
          activity_date?: string;
          created_at?: string;
        };
      };
      application_documents: {
        Row: {
          id: string;
          application_id: string;
          document_type: 'resume' | 'cover_letter' | 'portfolio' | 'transcript' | 'certification' | 'other';
          document_name: string;
          document_url: string;
          file_size: number | null;
          mime_type: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          document_type: 'resume' | 'cover_letter' | 'portfolio' | 'transcript' | 'certification' | 'other';
          document_name: string;
          document_url: string;
          file_size?: number | null;
          mime_type?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          document_type?: 'resume' | 'cover_letter' | 'portfolio' | 'transcript' | 'certification' | 'other';
          document_name?: string;
          document_url?: string;
          file_size?: number | null;
          mime_type?: string | null;
          uploaded_at?: string;
        };
      };
    };
    Views: {
      application_stats: {
        Row: {
          user_id: string;
          total_applications: number;
          applied_count: number;
          interview_count: number;
          offer_count: number;
          rejected_count: number;
          accepted_count: number;
          pending_count: number;
        };
      };
      recent_activities: {
        Row: {
          id: string;
          application_id: string;
          activity_type: string;
          old_status: string | null;
          new_status: string | null;
          description: string;
          activity_date: string;
          created_at: string;
          company_name: string;
          position: string;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Type aliases for easier use
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type JobApplication = Database['public']['Tables']['job_applications']['Row'];
export type JobPreferences = Database['public']['Tables']['job_preferences']['Row'];
export type ApplicationActivity = Database['public']['Tables']['application_activities']['Row'];
export type ApplicationDocument = Database['public']['Tables']['application_documents']['Row'];
export type ApplicationStats = Database['public']['Views']['application_stats']['Row'];

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type JobApplicationInsert = Database['public']['Tables']['job_applications']['Insert'];
export type JobPreferencesInsert = Database['public']['Tables']['job_preferences']['Insert'];
export type ApplicationActivityInsert = Database['public']['Tables']['application_activities']['Insert'];
export type ApplicationDocumentInsert = Database['public']['Tables']['application_documents']['Insert'];

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type JobApplicationUpdate = Database['public']['Tables']['job_applications']['Update'];
export type JobPreferencesUpdate = Database['public']['Tables']['job_preferences']['Update'];
export type ApplicationActivityUpdate = Database['public']['Tables']['application_activities']['Update'];
export type ApplicationDocumentUpdate = Database['public']['Tables']['application_documents']['Update'];

// Application status enum
export const ApplicationStatus = {
  not_applied: 'not_applied',
  applied: 'applied', 
  interviewing: 'interviewing',
  offered: 'offered',
  rejected: 'rejected',
  accepted: 'accepted',
  declined: 'declined'
} as const;

export type ApplicationStatusType = keyof typeof ApplicationStatus;