import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import StatsCards from './StatsCards';
import ApplicationsTable from './ApplicationsTable';
import SavedJobsSection from './SavedJobsSection';
import JobDescriptionModal from './JobDescriptionModal';
import ApplicationModal from './ApplicationModal';
import ProfileModal from './ProfileModal';
import JobPreferencesModal from './JobPreferencesModal';
import JobSearchModal from './JobSearchModal';
import { JobApplication } from '../../types/jobApplication';
import { JobApplicationService } from '../../services/jobApplicationService';
import { useAuth } from '../../hooks/useAuth';

const Dashboard: React.FC = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showJobPreferencesModal, setShowJobPreferencesModal] = useState(false);  const [showJobSearchModal, setShowJobSearchModal] = useState(false);
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredJob, setHoveredJob] = useState<string | null>(null);
  const [selectedJobDescription, setSelectedJobDescription] = useState<{title: string, company: string, description: string} | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    interviews: 0,
    offers: 0,
    pending: 0
  });

  const { user, userProfile, loading: authLoading } = useAuth();
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
        JobApplicationService.getUserApplications(user.uid),
        JobApplicationService.getApplicationStats(user.uid)
      ]);
      
      setApplications(applicationsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
      console.error('Error loading applications:', err);
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
    // Placeholder for search functionality
    setSearchLoading(true);
    try {
      // Add search logic here
      console.log('Searching with form:', searchForm);
      setSearchResults([]);
    } catch (error) {
      setSearchError('Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSaveJob = (job: any) => {
    // Placeholder for save job functionality
    console.log('Saving job:', job);
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

  const handleSaveJobFromSearch = (job: any) => {
    // Convert search result to application format and add to listings
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

    // For DashboardMainNew, we'll just show an alert since it might not have the same state management
    alert(`"${job.job_title}" at "${job.employer_name}" will be added to your applications!`);
  };

  const handleSaveMultipleJobsFromSearch = (jobs: any[]) => {
    // For multiple jobs, just show an alert
    alert(`${jobs.length} jobs will be added to your applications!`);
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
        await JobApplicationService.updateApplication(editingApplication.id, applicationData);
      } else {
        await JobApplicationService.addApplication(user.uid, applicationData);
      }
      
      setShowModal(false);
      await loadApplications();    } catch (err: any) {
      setError(err.message || 'Failed to save application');
      console.error('Error saving application:', err);
    }
  };

  const handleDeleteApplication = async (applicationId: string) => {
    if (!confirm('Are you sure you want to delete this application?')) {
      return;
    }

    try {
      setError('');
      await JobApplicationService.deleteApplication(applicationId);
      await loadApplications();
    } catch (err: any) {
      setError(err.message || 'Failed to delete application');
      console.error('Error deleting application:', err);
    }
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
        onJobSearch={handleJobSearch}
        onJobPreferences={handleJobPreferences}
        onUpdateProfile={handleUpdateProfile}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <StatsCards stats={stats} />

        <div className="space-y-8">
          <ApplicationsTable
            applications={applications}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            hoveredJob={hoveredJob}
            onSearchTermChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onEditApplication={handleEditApplication}
            onViewJobDescription={handleViewJobDescription}
            onDeleteApplication={handleDeleteApplication}
            onJobHover={setHoveredJob}
          />

          <SavedJobsSection
            applications={applications}
            onViewJobDescription={handleViewJobDescription}
          />
        </div>
      </main>      {/* Modals */}      <JobSearchModal
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
          onSave={handleSaveApplication}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
