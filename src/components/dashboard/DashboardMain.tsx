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
// The pages router exposes the query string; next/navigation's does not.
import { useRouter as usePagesRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Loader2, Menu } from 'lucide-react';
import Sidebar, { type DashboardView } from './Sidebar';
import ProfileMenu from './ProfileMenu';
import OverviewView from './views/OverviewView';
import ResumeStudioView from './views/ResumeStudioView';
import AnalyticsView from './views/AnalyticsView';
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
import { flowLog } from '../../lib/flowLog';
import { clearPending, isOrphaned, readPending, PENDING_TTL_MS } from '../../lib/generation/pending';
import { findByGenerationId } from '../../services/resumeService';
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
  const [menuOpen, setMenuOpen] = useState(false);
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

  const { showSuccess, showError, showInfo } = useToastContext();
  const router = useRouter();
  const pagesRouter = usePagesRouter();

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

    // `router` is deliberately not a dependency: it changes identity on every
    // navigation, so every view switch reloaded the applications and flashed the
    // loader. The effect only needs to re-run when the user or their auth state does.
  }, [user, authLoading, needsEmailVerification]); // eslint-disable-line react-hooks/exhaustive-deps

  // Development only. Next compiles an API route the first time it is called,
  // and that first compile makes the dev client do a full page reload, which
  // used to land in the middle of the user's first generation. Touching the
  // routes as soon as the dashboard loads moves that one-time reload to page
  // load, where it costs nothing.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    void fetch('/api/documents/generate').catch(() => undefined);
    void fetch('/api/documents/compile').catch(() => undefined);
  }, []);

  // A generation that was running when the page reloaded still finishes on the
  // server (the résumé is saved and the quota is spent). Wait for it and open
  // it, instead of leaving the user on an empty form to start again.
  useEffect(() => {
    if (!user?.id || authLoading) return;
    const pending = readPending();
    if (!pending || !isOrphaned(pending)) return;

    flowLog(pending.requestId, 'recover:start', { ageMs: Date.now() - pending.startedAt });
    // The modal's open state is persisted, so after a reload it reopens as an
    // empty form. Close it: the résumé it was creating is being recovered.
    dispatch(setShowAIEnhancementModal(false));
    showInfo('Finishing your resume…', `We are still preparing your resume for ${pending.jobTitle}.`);
    let stopped = false;

    const poll = async () => {
      while (!stopped && Date.now() - pending.startedAt < PENDING_TTL_MS) {
        try {
          const found = await findByGenerationId(user.id, pending.requestId);
          if (found) {
            flowLog(pending.requestId, 'recover:found', { resumeId: found.id });
            clearPending();
            dispatch(setShowAIEnhancementModal(false));
            void pagesRouter.push(`/dashboard?view=resumes&resume=${found.id}&new=1`, undefined, { shallow: true });
            return;
          }
        } catch (error) {
          flowLog(pending.requestId, 'recover:poll-error', { message: error instanceof Error ? error.message : String(error) });
        }
        await new Promise((resolve) => setTimeout(resolve, 3_000));
      }
      if (!stopped) {
        flowLog(pending.requestId, 'recover:gave-up');
        clearPending();
        showError('That resume did not finish', 'Nothing was kept from that attempt. Please try generating it again.');
      }
    };
    void poll();
    return () => {
      stopped = true;
    };
    // Runs once per signed-in session; the record is cleared when it resolves.
  }, [user?.id, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddApplication = () => {
    dispatch(setEditingApplication(null));
    dispatch(setShowModal(true));
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
    dispatch(setShowJobSearchModal(true));
  };

  const handleViewJobDescription = (job: { title: string; company: string; description: string }) => {
    dispatch(setSelectedJobDescription(job));
    dispatch(setShowJobDescriptionModal(true));
  };

  // The daily limit is enforced inside /api/documents/generate, atomically and
  // against the verified user. The old client-side pre-check called a separate
  // endpoint that only *read* the counter, so skipping it cost nothing.
  const handleLoadAIEnhanced = (application: JobApplication) => {
    dispatch(setSelectedJobDescription({
      title: application.position,
      company: application.company_name,
      description: application.job_description || ''
    }));

    dispatch(setEditingApplication(application));
    dispatch(setShowAIEnhancementModal(true));
  };

  // Views live in the URL so a refresh, or a link from elsewhere, lands where
  // the user expects: /dashboard?view=resumes.
  const view = ((): DashboardView => {
    const q = typeof pagesRouter.query.view === 'string' ? pagesRouter.query.view : '';
    return (['overview', 'resumes', 'documents', 'analytics'] as DashboardView[]).includes(q as DashboardView)
      ? (q as DashboardView)
      : 'overview';
  })();

  const setView = (next: DashboardView) => {
    void pagesRouter.push(next === 'overview' ? '/dashboard' : `/dashboard?view=${next}`, undefined, { shallow: true });
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#050505]">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 animate-spin text-indigo-600" size={28} />
          <p className="text-sm text-slate-500">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const TITLES: Record<DashboardView, string> = {
    overview: 'Applications',
    resumes: 'Resume Studio',
    documents: 'Saved documents',
    analytics: 'Analytics',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#050505]">
      <Sidebar
        view={view}
        onView={setView}
        onFindJobs={handleFindMoreJobs}
        onAddApplication={handleAddApplication}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col md:ml-60">
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#0a0a0b]/85">
          <button onClick={() => setMenuOpen(true)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800" aria-label="Open menu">
            <Menu size={18} />
          </button>
          <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">{TITLES[view]}</h1>
          <div className="ml-auto flex items-center gap-1.5">
            <ProfileMenu
              name={userProfile?.full_name ?? user?.email ?? 'Account'}
              onProfile={handleUpdateProfile}
              onPreferences={handleJobPreferences}
            />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">
          {error && view === 'overview' && (
            <div className="mx-4 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* No exit animation: AnimatePresence's mode="wait" would hold the
              whole view subtree until a frame lands, and a throttled frame
              then freezes it. */}
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="h-full"
          >
              {view === 'overview' &&
                (loading ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    <Loader2 className="mr-2 animate-spin" size={16} /> Loading applications…
                  </div>
                ) : (
                  <OverviewView
                    stats={stats}
                    applications={[...applications, ...combinedListings]}
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
                ))}
              {view === 'resumes' && user && (
                <ResumeStudioView
                  uid={user.id}
                  openId={typeof pagesRouter.query.resume === 'string' ? pagesRouter.query.resume : null}
                  fresh={pagesRouter.query.new === '1'}
                />
              )}
              {view === 'documents' && <SavedResumePage />}
              {view === 'analytics' && user && <AnalyticsView uid={user.id} />}
          </motion.div>
        </main>
      </div>

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
      {showJobPreferencesModal && <JobPreferencesModal onClose={() => dispatch(setShowJobPreferencesModal(false))} />}
      {showProfileModal && <ProfileModal onClose={() => dispatch(setShowProfileModal(false))} />}
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
          onOpenInStudio={(resumeId) => {
            dispatch(setShowAIEnhancementModal(false));
            void pagesRouter.push(`/dashboard?view=resumes&resume=${resumeId}&new=1`, undefined, { shallow: true });
          }}
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
