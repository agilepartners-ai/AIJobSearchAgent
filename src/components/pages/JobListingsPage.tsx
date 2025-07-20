import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Building, 
  Clock, 
  ExternalLink,
  CheckCircle,
  User,
  LogOut,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import SupabaseAuthService from '../../services/supabaseAuthService';
import { JobSearchService, JobResult, JobSearchParams } from '../../services/jobSearchService';
import { useToastContext } from '../ui/ToastProvider';

interface JobSearchForm {
  query: string;
  location: string;
  experience: string;
  employment_type: string;
  remote_jobs_only: boolean;
  date_posted: string;
}

const JobListingsPage: React.FC = () => {  const navigate = useNavigate();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { showWarning } = useToastContext();
  const [loading, setLoading] = useState(true);
  const [searchCriteria, setSearchCriteria] = useState<JobSearchForm | null>(null);
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');

  // Redirect to login if not authenticated (but wait for auth to load)
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    // Get search criteria from localStorage
    const storedCriteria = localStorage.getItem('jobSearchCriteria');
    if (storedCriteria) {
      const criteria = JSON.parse(storedCriteria);
      setSearchCriteria(criteria);
      searchJobs(criteria);
    } else {
      // If no criteria found, set loading to false to show the "no search" message
      setLoading(false);
    }
  }, [navigate]);

  const searchJobs = async (criteria: JobSearchForm) => {
    setLoading(true);
    setError('');
    
    try {
      // Convert JobSearchForm to JobSearchParams
      const searchParams: JobSearchParams = {
        jobProfile: criteria.query,
        experience: criteria.experience === 'entry_level' || criteria.experience === '' ? 'Fresher' : 'Experienced',
        location: criteria.location,
        numPages: 1
      };
      
      const response = await JobSearchService.searchJobs(searchParams);
      setJobs(response.jobs);
    } catch (err: any) {
      setError(err.message || 'Failed to search jobs');
      // Show some sample jobs for demo purposes
      setJobs(generateSampleJobs(criteria));
    } finally {
      setLoading(false);
    }
  };

  const generateSampleJobs = (criteria: JobSearchForm): JobResult[] => {
    return [
      {
        job_title: criteria.query || 'Software Engineer',
        employer_name: 'TechCorp Inc.',
        job_city: 'New York',
        job_state: 'NY',
        job_country: 'US',
        job_is_remote: criteria.remote_jobs_only,
        job_employment_type: 'FULLTIME',
        job_posted_at_datetime_utc: new Date().toISOString(),
        job_salary_currency: 'USD',
        job_min_salary: 80000,
        job_max_salary: 120000,
        job_salary_period: 'YEAR',
        job_description: 'We are looking for a talented software engineer to join our growing team...'
      },
      {
        job_title: criteria.query || 'Senior Developer',
        employer_name: 'InnovateTech',
        job_city: 'San Francisco',
        job_state: 'CA',
        job_country: 'US',
        job_is_remote: true,
        job_employment_type: 'FULLTIME',
        job_posted_at_datetime_utc: new Date(Date.now() - 86400000).toISOString(),
        job_salary_currency: 'USD',
        job_min_salary: 100000,
        job_max_salary: 150000,
        job_salary_period: 'YEAR',
        job_description: 'Join our remote-first team and work on cutting-edge technology...'
      },
      {
        job_title: criteria.query || 'Full Stack Developer',
        employer_name: 'StartupXYZ',
        job_city: 'Austin',
        job_state: 'TX',
        job_country: 'US',
        job_is_remote: false,
        job_employment_type: 'FULLTIME',
        job_posted_at_datetime_utc: new Date(Date.now() - 172800000).toISOString(),
        job_salary_currency: 'USD',
        job_min_salary: 70000,
        job_max_salary: 95000,
        job_salary_period: 'YEAR',
        job_description: 'Exciting opportunity to work at a fast-growing startup...'
      }
    ];
  };

  const handleJobSelection = (index: number) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedJobs(newSelected);
  };

  const handleProceed = () => {
    if (selectedJobs.size === 0) {
      showWarning('No Jobs Selected', 'Please select at least one job to proceed.');
      return;
    }

    // Store selected jobs in localStorage
    const selectedJobsData = Array.from(selectedJobs).map(index => jobs[index]);
    localStorage.setItem('selectedJobs', JSON.stringify(selectedJobsData));
    
    // Navigate to dashboard
    navigate('/dashboard');
  };

  const handleSignOut = async () => {
    try {
      await SupabaseAuthService.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleBack = () => {
    navigate('/job-search');
  };
  const formatSalary = (job: JobResult) => {
    if (job.job_min_salary && job.job_max_salary) {
      return `$${job.job_min_salary.toLocaleString()} - $${job.job_max_salary.toLocaleString()}`;
    }
    return 'Salary not specified';
  };

  const formatLocation = (job: JobResult) => {
    if (job.job_is_remote) return 'Remote';
    return `${job.job_city}, ${job.job_state}`;
  };

  const formatPostedDate = (dateString?: string) => {
    if (!dateString) return 'Recently posted';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  // Show loading if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-400">Searching for jobs...</p>
        </div>
      </div>
    );
  }

  // Show "no search criteria" message if user accessed this page directly
  if (!searchCriteria && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={handleBack}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  title="Back to search"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">JS</span>
                  </div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Job Opportunities</h1>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <User size={16} />
                  <span>Welcome, {userProfile?.email || user?.email}!</span>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Sign out"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* No Search Message */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white font-bold text-2xl">JS</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              No Job Search Found
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              It looks like you haven't searched for jobs yet. Start by searching for your dream job!
            </p>
            <button
              onClick={handleBack}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 mx-auto transition-all hover:shadow-lg"
            >
              <ArrowLeft size={20} />
              Search for Jobs
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleBack}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Back to search"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">JS</span>
                </div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Job Opportunities</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <User size={16} />
                <span>Welcome, {userProfile?.email || user?.email}!</span>
              </div>
              <button 
                onClick={handleSignOut}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Sign out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Summary */}
        {searchCriteria && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Search Results for "{searchCriteria.query}"
            </h2>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>📍 {searchCriteria.location}</span>
              {searchCriteria.experience && <span>💼 {searchCriteria.experience}</span>}
              {searchCriteria.employment_type && <span>⏰ {searchCriteria.employment_type}</span>}
              {searchCriteria.remote_jobs_only && <span>🏠 Remote only</span>}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg mb-6">
            {error} (Showing sample jobs for demonstration)
          </div>
        )}

        {/* Jobs Grid */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              Found {jobs.length} opportunities
            </h3>
            {jobs.length > 0 && (
              <p className="text-gray-600 dark:text-gray-400">
                Select jobs you're interested in ({selectedJobs.size} selected)
              </p>
            )}
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-gray-500 dark:text-gray-400 text-2xl">📋</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                No Jobs Found
              </h3>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                We couldn't find any jobs matching your search criteria. Try adjusting your search terms or expanding your location preferences.
              </p>
              <button
                onClick={handleBack}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 mx-auto transition-all hover:shadow-lg"
              >
                <ArrowLeft size={20} />
                Try New Search
              </button>
            </div>
          ) : (
            <div className="grid gap-6">
            {jobs.map((job, index) => (
              <div
                key={index}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 transition-all cursor-pointer hover:shadow-md ${
                  selectedJobs.has(index)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
                onClick={() => handleJobSelection(index)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {job.job_title}
                        </h4>
                        {selectedJobs.has(index) && (
                          <CheckCircle className="h-6 w-6 text-blue-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-3">
                        <Building size={16} />
                        <span className="font-medium">{job.employer_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <MapPin size={16} />
                      <span>{formatLocation(job)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <DollarSign size={16} />
                      <span>{formatSalary(job)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Clock size={16} />
                      <span>{job.job_employment_type || 'Full-time'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar size={16} />
                      <span>{formatPostedDate(job.job_posted_at_datetime_utc)}</span>
                    </div>
                  </div>

                  {job.job_description && (
                    <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-2 mb-4">
                      {job.job_description}
                    </p>
                  )}

                  {job.job_apply_link && (
                    <a
                      href={job.job_apply_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Details
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))}
            </div>
          )}
        </div>

        {/* Proceed Button */}
        {jobs.length > 0 && (
          <div className="mt-12 text-center">
            <button
              onClick={handleProceed}
              disabled={selectedJobs.size === 0}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-12 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 mx-auto transition-all hover:shadow-lg disabled:cursor-not-allowed"
            >
              Proceed to Dashboard ({selectedJobs.size} jobs selected)
              <ArrowRight size={20} />
            </button>
            <p className="text-gray-600 dark:text-gray-400 mt-4 text-sm">
              You can manage your selected jobs and apply from your dashboard
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default JobListingsPage;
