// TypeScript Job Search Service
export interface JobSearchParams {
  jobProfile: string;
  experience: 'Fresher' | 'Experienced';
  location: string;
  numPages?: number;
}

export interface JobResult {
  job_title: string;
  employer_name: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_is_remote?: boolean;
  job_apply_link?: string;
  job_employment_type?: string;
  job_posted_at_datetime_utc?: string;
  job_salary_currency?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_period?: string;
  job_experience_in_place_of_education?: boolean;
  job_description?: string;
  job_url?: string;
  location?: string;
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
  private static readonly JSEARCH_API_KEY = import.meta.env.VITE_JSEARCH_API_KEY;
  private static readonly JSEARCH_API_HOST = import.meta.env.VITE_JSEARCH_API_HOST || 'jsearch.p.rapidapi.com';
  private static readonly JSEARCH_BASE_URL = 'https://jsearch.p.rapidapi.com/search';
  static async searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      // Check if API key is configured
      if (!this.JSEARCH_API_KEY) {
        throw new Error('JSEARCH_API_KEY is not configured. Please add it to your .env file.');
      }

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

      console.log('Making job search request with query:', query);
      
      const response = await fetch(`${this.JSEARCH_BASE_URL}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Host': this.JSEARCH_API_HOST,
          'X-RapidAPI-Key': this.JSEARCH_API_KEY
        }
      });

      console.log('Job search API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Job search API error response:', errorText);
        throw new Error(`Job search API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Job search API response data:', data);
      
      if (!data.data || !Array.isArray(data.data)) {
        console.warn('No jobs data found in response:', data);
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
      }      const jobs: JobResult[] = data.data.map((jobData: any, index: number) => {
        if (index < 3) {
          console.log(`Sample job data ${index + 1}:`, jobData);
        }
        
        const city = jobData.job_city || '';
        const jobState = jobData.job_state || '';
        const country = jobData.job_country || '';
        const locationStr = [city, jobState, country].filter(Boolean).join(', ') || 
                           jobData.job_location || 
                           jobData.employer_location || 
                           'N/A';

        const mappedJob = {
          job_title: jobData.job_title || 'N/A',
          employer_name: jobData.employer_name || 'N/A',
          job_city: jobData.job_city || '',
          job_state: jobData.job_state || '',
          job_country: jobData.job_country || '',
          job_is_remote: jobData.job_is_remote || false,
          job_apply_link: jobData.job_apply_link || jobData.job_url || '',
          job_employment_type: jobData.job_employment_type || 'N/A',
          job_posted_at_datetime_utc: jobData.job_posted_at_datetime_utc || '',
          job_salary_currency: jobData.job_salary_currency || '',
          job_min_salary: jobData.job_min_salary || undefined,
          job_max_salary: jobData.job_max_salary || undefined,
          job_salary_period: jobData.job_salary_period || '',
          job_experience_in_place_of_education: jobData.job_experience_in_place_of_education || false,
          job_description: jobData.job_description || 'No description available',
          job_url: jobData.job_url || jobData.job_apply_link || '',
          location: locationStr
        };

        if (index < 3) {
          console.log(`Mapped job ${index + 1}:`, mappedJob);
        }

        return mappedJob;
      }).filter((job: JobResult) => job.job_title !== 'N/A' && job.employer_name !== 'N/A');

      console.log(`Successfully mapped ${jobs.length} jobs from ${data.data.length} raw results`);

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
