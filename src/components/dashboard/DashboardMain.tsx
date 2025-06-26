import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import StatsCards from './StatsCards';
import ApplicationsCarousel from './ApplicationsCarousel';
import JobDescriptionModal from './JobDescriptionModal';
import ApplicationModal from './ApplicationModal';
import JobPreferencesModal from './JobPreferencesModal';
import JobSearchModal from './JobSearchModal';
import ProfileModal from './ProfileModal';
import { JobApplication } from '../../types/jobApplication';
import SupabaseJobApplicationService, { CreateJobApplicationData } from '../../services/supabaseJobApplicationService';
import { JobSearchService } from '../../services/jobSearchService';
import { useAuth } from '../../hooks/useAuth';
import { useToastContext } from '../ui/ToastProvider';

const Dashboard: React.FC = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [combinedListings, setCombinedListings] = useState<JobApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');  const [statusFilter, setStatusFilter] = useState<string>('all');  const [showModal, setShowModal] = useState(false);
  const [showJobPreferencesModal, setShowJobPreferencesModal] = useState(false);
  const [showJobSearchModal, setShowJobSearchModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchForm, setSearchForm] = useState({
    query: '',
    location: '',
    experience: '',
    employment_type: '',
    remote_jobs_only: false,
    date_posted: '',
  });  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [editingApplication, setEditingApplication] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedJobDescription, setSelectedJobDescription] = useState<{title: string, company: string, description: string} | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    interviews: 0,
    offers: 0,
    pending: 0
  });

  const { user, userProfile, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToastContext();
  const navigate = useNavigate();  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      loadApplications();
      loadSelectedJobsFromWorkflow();
    }
  }, [user, authLoading, navigate]);

  const loadSelectedJobsFromWorkflow = () => {
    try {
      const selectedJobsData = localStorage.getItem('selectedJobs');
      if (selectedJobsData) {
        const selectedJobs = JSON.parse(selectedJobsData);
          // Convert JobResult[] to JobApplication[] format for display
        const jobApplications: JobApplication[] = selectedJobs.map((job: any, index: number) => ({
          id: `workflow-${Date.now()}-${index}`,
          user_id: user?.uid || '',
          company_name: job.employer_name || 'Unknown Company',
          position: job.job_title || 'Unknown Position',
          status: 'not_applied' as const,
          application_date: new Date().toISOString().split('T')[0],
          job_posting_url: job.job_apply_link || '',
          job_description: job.job_description || '',
          notes: '',
          resume_url: '',
          cover_letter_url: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        setCombinedListings(prev => [...prev, ...jobApplications]);
        
        // Clear the localStorage after loading to prevent duplicates
        localStorage.removeItem('selectedJobs');
      }
    } catch (error) {
      console.error('Error loading selected jobs from workflow:', error);
    }
  };
  // Update stats based on applications only (job listings added when user searches)
  useEffect(() => {
    const combined = [...applications, ...combinedListings];
    const totalJobs = combined.length;
    const appliedJobs = combined.filter(app => app.status === 'applied').length;
    const interviewJobs = combined.filter(app => app.status === 'interview').length;
    const offerJobs = combined.filter(app => app.status === 'offer').length;
    
    setStats({
      total: totalJobs,
      interviews: interviewJobs,
      offers: offerJobs,
      pending: appliedJobs
    });
  }, [applications, combinedListings]);
  const loadApplications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const [applicationsData, statsData] = await Promise.all([
        SupabaseJobApplicationService.getUserApplications(user.uid),
        SupabaseJobApplicationService.getApplicationStats(user.uid)
      ]);
      
      setApplications(applicationsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');      console.error('Error loading applications:', err);
    } finally {
      setLoading(false);
    }
  };  const handleAddApplication = () => {
    setEditingApplication(null);
    setShowModal(true);
  };const handleJobPreferences = () => {
    setShowJobPreferencesModal(true);
  };
  const handleUpdateProfile = () => {
    setShowProfileModal(true);
  };

  const handleJobSearchFormChange = (form: any) => {
    setSearchForm(form);
  };
  const handleJobSearchSubmit = async () => {
    if (!user || !searchForm.query) return;

    setSearchLoading(true);
    setSearchError('');

    try {      const jobSearchParams = {
        jobProfile: searchForm.query,
        experience: (searchForm.experience === 'Fresher' ? 'Fresher' : 'Experienced') as 'Fresher' | 'Experienced',
        location: searchForm.location || 'Remote',
        numPages: 1
      };
      
      const results = await JobSearchService.searchJobs(jobSearchParams);
      setSearchResults(results.jobs || []);
      
      if (results.jobs && results.jobs.length > 0) {
        console.log(`Found ${results.jobs.length} job opportunities!`);
      } else {
        setSearchError('No jobs found. Try different search criteria.');
      }
    } catch (err: any) {
      setSearchError(err.message || 'Failed to search for jobs');
      console.error('Error searching for jobs:', err);
    } finally {
      setSearchLoading(false);
    }
  };
  const handleSaveJobFromSearch = async (job: any) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    try {
      const applicationData: CreateJobApplicationData = {
        company_name: job.employer_name || 'Unknown Company',
        position: job.job_title || 'Unknown Position',
        status: 'not_applied',
        job_posting_url: job.job_apply_link || '',
        job_description: job.job_description || '',
        notes: `Added from job search: ${job.job_country || 'Unknown location'}`,
        location: job.job_city || job.job_country || '',
        employment_type: job.job_employment_type || '',
        source: 'job_search'
      };

      await SupabaseJobApplicationService.addApplication(user.uid, applicationData);
      
      // Show success message
      showSuccess(
        'Job Saved!', 
        `"${job.job_title}" at "${job.employer_name}" has been saved to your applications!`
      );
      
      // Also update the local state for immediate UI feedback
      const now = new Date().toISOString();
      const newApplication = {
        id: `temp-${Date.now()}`,
        user_id: user?.uid || '',
        company_name: job.employer_name || 'Unknown Company',
        position: job.job_title || 'Unknown Position',
        status: 'not_applied' as const,
        application_date: now,
        last_updated: now,
        job_posting_url: job.job_apply_link || '',
        job_description: job.job_description || '',
        notes: `Added from job search: ${job.job_country || 'Unknown location'}`,
        created_at: now,
        updated_at: now
      };

      setCombinedListings(prev => {
        const existingIds = new Set(prev.map(app => app.company_name + app.position));
        if (!existingIds.has(newApplication.company_name + newApplication.position)) {
          return [...prev, newApplication];
        }
        return prev;
      });

    } catch (err: any) {
      console.error('Error saving job from search:', err);
      showError('Failed to Save Job', err.message || 'Failed to save job. Please try again.');
    }
  };

  const handleSaveMultipleJobsFromSearch = async (jobs: any[]) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    try {
      // Save each job individually
      const savedJobs = await Promise.all(
        jobs.map(async (job: any) => {
          const applicationData: CreateJobApplicationData = {
            company_name: job.employer_name || 'Unknown Company',
            position: job.job_title || 'Unknown Position',
            status: 'not_applied',
            job_posting_url: job.job_apply_link || '',
            job_description: job.job_description || '',
            notes: `Added from job search: ${job.job_country || 'Unknown location'}`,
            location: job.job_city || job.job_country || '',
            employment_type: job.job_employment_type || '',
            source: 'job_search'
          };
          return await SupabaseJobApplicationService.addApplication(user.uid, applicationData);
        })
      );
      
      // Also update the local state for immediate UI feedback
      const now = new Date().toISOString();
      const newApplications = jobs.map(job => ({
        id: `temp-${Date.now()}-${Math.random()}`,
        user_id: user?.uid || '',
        company_name: job.employer_name || 'Unknown Company',
        position: job.job_title || 'Unknown Position',
        status: 'not_applied' as const,
        application_date: now,
        last_updated: now,
        job_posting_url: job.job_apply_link || '',
        job_description: job.job_description || '',
        notes: `Added from job search: ${job.job_country || 'Unknown location'}`,
        created_at: now,
        updated_at: now
      }));

      setCombinedListings(prev => {
        const existingIds = new Set(prev.map(app => app.company_name + app.position));
        const uniqueNewApplications = newApplications.filter(app => 
          !existingIds.has(app.company_name + app.position)
        );
        return [...prev, ...uniqueNewApplications];
      });

      alert(`${jobs.length} jobs saved to your applications!`);
    } catch (err: any) {
      console.error('Error saving multiple jobs from search:', err);
      alert('Failed to save jobs. Please try again.');
    }
  };
  const handleClearJobSearch = () => {
    setSearchForm({
      query: '',
      location: '',
      experience: '',
      employment_type: '',
      remote_jobs_only: false,
      date_posted: '',
    });
    setSearchResults([]);
    setSearchError('');
  };

  const handleEditApplication = (application: JobApplication) => {
    setEditingApplication(application);
    setShowModal(true);
  };

  const handleSaveApplication = async (applicationData: any) => {
    if (!user) return;

    try {
      setError('');
      
      if (editingApplication) {
        await SupabaseJobApplicationService.updateApplication(editingApplication.id, applicationData);
        showSuccess('Application Updated', 'The application has been successfully updated.');
      } else {
        await SupabaseJobApplicationService.addApplication(user.uid, applicationData);
        showSuccess('Application Added', 'The application has been successfully added.');
      }
      
      setShowModal(false);
      await loadApplications();    } catch (err: any) {
      setError(err.message || 'Failed to save application');
      console.error('Error saving application:', err);
      showError('Save Failed', err.message || 'Failed to save application');
    }
  };

  const handleDeleteApplication = async (applicationId: string) => {
    if (!confirm('Are you sure you want to delete this application?')) {
      return;
    }

    try {
      setError('');
      await SupabaseJobApplicationService.deleteApplication(applicationId);
      await loadApplications();
      showSuccess('Application Deleted', 'The application has been successfully removed.');
    } catch (err: any) {
      setError(err.message || 'Failed to delete application');
      console.error('Error deleting application:', err);
      showError('Delete Failed', err.message || 'Failed to delete application');
    }
  };  const handleUpdateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      setError('');
      
      // Check if this is a job listing (starts with 'job-listing-' or 'workflow-')
      if (applicationId.startsWith('job-listing-') || applicationId.startsWith('workflow-')) {
        // Find the job listing in combinedListings
        const jobListing = combinedListings.find(job => job.id === applicationId);
        if (jobListing && user && newStatus === 'APPLIED') {
          // Convert job listing to actual application
          const applicationData = {
            company_name: jobListing.company_name,
            position: jobListing.position,
            status: 'APPLIED',
            application_date: new Date().toISOString(),
            job_description: jobListing.job_description,
            notes: jobListing.notes || '',
            job_posting_url: jobListing.job_posting_url || '',
            resume_url: '',
            cover_letter_url: ''
          };
          
          await SupabaseJobApplicationService.addApplication(user.uid, applicationData);
          
          // Remove from job listings and refresh data
          setCombinedListings(prev => prev.filter(job => job.id !== applicationId));
          await loadApplications();
          return;
        }
      }
      
      // Handle regular application status updates
      await SupabaseJobApplicationService.updateApplication(applicationId, { status: newStatus });
      await loadApplications();
    } catch (err: any) {
      setError(err.message || 'Failed to update application status');
      console.error('Error updating application status:', err);
    }
  };  const handleFindMoreJobs = () => {
    navigate('/job-search');
  };

  const handleViewJobDescription = (job: { title: string; company: string; description: string }) => {
    setSelectedJobDescription(job);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">      <DashboardHeader
        userProfile={userProfile}
        onAddApplication={handleAddApplication}
        onJobPreferences={handleJobPreferences}
        onUpdateProfile={handleUpdateProfile}
        onFindMoreJobs={handleFindMoreJobs}
      /><main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Welcome banner for new workflow users */}
        {combinedListings.some(job => job.id.startsWith('workflow-')) && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">✓</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Welcome to Your Dashboard!</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Great job! We've loaded your selected job opportunities. You can now manage applications, track progress, and discover more opportunities.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                🎯 {combinedListings.filter(job => job.id.startsWith('workflow-')).length} Jobs Added
              </span>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm">
                📊 Dashboard Ready
              </span>
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-full text-sm">
                🚀 Start Applying
              </span>
            </div>
          </div>
        )}

        <StatsCards stats={stats} />

        <div className="space-y-8">          <ApplicationsCarousel
            applications={[...applications, ...combinedListings]}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            onSearchTermChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onEditApplication={handleEditApplication}
            onViewJobDescription={handleViewJobDescription}
            onDeleteApplication={handleDeleteApplication}
            onUpdateApplicationStatus={handleUpdateApplicationStatus}
          />
        </div>
      </main>{/* Modals */}
      <JobDescriptionModal
        isOpen={!!selectedJobDescription}
        jobDescription={selectedJobDescription}
        onClose={() => setSelectedJobDescription(null)}
      />

      {showModal && (
        <ApplicationModal
          application={editingApplication}
          onSave={handleSaveApplication}
          onClose={() => setShowModal(false)}
        />
      )}      {showJobPreferencesModal && (
        <JobPreferencesModal
          onClose={() => setShowJobPreferencesModal(false)}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          onClose={() => setShowProfileModal(false)}
        />
      )}      {showJobSearchModal && (
        <JobSearchModal
          isOpen={showJobSearchModal}
          searchForm={searchForm}
          searchResults={searchResults}
          searchLoading={searchLoading}
          searchError={searchError}
          onClose={() => setShowJobSearchModal(false)}
          onFormChange={handleJobSearchFormChange}
          onSearch={handleJobSearchSubmit}
          onSaveJob={handleSaveJobFromSearch}
          onSaveMultipleJobs={handleSaveMultipleJobsFromSearch}
          onClear={handleClearJobSearch}
        />
      )}
    </div>
  );
};

export default Dashboard;
