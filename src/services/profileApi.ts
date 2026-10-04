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
  /** The detailed profile form (see profileService.ts). */
  profileData?: object;
}

export const ProfileApi = {
  get(): Promise<Profile> {
    return authedFetch<Profile>('/api/profile');
  },
  getOrCreate(fullName = ''): Promise<Profile> {
    return authedFetch<Profile>(`/api/profile?name=${encodeURIComponent(fullName)}`);
  },
  update(patch: Partial<Profile>): Promise<Profile> {
    return authedFetch<Profile>('/api/profile', { method: 'PUT', body: JSON.stringify(patch) });
  },
};
