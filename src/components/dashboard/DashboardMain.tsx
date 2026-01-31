import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setShowModal,
  setShowJobPreferencesModal,
  setShowJobSearchModal,
  setShowProfileModal,
  setEditingApplication,
  setShowAIEnhancementModal,
  setShowJobDescriptionModal,
  setSearchForm,
  setSearchResults,
  setSearchLoading,
  setSearchError,
  setSelectedJobDescription
} from '../../store/dashboardSlice';
import { useRouter } from 'next/navigation';
import DashboardHeader from './DashboardHeader';
import LeftSidebar from './LeftSidebar';
import ApplicationsTable from './ApplicationsTable';
import JobDescriptionModal from './JobDescriptionModal';
import ApplicationModal from './ApplicationModal';
import JobPreferencesModal from './JobPreferencesModal';
import JobSearchModal from './JobSearchModal';
import ProfileModal from './ProfileModal';
import AIEnhancementModal from './AIEnhancementModal';
import SavedResumePage from './SavedResumePage';
import { JobApplication, ApplicationStats, FirebaseJobApplicationService } from '../../services/firebaseJobApplicationService';
import { JobSearchService } from '../../services/jobSearchService';
import { useAuth } from '../../hooks/useAuth';
import { useToastContext } from '../ui/ToastProvider';

// Local type definitions to match service expectations
type CreateJobApplicationData = Omit<JobApplication, 'id' | 'created_at' | 'user_id' | 'last_updated' | 'updated_at'>;

const ApplicationStatus = {
  NOT_APPLIED: 'not_applied',
  APPLIED: 'applied',
  INTERVIEWING: 'interviewing',
  OFFERED: 'offered',
  REJECTED: 'rejected',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
} as const;

type ApplicationStatusValue = typeof ApplicationStatus[keyof typeof ApplicationStatus];

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  // Redux-persisted dashboard UI state
  const showModal = useAppSelector((state) => state.dashboard.showModal);
  const showJobPreferencesModal = useAppSelector((state) => state.dashboard.showJobPreferencesModal);
  const showJobSearchModal = useAppSelector((state) => state.dashboard.showJobSearchModal);
  const showProfileModal = useAppSelector((state) => state.dashboard.showProfileModal);
  const editingApplication = useAppSelector((state) => state.dashboard.editingApplication);
  const showAIEnhancementModal = useAppSelector((state) => state.dashboard.showAIEnhancementModal);
  const showJobDescriptionModal = useAppSelector((state) => state.dashboard.showJobDescriptionModal);
  const searchForm = useAppSelector((state) => state.dashboard.searchForm);
  const searchResults = useAppSelector((state) => state.dashboard.searchResults);
  const searchLoading = useAppSelector((state) => state.dashboard.searchLoading);
  const searchError = useAppSelector((state) => state.dashboard.searchError);
  const selectedJobDescription = useAppSelector((state) => state.dashboard.selectedJobDescription);
  // Local state for non-UI data
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [combinedListings, setCombinedListings] = useState<JobApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSavedResumePage, setShowSavedResumePage] = useState(false);
  const [stats, setStats] = useState<ApplicationStats>({
    total: 0,
    interviews: 0,
    offers: 0,
    pending: 0,
    applied: 0,
    rejected: 0,
  });

  const {
    user,
    userProfile,
    loading: authLoading,
    isAuthenticated,
    needsEmailVerification,
  } = useAuth();

  const { showSuccess, showError } = useToastContext();
  const router = useRouter();

  const loadApplications = async () => {
    if (!user) {
      console.log('[loadApplications] Aborted: No user.');
      return;
    }
    console.log('[loadApplications] Starting to fetch applications and stats...');
    try {
      const [applicationsData, statsData] = await Promise.all([
        FirebaseJobApplicationService.getUserApplications(user.id),
        FirebaseJobApplicationService.getApplicationStats(user.id)
      ]);
      
      console.log('[loadApplications] Successfully fetched data.');
      setApplications(applicationsData);
      setStats(statsData);
    } catch (err: any) {
      console.error('[loadApplications] Error:', err);
      setError(err.message || 'Failed to load applications');
    }
  };

  const loadSelectedJobsFromWorkflow = () => {
    try {
      const selectedJobsData = localStorage.getItem('selectedJobs');
      if (selectedJobsData) {
        const selectedJobs = JSON.parse(selectedJobsData);
        const jobApplications: JobApplication[] = selectedJobs.map((job: any, index: number) => ({
          id: `workflow-${Date.now()}-${index}`,
          user_id: user?.id || '',
          company_name: job.employer_name || 'Unknown Company',
          position: job.job_title || 'Unknown Position',
          status: 'not_applied' as const,
          application_date: new Date().toISOString().split('T')[0],
          job_posting_url: job.job_apply_link || '',
          job_description: job.job_description || '',
          notes: '',
          resume_url: null,
          cover_letter_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          location: null,
          salary_range: null,
          employment_type: null,
          remote_option: false,
          contact_person: null,
          contact_email: null,
          interview_date: null,
          response_date: null,
          follow_up_date: null,
          priority: 1,
          source: 'workflow',
        }));
        setCombinedListings(prev => [...prev, ...jobApplications]);
        localStorage.removeItem('selectedJobs');
      }
    } catch (error) {
      console.error('Error loading selected jobs from workflow:', error);
    }
  };

  useEffect(() => {
    console.log('[Dashboard Effect] Running effect...');
    console.log(
      `[Dashboard Effect] Auth Loading: ${authLoading}, User Present: ${!!user}, NeedsEmailVerification: ${needsEmailVerification}`
    );

    if (authLoading) {
      console.log('[Dashboard Effect] Waiting for authentication to complete...');
      setLoading(true);
      return;
    }

    if (!user) {
      console.log('[Dashboard Effect] No user found, redirecting to login.');
      router.push('/login');
      return;
    }

    // Block unverified users and send them to /verify-email
    if (needsEmailVerification) {
      console.log('[Dashboard Effect] User email not verified, redirecting to /verify-email.');
      router.push('/verify-email');
      return;
    }

    console.log('[Dashboard Effect] User is authenticated and email is verified. Starting data load...');
    setLoading(true);
    Promise.all([
      loadApplications(),
      loadSelectedJobsFromWorkflow(),
    ]).then(() => {
      console.log('[Dashboard Effect] All data loading promises resolved.');
    }).catch((err) => {
      console.error('[Dashboard Effect] Error during data loading:', err);
    }).finally(() => {
      console.log('[Dashboard Effect] Finalizing data load, setting loading to false.');
      setLoading(false);
    });

  }, [user, authLoading, needsEmailVerification, router]);

  const handleAddApplication = () => {
    // If we're on SavedResumePage, navigate back to dashboard first
    if (showSavedResumePage) {
      setShowSavedResumePage(false);
      // Use setTimeout to ensure navigation completes before opening modal
      setTimeout(() => {
        dispatch(setEditingApplication(null));
        dispatch(setShowModal(true));
      }, 100);
    } else {
      dispatch(setEditingApplication(null));
      dispatch(setShowModal(true));
    }
  };

  const handleJobPreferences = () => {
    dispatch(setShowJobPreferencesModal(true));
  };

  const handleUpdateProfile = () => {
    dispatch(setShowProfileModal(true));
  };

  const handleJobSearchFormChange = (form: any) => {
    dispatch(setSearchForm(form));
  };

  const handleJobSearchSubmit = async () => {
    if (!user || !searchForm.query) return;

    dispatch(setSearchLoading(true));
    dispatch(setSearchError(''));

    try {
      const jobSearchParams = {
        jobProfile: searchForm.query,
        experience: (searchForm.experience === 'Fresher' ? 'Fresher' : 'Experienced') as 'Fresher' | 'Experienced',
        location: searchForm.location || 'Remote',
        numPages: 1
      };

      const results = await JobSearchService.searchJobs(jobSearchParams);
      dispatch(setSearchResults(results.jobs || []));

      if (results.jobs && results.jobs.length > 0) {
        console.log(`Found ${results.jobs.length} job opportunities!`);
      } else {
        dispatch(setSearchError('No jobs found. Try different search criteria.'));
      }
    } catch (err: any) {
      dispatch(setSearchError(err.message || 'Failed to search for jobs'));
      console.error('Error searching for jobs:', err);
    } finally {
      dispatch(setSearchLoading(false));
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
        application_date: new Date().toISOString(),
        job_posting_url: job.job_apply_link || '',
        job_description: job.job_description || '',
        notes: `Added from job search: ${job.job_country || 'Unknown location'}`,
        location: job.job_city || job.job_country || '',
        employment_type: job.job_employment_type || '',
        source: 'job_search',
        remote_option: job.job_is_remote || false,
        priority: 1,
        salary_range: null,
        resume_url: null,
        cover_letter_url: null,
        contact_person: null,
        contact_email: null,
        interview_date: null,
        response_date: null,
        follow_up_date: null,
      };

      await FirebaseJobApplicationService.addApplication(user.id, applicationData);
      
      // Show success message
      showSuccess(
        'Job Saved!', 
        `"${job.job_title}" at "${job.employer_name}" has been saved to your applications!`
      );
      
      await loadApplications();

    } catch (err: any) {
      showError('Error Saving Job', err.message || 'An unexpected error occurred.');
      console.error('Error saving job from search:', err);
    }
  };

  const handleSaveMultipleJobsFromSearch = async (jobs: any[]) => {
    if (!user) {
      showError('Authentication Error', 'You must be logged in to save jobs.');
      return;
    }

    showSuccess('Saving Jobs...', `Attempting to save ${jobs.length} jobs. Please wait.`);

    const savedJobs = await Promise.all(
      jobs.map(async (job) => {
        try {
          const applicationData: CreateJobApplicationData = {
            company_name: job.employer_name || 'Unknown Company',
            position: job.job_title || 'Unknown Position',
            status: 'not_applied',
            application_date: new Date().toISOString(),
            job_posting_url: job.job_apply_link || '',
            job_description: job.job_description || '',
            notes: `Added from job search: ${job.job_country || 'Unknown location'}`,
            location: job.job_city || job.job_country || '',
            employment_type: job.job_employment_type || '',
            source: 'job_search',
            remote_option: job.job_is_remote || false,
            priority: 1,
            salary_range: null,
            resume_url: null,
            cover_letter_url: null,
            contact_person: null,
            contact_email: null,
            interview_date: null,
            response_date: null,
            follow_up_date: null,
          };
          return await FirebaseJobApplicationService.addApplication(user.id, applicationData);
        } catch (err) {
          console.error(`Failed to save job: ${job.job_title}`, err);
          return null; // Return null for failed saves
        }
      })
    );

    const successfulSaves = savedJobs.filter(result => result !== null);

    if (successfulSaves.length > 0) {
      showSuccess('Jobs Saved!', `${successfulSaves.length} of ${jobs.length} jobs were successfully saved.`);
      await loadApplications(); // Refresh the applications list
    } else {
      showError('Save Failed', 'Could not save any of the selected jobs.');
    }
  };

  const handleClearJobSearch = () => {
    dispatch(setSearchForm({
      query: '',
      location: '',
      experience: '',
      employment_type: '',
      date_posted: '',
      remote_jobs_only: false
    }));
    dispatch(setSearchResults([]));
    dispatch(setSearchError(''));
  };

  const handleEditApplication = (application: JobApplication) => {
    dispatch(setEditingApplication(application));
    dispatch(setShowModal(true));
  };

  const handleSaveApplication = async (applicationData: any) => {
    if (!user) return;

    try {
      setError('');

      if (editingApplication) {
        await FirebaseJobApplicationService.updateApplication(user.id, editingApplication.id, applicationData);
        showSuccess('Application Updated', 'The application has been successfully updated.');
      } else {
        await FirebaseJobApplicationService.addApplication(user.id, applicationData);
        showSuccess('Application Added', 'The new application has been successfully added.');
      }
      await loadApplications();
      dispatch(setShowModal(false));
    } catch (err: any) {
      setError(err.message || 'Failed to save application');
      showError('Save Failed', err.message || 'Could not save the application.');
    }
  };

  const handleDeleteApplication = async (applicationId: string) => {
    if (!user) return;

    try {
      setError('');
      await FirebaseJobApplicationService.deleteApplication(user.id, applicationId);
      await loadApplications();
      showSuccess('Application Deleted', 'The application has been successfully removed.');
    } catch (err: any) {
      setError(err.message || 'Failed to delete application');
      showError('Delete Failed', err.message || 'Could not delete the application.');
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: string, newStatus: string) => {
    if (!user) return;
    try {
      setError('');
      const applicationToUpdate = applications.find(app => app.id === applicationId);
      
      if (applicationToUpdate) {
        await FirebaseJobApplicationService.updateApplication(user.id, applicationId, { status: newStatus as any });
        showSuccess('Application Status Updated', `Status changed to ${newStatus}.`);
        await loadApplications();
        return;
      }
      
      // Handle regular application status updates
      await FirebaseJobApplicationService.updateApplication(user.id, applicationId, { status: newStatus as any });
      await loadApplications();
    } catch (err: any) {
      setError(err.message || 'Failed to update application status');
      showError('Update Failed', err.message || 'Could not update application status.');
    }
  };

  const handleFindMoreJobs = () => {
    // If we're on SavedResumePage, navigate back to dashboard first
    if (showSavedResumePage) {
      setShowSavedResumePage(false);
      // Use setTimeout to ensure navigation completes before opening modal
      setTimeout(() => {
        dispatch(setShowJobSearchModal(true));
      }, 100);
    } else {
      dispatch(setShowJobSearchModal(true));
    }
  };

  const handleUpgrade = () => {
    // Open upgrade URL in same tab for better user experience
    const paymentUrl = `https://pay.rev.cat/sandbox/evfhfhevsehbykku/${user?.id}`;
    window.location.href = paymentUrl;
  };

  const handleDashboard = () => {
    setShowSavedResumePage(false);
  };

  const handleSavedResume = () => {
    setShowSavedResumePage(true);
  };

  const handleBackFromSavedResume = () => {
    setShowSavedResumePage(false);
  };

  const handleViewJobDescription = (job: { title: string; company: string; description: string }) => {
    dispatch(setSelectedJobDescription(job));
    dispatch(setShowJobDescriptionModal(true));
  };

  const handleLoadAIEnhanced = (application: JobApplication) => {
    console.log('[handleLoadAIEnhanced] application:', application);
    dispatch(setSelectedJobDescription({
      title: application.position,
      company: application.company_name,
      description: application.job_description || ''
    }));
    dispatch(setEditingApplication(application));
    
    dispatch(setShowAIEnhancementModal(true));
  };

  // While auth state is loading, show a full-page loader
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-400">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // Show Saved Resume Page if active
  if (showSavedResumePage) {
    return (
      <SavedResumePage
        onBack={handleBackFromSavedResume}
        onAddApplication={handleAddApplication}
        onJobPreferences={handleJobPreferences}
        onUpdateProfile={handleUpdateProfile}
        onFindMoreJobs={handleFindMoreJobs}
        onUpgrade={handleUpgrade}
        userProfile={userProfile}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Fixed Header at Top */}
      <DashboardHeader
        userProfile={userProfile}
        onAddApplication={handleAddApplication}
        onJobPreferences={handleJobPreferences}
        onUpdateProfile={handleUpdateProfile}
      />

      {/* Sidebar - Hidden on mobile, fixed on desktop */}
      <LeftSidebar
        onDashboard={handleDashboard}
        onFindMoreJobs={handleFindMoreJobs}
        onAddApplication={handleAddApplication}
        onSavedResume={handleSavedResume}
        onUpgrade={handleUpgrade}
      />

      {/* Main Content Area - Accounts for header and sidebar */}
      <main className="flex-1 flex flex-col overflow-hidden md:ml-64 pt-14 sm:pt-16">
          
          {/* Loading State */}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                <p className="text-lg font-medium text-gray-600 dark:text-gray-400">Loading Dashboard...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="m-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-700">
              <p className="font-medium">⚠️ {error}</p>
            </div>
          )}

          {/* Main Dashboard Content - Compact, No Scroll */}
          {!loading && !error && (
            <div className="flex-1 flex flex-col overflow-hidden p-2 sm:p-3 md:p-4 gap-2 sm:gap-3">
              
              {/* Welcome Banner - Compact for Mobile */}
              {combinedListings.some(job => job.id.startsWith('workflow-')) && (
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-2 sm:p-3 flex-shrink-0 shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-lg sm:text-xl">✓</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-bold truncate">Welcome to Your Dashboard!</h3>
                      <p className="text-xs sm:text-sm text-white/90 hidden sm:block">
                        {combinedListings.filter(job => job.id.startsWith('workflow-')).length} jobs loaded and ready to apply
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats Cards - Compact Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 flex-shrink-0">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Total</div>
                  <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Applied</div>
                  <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.applied}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Pending</div>
                  <div className="text-lg sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Interview</div>
                  <div className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.interviews}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Offers</div>
                  <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">{stats.offers}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Rejected</div>
                  <div className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</div>
                </div>
              </div>

              {/* Applications Table - Takes Remaining Space */}
              <div className="flex-1 overflow-hidden min-h-0">
                <ApplicationsTable
                  applications={[...applications, ...combinedListings].map(app => ({ ...app, updated_at: app.updated_at ?? '' }))}
                  searchTerm={searchTerm}
                  statusFilter={statusFilter}
                  onSearchTermChange={setSearchTerm}
                  onStatusFilterChange={setStatusFilter}
                  onEditApplication={handleEditApplication}
                  onViewJobDescription={handleViewJobDescription}
                  onDeleteApplication={handleDeleteApplication}
                  onUpdateApplicationStatus={handleUpdateApplicationStatus}
                  onLoadAIEnhanced={handleLoadAIEnhanced}
                />
              </div>
            </div>
          )}
      </main>

      {/* Modals */}
      <JobDescriptionModal
        isOpen={showJobDescriptionModal}
        jobDescription={selectedJobDescription}
        onClose={() => dispatch(setShowJobDescriptionModal(false))}
      />

      {showModal && (
        <ApplicationModal
          application={editingApplication}
          onSave={handleSaveApplication}
          onClose={() => dispatch(setShowModal(false))}
        />
      )}
      {showJobPreferencesModal && (
        <JobPreferencesModal
          onClose={() => dispatch(setShowJobPreferencesModal(false))}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          onClose={() => dispatch(setShowProfileModal(false))}
        />
      )}
      {showAIEnhancementModal && (
        <AIEnhancementModal
          jobDescription={selectedJobDescription?.description || editingApplication?.job_description || ''}
          applicationData={{
            id: editingApplication?.id || '',
            position: editingApplication?.position || selectedJobDescription?.title || '',
            company_name: editingApplication?.company_name || selectedJobDescription?.company || '',
            location: editingApplication?.location || undefined
          }}
          onSave={(resumeUrl: string, coverLetterUrl: string) => {
            if (editingApplication) {
              handleSaveApplication({ ...editingApplication, resume_url: resumeUrl, cover_letter_url: coverLetterUrl });
            }
          }}
          onClose={() => dispatch(setShowAIEnhancementModal(false))}
        />
      )}
      {showJobSearchModal && (
        <JobSearchModal
          isOpen={showJobSearchModal}
          searchForm={searchForm}
          searchResults={searchResults}
          searchLoading={searchLoading}
          searchError={searchError}
          onClose={() => dispatch(setShowJobSearchModal(false))}
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
