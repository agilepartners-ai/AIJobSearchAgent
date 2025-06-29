import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import StatsCards from './StatsCards';
import ApplicationsTable from './ApplicationsTable';
import JobDescriptionModal from './JobDescriptionModal';
import ApplicationModal from './ApplicationModal';
import AIEnhancementModal from './AIEnhancementModal';
import ProfileModal from './ProfileModal';
import JobPreferencesModal from './JobPreferencesModal';
import JobSearchModal from './JobSearchModal';
import ConfirmationModal from '../ui/ConfirmationModal';
import { JobApplication } from '../../types/supabase';
import SupabaseJobApplicationService from '../../services/supabaseJobApplicationService';
import { JobSearchService } from '../../services/jobSearchService';
import { useAuth } from '../../hooks/useAuth';
import { useToastContext } from '../ui/ToastProvider';
import '../../styles/dashboard-responsive.css';


const Dashboard: React.FC = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showJobPreferencesModal, setShowJobPreferencesModal] = useState(false);
  const [showJobSearchModal, setShowJobSearchModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedApplicationForAI, setSelectedApplicationForAI] = useState<JobApplication | null>(null);
  const [searchForm, setSearchForm] = useState({
    query: '',
    location: '',
    experience: '',
    employment_type: '',
    remote_jobs_only: false,
    date_posted: ''
  });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [editingApplication, setEditingApplication] = useState<JobApplication | null>(null);

  // Persist modal open state and editing application to localStorage
  useEffect(() => {
    // On mount, restore modal state if present
    const modalStateRaw = localStorage.getItem('dashboard-application-modal');
    if (modalStateRaw) {
      try {
        const modalState = JSON.parse(modalStateRaw);
        if (modalState.showModal) {
          setShowModal(true);
          setEditingApplication(modalState.editingApplication || null);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Whenever showModal or editingApplication changes, persist to localStorage
  useEffect(() => {
    if (showModal) {
      localStorage.setItem(
        'dashboard-application-modal',
        JSON.stringify({ showModal: true, editingApplication })
      );
    } else {
      localStorage.removeItem('dashboard-application-modal');
    }
  }, [showModal, editingApplication]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedJobDescription, setSelectedJobDescription] = useState<{title: string, company: string, description: string} | null>(null);
  
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [stats, setStats] = useState({
    total: 0,
    interviews: 0,
    offers: 0,
    pending: 0
  });

  const { user, userProfile, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToastContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      loadApplications();
    }
  }, [user, authLoading, navigate]);

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
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddApplication = () => {
    setEditingApplication(null);
    setShowModal(true);
  };

  const handleJobSearch = () => {
    setShowJobSearchModal(true);
  };

  const handleJobPreferences = () => {
    setShowJobPreferencesModal(true);
  };
  
  const handleUpdateProfile = () => {
    setShowProfileModal(true);
  };

  const handleSearchFormChange = (form: any) => {
    setSearchForm(form);
  };
  
  const handleSearch = async () => {
    if (!user) {
      setSearchError('Please log in to search for jobs');
      return;
    }

    setSearchLoading(true);
    setSearchError('');
    
    try {
      // Call the actual job search API
      const searchParams = {
        jobProfile: searchForm.query,
        experience: (searchForm.experience === 'Fresher' ? 'Fresher' : 'Experienced') as 'Fresher' | 'Experienced',
        location: searchForm.location,
        numPages: 1 // Start with 1 page
      };

      const searchResponse = await JobSearchService.searchJobs(searchParams);
      
      if (searchResponse.success && searchResponse.jobs.length > 0) {
        // Set search results for the modal
        setSearchResults(searchResponse.jobs);
        
        // Show success message
        showSuccess(
          'Search Completed!', 
          `Found ${searchResponse.jobs.length} jobs. You can now save individual jobs or save all jobs from the search results.`
        );
      } else {
        setSearchResults([]);
        setSearchError('No jobs found for your search criteria');
      }
    } catch (error: any) {
      setSearchError(error.message || 'Failed to search for jobs');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchForm({
      query: '',
      location: '',
      experience: '',
      employment_type: '',
      remote_jobs_only: false,
      date_posted: ''
    });
    setSearchResults([]);
    setSearchError('');
  };
  
  const handleSaveJobFromSearch = async (job: any) => {
    if (!user) {
      showError('Authentication Required', 'Please log in to save jobs.');
      return;
    }

    try {
      setError('');
      
      // Use the SAME proven method that works for manual job additions
      const applicationData = {
        company_name: job.employer_name || 'Unknown Company',
        position: job.job_title || 'Unknown Position',
        status: 'not_applied' as const,
        application_date: new Date().toISOString(),
        job_posting_url: job.job_apply_link || '',
        job_description: job.job_description || '',
        notes: `Saved from job search:\n` +
               `Location: ${job.job_city && job.job_state ? `${job.job_city}, ${job.job_state}` : job.job_country || 'Not specified'}${job.job_is_remote ? ' (Remote)' : ''}\n` +
               `Employment Type: ${job.job_employment_type || 'Not specified'}`,
      };
      
      const newApplication = await SupabaseJobApplicationService.addApplication(user.uid, applicationData);
      // Update local state instead of reloading all data
      setApplications(prev => [newApplication, ...prev]);
      setStats(prev => ({ 
        ...prev, 
        total: prev.total + 1 
      }));
      
      // Show success feedback
      showSuccess(
        'Job Saved!',
        `"${job.job_title}" at "${job.employer_name}" has been saved to your applications!`
      );
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save job';
      setError(errorMessage);
      showError('Failed to Save Job', errorMessage);
    }
  };
  
  const handleSaveMultipleJobsFromSearch = async (jobs: any[]) => {
    if (!user) {
      showError('Authentication Required', 'Please log in to save jobs.');
      return;
    }

    try {
      setError('');
      
      let savedCount = 0;
      let errorCount = 0;
      let savedApplications: any[] = [];
      
      for (const job of jobs) {
        try {
          // Use the SAME proven method that works for manual job additions
          const applicationData = {
            company_name: job.employer_name || 'Unknown Company',
            position: job.job_title || 'Unknown Position',
            status: 'not_applied' as const,
            application_date: new Date().toISOString(),
            job_posting_url: job.job_apply_link || '',
            job_description: job.job_description || '',
            notes: `Saved from job search:\n` +
                   `Location: ${job.job_city && job.job_state ? `${job.job_city}, ${job.job_state}` : job.job_country || 'Not specified'}${job.job_is_remote ? ' (Remote)' : ''}`,
          };
          
          const newApplication = await SupabaseJobApplicationService.addApplication(user.uid, applicationData);
          savedApplications.push(newApplication);
          savedCount++;
        } catch (error) {
          errorCount++;
        }
      }
      
      // Update local state instead of reloading all data
      if (savedApplications.length > 0) {
        setApplications(prev => [...savedApplications, ...prev]);
        setStats(prev => ({ 
          ...prev, 
          total: prev.total + savedApplications.length 
        }));
      }
      
      // Show detailed success feedback
      showSuccess(
        'Job Saving Completed!',
        `Saved: ${savedCount} jobs${errorCount > 0 ? `, Errors: ${errorCount}` : ''}`
      );
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save jobs';
      setError(errorMessage);
      showError('Failed to Save Jobs', errorMessage);
    }
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
        // Update existing application
        const updatedApplication = await SupabaseJobApplicationService.updateApplication(editingApplication.id, applicationData);
        
        // Update local state instead of reloading all data
        setApplications(prev => prev.map(app => 
          app.id === editingApplication.id ? { ...app, ...updatedApplication } : app
        ));
        
        showSuccess('Application Updated', 'The application has been successfully updated.');
      } else {
        // Add new application
        const newApplication = await SupabaseJobApplicationService.addApplication(user.uid, applicationData);
        
        // Update local state instead of reloading all data
        setApplications(prev => [newApplication, ...prev]);
        setStats(prev => ({ 
          ...prev, 
          total: prev.total + 1 
        }));
        
        showSuccess('Application Added', 'The application has been successfully added.');
      }
      
      setShowModal(false);
      // editingApplication will be reset by modal close logic
    } catch (err: any) {
      setError(err.message || 'Failed to save application');
      showError('Save Failed', err.message || 'Failed to save application');
    }
  };

  const handleDeleteApplication = async (applicationId: string) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Application',
      message: 'Are you sure you want to delete this application? This action cannot be undone.',
      onConfirm: () => confirmDeleteApplication(applicationId)
    });
  };

  const confirmDeleteApplication = async (applicationId: string) => {
    try {
      setError('');
      await SupabaseJobApplicationService.deleteApplication(applicationId);
      
      // Update local state instead of reloading all data
      setApplications(prev => prev.filter(app => app.id !== applicationId));
      setStats(prev => ({ 
        ...prev, 
        total: Math.max(0, prev.total - 1) 
      }));
      
      setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      showSuccess('Application Deleted', 'The application has been successfully removed.');
    } catch (err: any) {
      setError(err.message || 'Failed to delete application');
      showError('Failed to Delete', err.message || 'Failed to delete application');
      setConfirmationModal(prev => ({ ...prev, isOpen: false }));
    }
  };
  
  const handleViewJobDescription = (job: { title: string; company: string; description: string }) => {
    setSelectedJobDescription(job);
  };

  const handleStartInterview = (application: JobApplication) => {
    // Navigate to AI Interview page with job details
    navigate('/ai-interview', { 
      state: { 
        jobTitle: application.position,
        companyName: application.company_name,
        jobDescription: application.job_description
      }
    });
  };

  const handleLoadAIEnhanced = (application: JobApplication) => {
    if (!application.job_description?.trim()) {
      showError('Please add a job description first to use AI enhancement');
      return;
    }
    setSelectedApplicationForAI(application);
    setShowAIModal(true);
  };

  const handleAISave = async (resumeUrl: string, coverLetterUrl: string) => {
    if (!selectedApplicationForAI || !user) return;

    try {
      const updatedNotes = selectedApplicationForAI.notes 
        ? `${selectedApplicationForAI.notes}\n\nAI-enhanced documents generated on ${new Date().toLocaleDateString()} based on job posting analysis.`
        : `AI-enhanced documents generated on ${new Date().toLocaleDateString()} based on job posting analysis.`;

      await SupabaseJobApplicationService.updateApplication(selectedApplicationForAI.id, {
        notes: updatedNotes
      });

      showSuccess('AI-enhanced resume and cover letter saved successfully!');
      setShowAIModal(false);
      setSelectedApplicationForAI(null);
      
      // Reload applications to reflect the changes
      await loadApplications();
    } catch (err: any) {
      showError('Failed to save AI-enhanced documents. Please try again.');
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: string, newStatus: string) => {
    if (!user) return;

    try {
      setError('');
      
      await SupabaseJobApplicationService.updateApplication(applicationId, { status: newStatus as any });
      
      // Reload applications to reflect the change
      await loadApplications();
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update application status';
      setError(errorMessage);
    }
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <DashboardHeader
        userProfile={userProfile}
        onAddApplication={handleAddApplication}
        onFindMoreJobs={handleJobSearch}
        onJobPreferences={handleJobPreferences}
        onUpdateProfile={handleUpdateProfile}
      />
      
      <main className="container max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 border border-red-200 dark:border-red-800">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6 sm:space-y-8">
          <StatsCards stats={stats} />
          
          <div className="w-full">
            <ApplicationsTable
              applications={applications}
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              onSearchTermChange={setSearchTerm}
              onStatusFilterChange={setStatusFilter}
              onEditApplication={handleEditApplication}
              onViewJobDescription={handleViewJobDescription}
              onDeleteApplication={handleDeleteApplication}
              onUpdateApplicationStatus={handleUpdateApplicationStatus}
              onStartInterview={handleStartInterview}
              onLoadAIEnhanced={handleLoadAIEnhanced}
            />
          </div>
        </div>
      </main>
      
      {/* Modals */}
      <JobSearchModal
        isOpen={showJobSearchModal}
        searchForm={searchForm}
        searchResults={searchResults}
        searchLoading={searchLoading}
        searchError={searchError}
        onClose={() => setShowJobSearchModal(false)}
        onFormChange={handleSearchFormChange}
        onSearch={handleSearch}
        onSaveJob={handleSaveJobFromSearch}
        onSaveMultipleJobs={handleSaveMultipleJobsFromSearch}
        onClear={handleClearSearch}
      />

      {showProfileModal && (
        <ProfileModal
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {showJobPreferencesModal && (
        <JobPreferencesModal
          onClose={() => setShowJobPreferencesModal(false)}
        />
      )}

      <JobDescriptionModal
        isOpen={!!selectedJobDescription}
        jobDescription={selectedJobDescription}
        onClose={() => setSelectedJobDescription(null)}
      />

      {showModal && (
        <ApplicationModal
          application={editingApplication}
          detailedUserProfile={userProfile}
          onSave={handleSaveApplication}
          onClose={() => {
            setShowModal(false);
            setEditingApplication(null);
          }}
        />
      )}

      {showAIModal && selectedApplicationForAI && (
        <AIEnhancementModal
          jobDescription={selectedApplicationForAI.job_description || ''}
          applicationData={{
            position: selectedApplicationForAI.position,
            company_name: selectedApplicationForAI.company_name,
            location: selectedApplicationForAI.location || undefined
          }}
          detailedUserProfile={userProfile}
          onSave={handleAISave}
          onClose={() => {
            setShowAIModal(false);
            setSelectedApplicationForAI(null);
          }}
        />
      )}

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={confirmationModal.onConfirm}
        onCancel={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default Dashboard;