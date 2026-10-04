import { authedFetch } from '../lib/api/authedFetch';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  resume_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  created_at?: string;
}

export const ProfileApi = {
  getOrCreate(fullName = ''): Promise<Profile> {
    return authedFetch<Profile>(`/api/profile?name=${encodeURIComponent(fullName)}`);
  },
  update(patch: Partial<Profile>): Promise<Profile> {
    return authedFetch<Profile>('/api/profile', { method: 'PUT', body: JSON.stringify(patch) });
  },
};
