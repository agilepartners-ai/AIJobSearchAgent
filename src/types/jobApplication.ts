export interface JobApplication {
  id: string;
  user_id: string;
  company_name: string;
  position: string;
  status: ApplicationStatus;
  application_date: string;
  last_updated: string;
  notes?: string;
  job_description?: string;
  resume_url?: string;
  cover_letter_url?: string;
  created_at: string;
  updated_at: string;
}

export enum ApplicationStatus {
  Saved = 'saved',
  Applied = 'applied',
  Interview = 'interview',
  Accepted = 'accepted',
  Rejected = 'rejected',
}
