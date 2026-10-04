import { authedFetch } from '../lib/api/authedFetch';

/** Preferences used to pre-fill the job search. */
export interface JobPreferences {
  id: string;
  user_id: string;
  preferred_job_titles: string[];
  preferred_locations: string[];
  employment_type: string;
  salary_range: string;
  skills: string[];
}

/** Preferences edited in the Job Preferences dialog. */
export interface ModalJobPreferences {
  id: string;
  job_titles?: string[];
  locations?: string[];
  salary_expectation?: number | null;
  employment_types?: string[];
  remote_only?: boolean;
  skills?: string[];
  updated_at?: string;
}

type Stored = Record<string, unknown>;

/**
 * Both kinds live in the one `job_preferences` row for the signed-in user
 * (/api/preferences): the dialog's fields at the top level, the search
 * pre-fill under `search`. Saving one keeps the other. The `userId` arguments
 * are kept for call-site compatibility; the server uses the session.
 */
async function load(): Promise<Stored | null> {
  return (await authedFetch<{ preferences: Stored | null }>('/api/preferences')).preferences;
}

async function store(next: Stored): Promise<void> {
  await authedFetch('/api/preferences', { method: 'PUT', body: JSON.stringify(next) });
}

export class JobPreferencesService {
  static async getJobPreferences(userId: string): Promise<JobPreferences | null> {
    const search = (await load())?.search as Omit<JobPreferences, 'id' | 'user_id'> | undefined;
    return search ? { ...search, id: 'default', user_id: userId } : null;
  }

  static async saveJobPreferences(_userId: string, preferences: Omit<JobPreferences, 'id' | 'user_id'>): Promise<string> {
    await store({ ...((await load()) ?? {}), search: preferences });
    return 'default';
  }
}

export class UserJobPreferencesService {
  static async getUserJobPreferences(_userId: string): Promise<ModalJobPreferences | null> {
    const stored = await load();
    if (!stored) return null;
    const { search: _search, ...own } = stored;
    return Object.keys(own).length ? ({ ...own, id: 'default' } as ModalJobPreferences) : null;
  }

  static async saveJobPreferences(_userId: string, preferences: Omit<ModalJobPreferences, 'id' | 'updated_at'>): Promise<void> {
    const current = (await load()) ?? {};
    await store({ ...preferences, updated_at: new Date().toISOString(), ...(current.search ? { search: current.search } : {}) });
  }

  static async deleteJobPreferences(): Promise<void> {
    const current = await load();
    await store(current?.search ? { search: current.search } : {});
  }
}
