// Test file to verify job search functionality
import { JobSearchService } from '../services/jobSearchService';

// Test the job search functionality
async function testJobSearch() {
  try {
    console.log('Testing job search functionality...');
    
    const searchParams = {
      jobProfile: 'Software Developer',
      experience: 'Fresher' as const,
      location: 'New York, NY',
      numPages: 1
    };

    console.log('Search parameters:', searchParams);
    
    const results = await JobSearchService.searchJobs(searchParams);
    
    console.log('Search successful!');
    console.log('Message:', results.message);
    console.log('Number of jobs found:', results.jobs.length);
    console.log('Search criteria:', results.search_criteria);
    
    if (results.jobs.length > 0) {
      console.log('First job example:', {
        title: results.jobs[0].title,
        company: results.jobs[0].company,
        location: results.jobs[0].location
      });
    }
    
  } catch (error) {
    console.error('Job search test failed:', error);
  }
}

// Test validation
function testValidation() {
  console.log('Testing validation...');
  
  // Test valid params
  const validParams = {
    jobProfile: 'Data Scientist',
    experience: 'Experienced' as const,
    location: 'San Francisco, CA'
  };
  
  const validResult = JobSearchService.validateSearchParams(validParams);
  console.log('Valid params result:', validResult);
  
  // Test invalid params
  const invalidParams = {
    jobProfile: '',
    experience: 'Invalid' as any,
    location: ''
  };
  
  const invalidResult = JobSearchService.validateSearchParams(invalidParams);
  console.log('Invalid params result:', invalidResult);
}

// Test helper methods
function testHelpers() {
  console.log('Testing helper methods...');
  
  const locations = JobSearchService.getPopularLocations();
  console.log('Popular locations:', locations.slice(0, 3));
  
  const profiles = JobSearchService.getCommonJobProfiles();
  console.log('Common job profiles:', profiles.slice(0, 3));
}

// Run tests
console.log('=== Job Search Service Tests ===');
testValidation();
testHelpers();

// Uncomment the line below to test actual API calls (requires API key)
// testJobSearch();
