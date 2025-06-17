import React, { useState } from 'react';
import { X, Bot, Search, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { ApplicationStatus } from '../../types/jobApplication';
import { JobSearchService, JobSearchResponse } from '../../services/jobSearchService';
import ProfileForm, { ProfileData } from '../forms/ProfileForm';

interface AutomatedApplicationModalProps {
  onSave: (applications: any[]) => void;
  onClose: () => void;
}

const AutomatedApplicationModal: React.FC<AutomatedApplicationModalProps> = ({ onSave, onClose }) => {
  const [currentStep, setCurrentStep] = useState<'profile' | 'jobs' | 'selecting'>('profile');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // New states for TypeScript-based job search
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [jobSearchResults, setJobSearchResults] = useState<JobSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());

  const handleProfileSubmit = async (data: ProfileData) => {
    setError('');
    setMessage('');
    setProfileData(data);
    setIsSearching(true);
    setCurrentStep('jobs');

    try {
      const searchResults = await JobSearchService.searchJobs({
        jobProfile: data.jobProfile,
        experience: data.experience,
        location: data.location,
        numPages: 1
      });

      setJobSearchResults(searchResults);
      setMessage(searchResults.message);
      setCurrentStep('selecting');
    } catch (err: any) {
      setError(err.message || 'Failed to search for jobs');
      setCurrentStep('profile');
    } finally {
      setIsSearching(false);
    }
  };

  const handleJobSelection = (jobUrl: string) => {
    const newSelectedJobs = new Set(selectedJobs);
    if (newSelectedJobs.has(jobUrl)) {
      newSelectedJobs.delete(jobUrl);
    } else {
      newSelectedJobs.add(jobUrl);
    }
    setSelectedJobs(newSelectedJobs);
  };

  const handleSaveSelectedJobs = () => {
    if (!jobSearchResults || selectedJobs.size === 0) {
      setError('Please select at least one job to save');
      return;
    }

    const selectedJobsList = jobSearchResults.jobs.filter((job: any) => selectedJobs.has(job.job_url));
    
    const applications = selectedJobsList.map((job: any) => ({
      company_name: job.company,
      position: job.title,
      status: ApplicationStatus.SAVED,
      application_date: new Date().toISOString(),
      job_description: job.description,
      job_url: job.job_url,
      apply_url: job.apply_url,
      location: job.location,
      employment_type: job.employment_type,
      posted_at: job.posted_at,
      salary: job.salary,
      notes: `Found via automated search for ${profileData?.jobProfile} in ${profileData?.location}. Experience level: ${profileData?.experience}.`
    }));

    onSave(applications);
  };

  const resetToProfile = () => {
    setCurrentStep('profile');
    setJobSearchResults(null);
    setSelectedJobs(new Set());
    setError('');
    setMessage('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              AI Job Search
            </h2>
            <div className="flex items-center gap-2">
              {currentStep === 'profile' && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-sm">
                  Step 1: Profile
                </span>
              )}
              {currentStep === 'jobs' && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-sm">
                  Step 2: Searching...
                </span>
              )}
              {currentStep === 'selecting' && (
                <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-sm">
                  Step 3: Select Jobs
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Error and Success Messages */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {message && !error && (
            <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-4 rounded-lg mb-6 flex items-center gap-2">
              <CheckCircle size={20} />
              {message}
            </div>
          )}

          {/* Step 1: Profile Form */}
          {currentStep === 'profile' && (
            <ProfileForm
              onSubmit={handleProfileSubmit}
              onCancel={onClose}
              isLoading={isSearching}
            />
          )}

          {/* Step 2: Searching */}
          {currentStep === 'jobs' && (
            <div className="text-center py-12">
              <Bot className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-pulse" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Searching for Jobs...
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Finding the best {profileData?.jobProfile} opportunities in {profileData?.location}
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          )}

          {/* Step 3: Job Selection */}
          {currentStep === 'selecting' && jobSearchResults && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Found {jobSearchResults.jobs.length} Jobs
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Select the jobs you want to save to your applications
                  </p>
                </div>
                <button
                  onClick={resetToProfile}
                  className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  New Search
                </button>
              </div>

              {jobSearchResults.jobs.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No Jobs Found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Try adjusting your search criteria or location
                  </p>
                  <button
                    onClick={resetToProfile}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 max-h-96 overflow-y-auto">
                    {jobSearchResults.jobs.map((job: any, index: number) => (
                      <div
                        key={job.job_url || index}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedJobs.has(job.job_url)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                        onClick={() => handleJobSelection(job.job_url)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {job.title}
                              </h4>
                              {selectedJobs.has(job.job_url) && (
                                <CheckCircle className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 mb-1">
                              {job.company} • {job.location}
                            </p>
                            {job.employment_type && (
                              <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">
                                {job.employment_type}
                                {job.salary && job.salary !== 'N/A' && ` • ${job.salary}`}
                              </p>
                            )}
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {job.description?.substring(0, 150)}...
                            </p>
                          </div>
                          <ExternalLink 
                            className="h-4 w-4 text-gray-400 ml-4 flex-shrink-0 cursor-pointer" 
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(job.job_url, '_blank');
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedJobs.size} of {jobSearchResults.jobs.length} jobs selected
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveSelectedJobs}
                        disabled={selectedJobs.size === 0}
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save {selectedJobs.size} Job{selectedJobs.size !== 1 ? 's' : ''}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutomatedApplicationModal;
