import React from 'react';
import { Search, X, Plus, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface JobSearchForm {
  query: string;
  location: string;
  experience: string;
  employment_type: string;
  remote_jobs_only: boolean;
  date_posted: string;
}

interface SearchJob {
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
}

interface JobSearchModalProps {
  isOpen: boolean;
  searchForm: JobSearchForm;
  searchResults: SearchJob[];
  searchLoading: boolean;
  searchError: string;
  onClose: () => void;
  onFormChange: (form: JobSearchForm) => void;
  onSearch: () => void;
  onSaveJob: (job: SearchJob) => void;
  onClear: () => void;
}

const JobSearchModal: React.FC<JobSearchModalProps> = ({
  isOpen,
  searchForm,
  searchResults,
  searchLoading,
  searchError,
  onClose,
  onFormChange,
  onSearch,
  onSaveJob,
  onClear,
}) => {
  if (!isOpen) return null;

  const updateForm = (field: keyof JobSearchForm, value: any) => {
    onFormChange({ ...searchForm, [field]: value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Search Jobs
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          {/* Job Search Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Title / Keywords *
              </label>
              <input
                type="text"
                value={searchForm.query}
                onChange={(e) => updateForm('query', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g. Software Engineer, React Developer"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={searchForm.location}
                onChange={(e) => updateForm('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g. New York, Chicago, Remote"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Experience Level
              </label>
              <select
                value={searchForm.experience}
                onChange={(e) => updateForm('experience', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Any Experience</option>
                <option value="entry_level">Entry Level</option>
                <option value="mid_level">Mid Level</option>
                <option value="senior_level">Senior Level</option>
                <option value="executive">Executive</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Employment Type
              </label>
              <select
                value={searchForm.employment_type}
                onChange={(e) => updateForm('employment_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Any Type</option>
                <option value="FULLTIME">Full Time</option>
                <option value="PARTTIME">Part Time</option>
                <option value="CONTRACTOR">Contract</option>
                <option value="INTERN">Internship</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Posted
              </label>
              <select
                value={searchForm.date_posted}
                onChange={(e) => updateForm('date_posted', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Any Time</option>
                <option value="today">Today</option>
                <option value="3days">Last 3 Days</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={searchForm.remote_jobs_only}
                  onChange={(e) => updateForm('remote_jobs_only', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Remote jobs only</span>
              </label>
            </div>
          </div>
          
          {searchError && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4">
              {searchError}
            </div>
          )}
          
          <div className="flex gap-4 mb-6">
            <button
              onClick={onSearch}
              disabled={searchLoading || !searchForm.query.trim()}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all disabled:cursor-not-allowed"
            >
              {searchLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search size={20} />
                  Search Jobs
                </>
              )}
            </button>
            
            <button
              onClick={onClear}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Clear
            </button>
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Search Results ({searchResults.length} jobs found)
              </h3>
              <div className="max-h-96 overflow-y-auto space-y-4">
                {searchResults.map((job, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                          {job.job_title}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400">
                          {job.employer_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {job.job_city && job.job_state ? `${job.job_city}, ${job.job_state}` : job.job_country || 'Location not specified'}
                          {job.job_is_remote && ' • Remote'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => onSaveJob(job)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all text-sm"
                        >
                          <Plus size={16} />
                          Save Job
                        </button>
                        {job.job_apply_link && (
                          <a
                            href={job.job_apply_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all text-sm text-center"
                          >
                            <ExternalLink size={16} />
                            Apply Now
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {job.job_employment_type && (
                        <div>
                          <span className="font-medium">Type:</span> {job.job_employment_type}
                        </div>
                      )}
                      {job.job_posted_at_datetime_utc && (
                        <div>
                          <span className="font-medium">Posted:</span> {format(new Date(job.job_posted_at_datetime_utc), 'MMM d, yyyy')}
                        </div>
                      )}
                      {job.job_salary_currency && job.job_min_salary && (
                        <div>
                          <span className="font-medium">Salary:</span> {job.job_salary_currency} {job.job_min_salary?.toLocaleString()}
                          {job.job_max_salary && ` - ${job.job_max_salary.toLocaleString()}`}
                          {job.job_salary_period && ` /${job.job_salary_period}`}
                        </div>
                      )}
                      {job.job_experience_in_place_of_education && (
                        <div>
                          <span className="font-medium">Experience:</span> {job.job_experience_in_place_of_education ? 'Required' : 'Not Required'}
                        </div>
                      )}
                    </div>
                    
                    {job.job_description && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                        {job.job_description.substring(0, 200)}...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobSearchModal;
