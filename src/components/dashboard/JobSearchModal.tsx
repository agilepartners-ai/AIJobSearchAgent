import React, { useState, useEffect } from 'react';
import { Search, X, Plus, ExternalLink, Settings, Target, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import SupabaseJobPreferencesService from '../../services/supabaseJobPreferencesService';
import { JobPreferences } from '../../types/supabase';

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
  onSaveMultipleJobs?: (jobs: SearchJob[]) => void;
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
  onSaveMultipleJobs,
  onClear,
}) => {
  const { user } = useAuth();
  const [jobPreferences, setJobPreferences] = useState<JobPreferences | null>(null);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen && user) {
      loadJobPreferences();
    }
  }, [isOpen, user]);

  // Auto-collapse form when search results are available
  useEffect(() => {
    if (searchResults.length > 0) {
      setIsFormCollapsed(true);
    }
  }, [searchResults]);

  // Clear selected jobs when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedJobs(new Set());
      setIsFormCollapsed(false);
    }
  }, [isOpen]);

  const loadJobPreferences = async () => {
    if (!user) return;

    try {
      const preferences = await SupabaseJobPreferencesService.getUserJobPreferences(user.uid);
      setJobPreferences(preferences);
    } catch (err: any) {
      console.error('Error loading job preferences:', err);
    }
  };

  const applyPreferencesToSearch = () => {
    if (!jobPreferences) return;

    const jobTitles = jobPreferences.preferred_job_titles || [];
    const locations = jobPreferences.preferred_locations || [];
    
    const primaryJobTitle = jobTitles.find((title: string) => title.trim() !== '') || '';
    const primaryLocation = locations.find((loc: string) => loc.trim() !== '') || '';
    
    onFormChange({
      ...searchForm,
      query: primaryJobTitle,
      location: primaryLocation
    });
  };

  const usePreferenceForField = (field: 'query' | 'location') => {
    if (!jobPreferences) return;

    if (field === 'query') {
      const jobTitles = jobPreferences.preferred_job_titles || [];
      const primaryJobTitle = jobTitles.find((title: string) => title.trim() !== '') || '';
      onFormChange({ ...searchForm, query: primaryJobTitle });
    } else if (field === 'location') {
      const locations = jobPreferences.preferred_locations || [];
      const primaryLocation = locations.find((loc: string) => loc.trim() !== '') || '';
      onFormChange({ ...searchForm, location: primaryLocation });
    }
  };

  const toggleJobSelection = (index: number) => {
    const newSelection = new Set(selectedJobs);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedJobs(newSelection);
  };

  const selectAllJobs = () => {
    const allIndices = new Set(searchResults.map((_, index) => index));
    setSelectedJobs(allIndices);
  };

  const clearSelection = () => {
    setSelectedJobs(new Set());
  };

  const saveSelectedJobs = () => {
    const selectedJobsList = Array.from(selectedJobs).map(index => searchResults[index]);
    if (onSaveMultipleJobs) {
      onSaveMultipleJobs(selectedJobsList);
    } else {
      // Fallback to saving one by one
      selectedJobsList.forEach(job => onSaveJob(job));
    }
    setSelectedJobs(new Set());
  };

  const updateForm = (field: keyof JobSearchForm, value: any) => {
    onFormChange({ ...searchForm, [field]: value });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            AI Job Search
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Job Preferences Quick Fill */}
          {jobPreferences && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-blue-900 dark:text-blue-100">Use Your Job Preferences</h3>
                <button
                  onClick={applyPreferencesToSearch}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                >
                  Auto-fill
                </button>
              </div>
              <div className="mt-2 space-y-2 text-sm">
                {jobPreferences.preferred_job_titles && jobPreferences.preferred_job_titles.filter((title: string) => title.trim()).length > 0 && (
                  <div>
                    <span className="font-medium text-blue-700 dark:text-blue-300">Job Titles:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {jobPreferences.preferred_job_titles.filter((title: string) => title.trim()).slice(0, 3).map((title: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs">
                          {title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {jobPreferences.preferred_locations && jobPreferences.preferred_locations.filter((loc: string) => loc.trim()).length > 0 && (
                  <div>
                    <span className="font-medium text-blue-700 dark:text-blue-300">Preferred Locations:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {jobPreferences.preferred_locations.filter((loc: string) => loc.trim()).slice(0, 3).map((location: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs">
                          {location}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collapsible Search Form */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-6">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer bg-gray-50 dark:bg-gray-800 rounded-t-lg"
              onClick={() => setIsFormCollapsed(!isFormCollapsed)}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Search Parameters
              </h3>
              <div className="flex items-center gap-2">
                {searchResults.length > 0 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {searchResults.length} jobs found
                  </span>
                )}
                {isFormCollapsed ? 
                  <ChevronDown size={20} className="text-gray-500" /> : 
                  <ChevronUp size={20} className="text-gray-500" />
                }
              </div>
            </div>
            
            {!isFormCollapsed && (
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <div className="flex items-center gap-2">
                        <Target size={16} />
                        Job Title / Keywords *
                      </div>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchForm.query}
                        onChange={(e) => updateForm('query', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="e.g. Software Engineer, React Developer"
                        required
                      />
                      {jobPreferences && (
                        <button
                          type="button"
                          onClick={() => usePreferenceForField('query')}
                          className="px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800"
                          title="Use from preferences"
                        >
                          <Settings size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} />
                        Location
                      </div>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchForm.location}
                        onChange={(e) => updateForm('location', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="e.g. New York, NY or Remote"
                      />
                      {jobPreferences && (
                        <button
                          type="button"
                          onClick={() => usePreferenceForField('location')}
                          className="px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800"
                          title="Use from preferences"
                        >
                          <Settings size={16} />
                        </button>
                      )}
                    </div>
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
                      <option value="">Any time</option>
                      <option value="today">Today</option>
                      <option value="3days">Past 3 days</option>
                      <option value="week">Past week</option>
                      <option value="month">Past month</option>
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
                
                <div className="flex gap-4">
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
              </div>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Search Results ({searchResults.length} jobs found)
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllJobs}
                    className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearSelection}
                    className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Clear Selection
                  </button>
                  {selectedJobs.size > 0 && (
                    <button
                      onClick={saveSelectedJobs}
                      className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Save Selected ({selectedJobs.size})
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-4">
                {searchResults.map((job, index) => (
                  <div 
                    key={index} 
                    className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-all ${
                      selectedJobs.has(index) ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedJobs.has(index)}
                        onChange={() => toggleJobSelection(index)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                              {job.job_title || 'Job Title Not Available'}
                            </h4>
                            <p className="text-gray-600 dark:text-gray-400">
                              {job.employer_name || 'Company Not Specified'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {job.job_city && job.job_state 
                                ? `${job.job_city}, ${job.job_state}` 
                                : job.job_country || 'Location not specified'
                              }
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
                      </div>
                    </div>
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
