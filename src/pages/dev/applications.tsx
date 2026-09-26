/**
 * Development-only preview of the Applications overview with sample data.
 * /dev/applications      Not built in production.
 */
import type { GetStaticProps } from 'next';
import React, { useState } from 'react';
import OverviewView from '../../components/dashboard/views/OverviewView';
import type { JobApplication } from '../../services/firebaseJobApplicationService';

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

const SAMPLE: JobApplication[] = [
  app('1', 'Senior React Software Engineer (Remote)', 'Repisodic', 'not_applied', '2026-09-26'),
  app('2', 'React JS Developer (Full Time)', 'The Dignify Solutions', 'applied', '2026-09-19'),
  app('3', 'Senior React/Node Developer', 'FullStack Labs', 'interviewing', '2026-09-13'),
  app('4', 'Sr. Software Engineer, Backend', 'Pinterest', 'offered', '2026-09-10', { remote_option: false, location: 'San Francisco, CA' }),
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
