import React from 'react';
import { format } from 'date-fns';
import { JobApplication } from '../../types/supabase';

interface SavedJobsSectionProps {
  applications: JobApplication[];
  onViewJobDescription: (job: { title: string; company: string; description: string }) => void;
  onUpdateApplicationStatus?: (id: string, status: string) => void;
}

const SavedJobsSection: React.FC<SavedJobsSectionProps> = ({
  applications,
  onViewJobDescription,
  onUpdateApplicationStatus,
}) => {
  const savedJobs = applications.filter(app => app.status === 'not_applied');

  const handleApplyToJob = async (job: JobApplication) => {
    try {
      if (job.job_posting_url) {
        // Update status to 'applied'
        if (onUpdateApplicationStatus) {
          onUpdateApplicationStatus(job.id, 'APPLIED');
        }
        window.open(job.job_posting_url, '_blank');
      } else {
        console.log('No application URL available');
      }
    } catch (error) {
      console.error('Error during job application:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Saved Job Opportunities ({savedJobs.length})
        </h2>
      </div>

      <div className="p-6">
        {savedJobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No saved jobs yet. Use the job search feature to find and save interesting opportunities!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedJobs.map((job) => (
              <div key={job.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                    {job.position}
                  </h3>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 mb-2">{job.company_name}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <div>
                    <span className="font-medium">Status:</span> Saved
                  </div>
                  <div>
                    <span className="font-medium">Added:</span> {format(new Date(job.application_date), 'MMM d, yyyy')}
                  </div>
                </div>
                
                {job.job_description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-3">
                    {job.job_description.substring(0, 150)}...
                  </p>
                )}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                  {job.job_posting_url && (
                    <button
                      onClick={() => handleApplyToJob(job)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors font-medium"
                    >
                      Apply Now
                    </button>
                  )}
                  
                  {job.job_description && (
                    <button
                      onClick={() => onViewJobDescription({
                        title: job.position,
                        company: job.company_name,
                        description: job.job_description || ''
                      })}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm transition-colors"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedJobsSection;
