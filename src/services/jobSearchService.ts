// TypeScript Job Search Service
export interface JobSearchParams {
  jobProfile: string;
  experience: 'Fresher' | 'Experienced';
  location: string;
  numPages?: number;
}

export interface JobResult {
  title: string;
  company: string;
  location: string;
  job_url: string;
  apply_url: string;
  description: string;
  employment_type: string;
  posted_at: string;
  salary: string;
}

export interface JobSearchResponse {
  message: string;
  jobs: JobResult[];
  search_criteria: {
    job_profile: string;
    experience: string;
    location: string;
  };
  success: boolean;
}

export class JobSearchService {
  private static readonly JSEARCH_API_KEY = 'dfa377a0fbmsh8df80548e982bc2p1300b3jsnd59691bcf380';
  private static readonly JSEARCH_BASE_URL = 'https://jsearch.p.rapidapi.com/search';

  static async searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      // Use only state for location if possible
      const state = params.location.includes(',') 
        ? params.location.split(',').pop()?.trim() 
        : params.location;
      
      let query = `${params.jobProfile} jobs in ${state}`;
      
      // Add experience level to query
      if (params.experience.toLowerCase() === 'experienced') {
        query += ' senior';
      } else if (params.experience.toLowerCase() === 'fresher') {
        query += ' entry level';
      }

      const searchParams = new URLSearchParams({
        query: query,
        page: '1',
        num_pages: (params.numPages || 1).toString(),
        country: 'us',
        date_posted: 'all'
      });

      const response = await fetch(`${this.JSEARCH_BASE_URL}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          'X-RapidAPI-Key': this.JSEARCH_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`Job search API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        return {
          message: 'No jobs found',
          jobs: [],
          search_criteria: {
            job_profile: params.jobProfile,
            experience: params.experience,
            location: params.location
          },
          success: true
        };
      }

      const jobs: JobResult[] = data.data.map((jobData: any) => {
        const city = jobData.job_city || '';
        const jobState = jobData.job_state || '';
        const country = jobData.job_country || '';
        const locationStr = [city, jobState, country].filter(Boolean).join(', ') || 
                           jobData.job_location || 
                           jobData.employer_location || 
                           'N/A';

        return {
          title: jobData.job_title || 'N/A',
          company: jobData.employer_name || 'N/A',
          location: locationStr,
          job_url: jobData.job_url || jobData.job_apply_link || '',
          apply_url: jobData.job_apply_link || jobData.job_url || '',
          description: jobData.job_description || 'No description available',
          employment_type: jobData.job_employment_type || 'N/A',
          posted_at: jobData.job_posted_at_datetime_utc || 'N/A',
          salary: jobData.job_min_salary ? 
            `$${jobData.job_min_salary}${jobData.job_max_salary ? ` - $${jobData.job_max_salary}` : ''}` : 
            'N/A'
        };
      }).filter((job: JobResult) => job.title !== 'N/A' && job.company !== 'N/A');

      return {
        message: `Found ${jobs.length} jobs for ${params.jobProfile} in ${params.location}`,
        jobs,
        search_criteria: {
          job_profile: params.jobProfile,
          experience: params.experience,
          location: params.location
        },
        success: true
      };

    } catch (error) {
      console.error('Error searching jobs:', error);
      throw new Error(`Error searching jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper method to validate job search parameters
  static validateSearchParams(params: JobSearchParams): { isValid: boolean; error?: string } {
    if (!params.jobProfile || params.jobProfile.trim().length === 0) {
      return { isValid: false, error: 'Job profile is required' };
    }

    if (!params.location || params.location.trim().length === 0) {
      return { isValid: false, error: 'Location is required' };
    }

    if (!['Fresher', 'Experienced'].includes(params.experience)) {
      return { isValid: false, error: 'Experience must be either "Fresher" or "Experienced"' };
    }

    return { isValid: true };
  }

  // Helper method to get popular job locations
  static getPopularLocations(): string[] {
    return [
      'New York, NY',
      'San Francisco, CA',
      'Chicago, IL',
      'Austin, TX',
      'Seattle, WA',
      'Boston, MA',
      'Denver, CO',
      'Atlanta, GA',
      'Los Angeles, CA',
      'Remote'
    ];
  }

  // Helper method to get common job profiles
  static getCommonJobProfiles(): string[] {
    return [
      'Software Developer',
      'Data Scientist',
      'Frontend Developer',
      'Backend Developer',
      'Full Stack Developer',
      'DevOps Engineer',
      'Product Manager',
      'UI/UX Designer',
      'Quality Assurance Engineer',
      'Machine Learning Engineer'
    ];
  }
}
