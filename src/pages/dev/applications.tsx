/**
 * Development-only preview of the Applications overview with sample data.
 * /dev/applications      Not built in production.
 */
import type { GetStaticProps } from 'next';
import React, { useState } from 'react';
import OverviewView from '../../components/dashboard/views/OverviewView';
import type { JobApplication } from '../../services/jobApplicationService';

export const getStaticProps: GetStaticProps = async () =>
  process.env.NODE_ENV === 'production' ? { notFound: true } : { props: {} };

const app = (id: string, position: string, company: string, status: JobApplication['status'], date: string, extra: Partial<JobApplication> = {}): JobApplication => ({
  id,
  user_id: 'u',
  company_name: company,
  position,
  status,
  application_date: date,
  last_updated: date,
  location: 'United States',
  job_posting_url: 'https://example.com/job',
  job_description: 'Sample description',
  notes: null,
  resume_url: null,
  cover_letter_url: null,
  salary_range: null,
  employment_type: null,
  remote_option: true,
  contact_person: null,
  contact_email: null,
  interview_date: null,
  response_date: null,
  follow_up_date: null,
  priority: 1,
  source: null,
  created_at: date,
  updated_at: date,
  ...extra,
});

const DESCRIPTION = `About the role
We are looking for a senior engineer to own our checkout experience end to end.

What you will do
- Build and ship React and TypeScript features used by millions of shoppers
- Partner with design and backend teams on GraphQL APIs
- Raise the bar on testing, performance and accessibility

What we are looking for
- 5+ years of professional frontend experience
- Strong React, TypeScript and testing habits (Jest, Cypress)
- Experience with performance profiling and monitoring`;

const SAMPLE: JobApplication[] = [
  app('1', 'Senior React Software Engineer (Remote)', 'Repisodic', 'not_applied', '2026-09-26', { location: 'Philadelphia, PA', salary_range: '$140k - $170k', employment_type: 'Full-time', job_description: DESCRIPTION, source: 'job_search' }),
  app('2', 'React JS Developer (Full Time) - 100% Remote', 'The Dignify Solutions', 'applied', '2026-09-19', { location: 'New York, NY', employment_type: 'Full-time', job_description: DESCRIPTION, contact_person: 'Maya Chen', contact_email: 'maya@dignify.example', resume_url: 'https://example.com/r.pdf', cover_letter_url: 'https://example.com/c.pdf', notes: 'Recruiter said to expect a call next week.' }),
  app('3', 'Senior React/Node Developer - Remote - USA', 'FullStack Labs', 'interviewing', '2026-09-13', { location: 'Cheyenne, WY', job_description: DESCRIPTION, interview_date: '2026-10-02' }),
  app('4', 'Sr. Software Engineer, Backend', 'Pinterest', 'offered', '2026-09-10', { remote_option: false, location: 'San Francisco, CA', salary_range: '$190k+', job_description: DESCRIPTION }),
  app('5', 'Frontend Engineer', 'Northwind', 'rejected', '2026-09-02', { job_posting_url: null, job_description: null }),
];

export default function ApplicationsPreview() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [apps, setApps] = useState(SAMPLE);
  return (
    <div className="h-screen bg-slate-50 dark:bg-[#050505]">
      <OverviewView
        stats={{ total: 5, applied: 1, pending: 1, interviews: 1, offers: 1, rejected: 1 }}
        applications={apps}
        searchTerm={search}
        statusFilter={filter}
        onSearchTermChange={setSearch}
        onStatusFilterChange={setFilter}
        onEditApplication={() => undefined}
        onViewJobDescription={() => undefined}
        onDeleteApplication={(id) => setApps((a) => a.filter((x) => x.id !== id))}
        onUpdateApplicationStatus={(id, status) => setApps((a) => a.map((x) => (x.id === id ? { ...x, status: status as JobApplication['status'] } : x)))}
        onLoadAIEnhanced={() => undefined}
      />
    </div>
  );
}
