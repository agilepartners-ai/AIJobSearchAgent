import { z } from 'zod';

export const JobApplicationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  company_name: z.string().min(1),
  position: z.string().min(1),
  status: z.enum([
    'not_applied',
    'applied',
    'screening',
    'interview',
    'offer',
    'rejected',
    'accepted',
    'withdrawn'
  ]),
  application_date: z.string().datetime(),
  last_updated: z.string().datetime(),
  location: z.string().optional(),
  job_posting_url: z.string().url().optional(),
  job_description: z.string().optional(),
  notes: z.string().optional(),
  resume_url: z.string().url().optional(),
  cover_letter_url: z.string().url().optional(),
  correspondence_urls: z.array(z.string().url()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type JobApplication = z.infer<typeof JobApplicationSchema>;

export const ApplicationStatus = {
  NOT_APPLIED: 'not_applied',
  APPLIED: 'applied',
  SCREENING: 'screening',
  INTERVIEW: 'interview',
  OFFER: 'offer',
  REJECTED: 'rejected',
  ACCEPTED: 'accepted',
  WITHDRAWN: 'withdrawn'
} as const;

export type ApplicationStatusType = keyof typeof ApplicationStatus;
export type ApplicationStatusValue = typeof ApplicationStatus[keyof typeof ApplicationStatus];