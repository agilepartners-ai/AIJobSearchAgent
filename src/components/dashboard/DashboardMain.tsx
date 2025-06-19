import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import StatsCards from './StatsCards';
import ApplicationsTable from './ApplicationsTable';
import SavedJobsSection from './SavedJobsSection';
import JobDescriptionModal from './JobDescriptionModal';
import ApplicationModal from './ApplicationModal';
import JobPreferencesModal from './JobPreferencesModal';
import JobSearchModal from './JobSearchModal';
import ProfileModal from './ProfileModal';
import { JobApplication } from '../../types/jobApplication';
import { JobApplicationService } from '../../services/jobApplicationService';
import { JobSearchService } from '../../services/jobSearchService';
import { useAuth } from '../../hooks/useAuth';

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
  const navigate = useNavigate();  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      loadApplications();
    }
  }, [user, authLoading, navigate]);
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
        JobApplicationService.getUserApplications(user.uid),
        JobApplicationService.getApplicationStats(user.uid)
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

  const handleJobSearch = () => {
    setShowJobSearchModal(true);
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

    setCombinedListings(prev => {
      const existingIds = new Set(prev.map(app => app.company_name + app.position));
      if (!existingIds.has(newApplication.company_name + newApplication.position)) {
        return [...prev, newApplication];
      }
      return prev;
    });    alert(`"${job.job_title}" at "${job.employer_name}" added to your applications!`);
  };

  const handleSaveMultipleJobsFromSearch = (jobs: any[]) => {
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

    alert(`${jobs.length} jobs added to your applications!`);
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
  };  const handleUpdateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      setError('');
      
      // Check if this is a job listing (starts with 'job-listing-')
      if (applicationId.startsWith('job-listing-')) {
        // Find the job listing in combinedListings
        const jobListing = combinedListings.find(job => job.id === applicationId);
        if (jobListing && user && newStatus === 'applied') {          // Convert job listing to actual application
          const applicationData = {
            company_name: jobListing.company_name,
            position: jobListing.position,
            status: 'applied',
            application_date: new Date().toISOString(),
            job_description: jobListing.job_description,
            notes: jobListing.notes,
            job_url: jobListing.job_posting_url,
            apply_url: jobListing.job_posting_url
          };
          
          await JobApplicationService.addApplication(user.uid, applicationData);
          
          // Remove from job listings and refresh data
          setCombinedListings(prev => prev.filter(job => job.id !== applicationId));
          await loadApplications();
          return;
        }
      }
      
      // Handle regular application status updates
      await JobApplicationService.updateApplication(applicationId, { status: newStatus });
      await loadApplications();
    } catch (err: any) {
      setError(err.message || 'Failed to update application status');
      console.error('Error updating application status:', err);
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

        <div className="space-y-8">          <ApplicationsTable
            applications={[...applications, ...combinedListings]}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            hoveredJob={hoveredJob}
            onSearchTermChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onEditApplication={handleEditApplication}
            onViewJobDescription={handleViewJobDescription}
            onDeleteApplication={handleDeleteApplication}
            onJobHover={setHoveredJob}
            onUpdateApplicationStatus={handleUpdateApplicationStatus}
          />

          <SavedJobsSection
            applications={applications}
            onViewJobDescription={handleViewJobDescription}
          />
        </div>
      </main>      {/* Modals */}
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
