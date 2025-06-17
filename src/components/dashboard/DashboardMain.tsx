import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import StatsCards from './StatsCards';
import ApplicationsTable from './ApplicationsTable';
import SavedJobsSection from './SavedJobsSection';
import ApplyJobsModal from './ApplyJobsModal';
import JobDescriptionModal from './JobDescriptionModal';
import ApplicationModal from './ApplicationModal';
import { JobApplication } from '../../types/jobApplication';
import { JobApplicationService } from '../../services/jobApplicationService';
import { JobSearchService } from '../../services/jobSearchService';
import { useAuth } from '../../hooks/useAuth';

interface ApplyJobsForm {
  targetRole: string;
  experienceLevel: string;
  preferredLocation: string;
  salaryExpectation: string;
  employmentType: string;
  remotePreference: boolean;
  skillsKeywords: string;
  industries: string;
  resumeVersion: string;
  coverLetterTemplate: string;
}

const Dashboard: React.FC = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [combinedListings, setCombinedListings] = useState<JobApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showApplyJobsModal, setShowApplyJobsModal] = useState(false);
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
  };
  const handleAddApplication = () => {
    setEditingApplication(null);
    setShowModal(true);
  };

  const handleAddAutomatedApplication = () => {
    setShowApplyJobsModal(true);
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
      await loadApplications();
    } catch (err: any) {
      setError(err.message || 'Failed to save application');
      console.error('Error saving application:', err);
    }
  };
  const handleApplyJobs = async (applyJobsData: ApplyJobsForm) => {
    if (!user) return;

    try {
      setError('');
      setLoading(true);
      
      // Search for jobs based on user's criteria
      const jobSearchResults = await JobSearchService.searchJobs({
        jobProfile: applyJobsData.targetRole || 'Software Developer',
        experience: applyJobsData.experienceLevel === 'entry' ? 'Fresher' : 'Experienced',
        location: applyJobsData.preferredLocation || 'United States',
        numPages: 3 // Get more results for targeted search
      });

      if (jobSearchResults.success && jobSearchResults.jobs.length > 0) {
        // Convert job listings to JobApplication format for display
        const convertedJobs: JobApplication[] = jobSearchResults.jobs.map((job, index) => {
          // Safely handle the posted_at date
          let safePostedDate = new Date().toISOString();
          if (job.posted_at && job.posted_at !== 'N/A') {
            try {
              const testDate = new Date(job.posted_at);
              if (!isNaN(testDate.getTime())) {
                safePostedDate = testDate.toISOString();
              }
            } catch (error) {
              console.warn('Invalid posted_at date for job:', job.title, job.posted_at);
            }
          }

          return {
            id: `job-search-${index}-${Date.now()}`,
            user_id: user?.uid || '',
            company_name: job.company,
            position: job.title,
            status: 'not_applied',
            application_date: new Date().toISOString(),
            last_updated: safePostedDate,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            job_description: job.description,
            job_posting_url: job.apply_url || job.job_url,
            notes: `🎯 ${applyJobsData.targetRole} search | 📍 ${job.location}${job.employment_type !== 'N/A' ? ` | ${job.employment_type}` : ''}${job.salary !== 'N/A' ? ` | ${job.salary}` : ''}`,
          };
        });

        // Add the new jobs to existing listings (avoiding duplicates)
        setCombinedListings(prev => {
          const existingIds = new Set(prev.map(job => job.company_name + job.position));
          const newJobs = convertedJobs.filter(job => 
            !existingIds.has(job.company_name + job.position)
          );
          return [...prev, ...newJobs];
        });

        alert(`Found ${jobSearchResults.jobs.length} ${applyJobsData.targetRole} positions! Check the applications table below to apply to specific jobs.`);
      } else {
        alert(`No jobs found for "${applyJobsData.targetRole}" in "${applyJobsData.preferredLocation}". Try different criteria.`);
      }
      
      setShowApplyJobsModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to search for jobs');
      console.error('Error searching for jobs:', err);
    } finally {
      setLoading(false);
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

  const handleImportJobs = () => {
    // Placeholder for import functionality
    alert('Import Jobs functionality will be implemented soon!');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader
        userProfile={userProfile}
        onAddApplication={handleAddApplication}
        onAutomatedApply={handleAddAutomatedApplication}
        onImportJobs={handleImportJobs}
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
      </main>

      {/* Modals */}
      <ApplyJobsModal
        isOpen={showApplyJobsModal}
        userProfile={userProfile}
        onClose={() => setShowApplyJobsModal(false)}
        onApply={handleApplyJobs}
      />

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
