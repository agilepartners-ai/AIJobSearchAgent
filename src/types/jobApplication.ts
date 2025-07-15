import { z } from 'zod';

export const JobApplicationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  company_name: z.string().min(1),
  position: z.string().min(1),
  status: z.enum([
    'not_applied',
    'applied',
    'interviewing',
    'offered',
    'rejected',
    'accepted',
    'declined'
  ]),
  application_date: z.string().datetime(),
  last_updated: z.string().datetime().nullable(),
  location: z.string().nullable(),
  job_posting_url: z.string().url().nullable(),
  job_description: z.string().nullable(),
  notes: z.string().nullable(),
  resume_url: z.string().url().nullable(),
  cover_letter_url: z.string().url().nullable(),
  salary_range: z.string().nullable(),
  employment_type: z.string().nullable(),
  remote_option: z.boolean().default(false),
  contact_person: z.string().nullable(),
  contact_email: z.string().email().nullable(),
  interview_date: z.string().datetime().nullable(),
  response_date: z.string().datetime().nullable(),
  follow_up_date: z.string().datetime().nullable(),
  priority: z.number().min(1).max(5).default(1),
  source: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable()
});

export type JobApplication = z.infer<typeof JobApplicationSchema>;

export const ApplicationStatus = {
  NOT_APPLIED: 'not_applied',
  APPLIED: 'applied',
  INTERVIEWING: 'interviewing',
  OFFERED: 'offered',
  REJECTED: 'rejected',
  ACCEPTED: 'accepted',
  DECLINED: 'declined'
} as const;

export type ApplicationStatusType = keyof typeof ApplicationStatus;
export type ApplicationStatusValue = typeof ApplicationStatus[keyof typeof ApplicationStatus];