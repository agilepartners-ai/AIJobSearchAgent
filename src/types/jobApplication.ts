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
  last_updated: z.string().datetime(),
  location: z.string().optional(),
  job_posting_url: z.string().url().optional(),
  job_description: z.string().optional(),
  notes: z.string().optional(),
  salary_range: z.string().optional(),
  employment_type: z.string().optional(),
  remote_option: z.boolean().default(false),
  contact_person: z.string().optional(),
  contact_email: z.string().email().optional(),
  interview_date: z.string().datetime().optional(),
  response_date: z.string().datetime().optional(),
  follow_up_date: z.string().datetime().optional(),
  priority: z.number().min(1).max(5).default(1),
  source: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
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