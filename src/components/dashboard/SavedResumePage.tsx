import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, EyeOff, ArrowLeft, Briefcase, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { JobApplication, FirebaseJobApplicationService } from '../../services/firebaseJobApplicationService';
import { useAuth } from '../../hooks/useAuth';
import { useToastContext } from '../ui/ToastProvider';
import DashboardHeader from './DashboardHeader';
import LeftSidebar from './LeftSidebar';

interface SavedResumePageProps {
  onBack: () => void;
  onAddApplication: () => void;
  onJobPreferences: () => void;
  onUpdateProfile: () => void;
  onFindMoreJobs?: () => void;
  onUpgrade: () => void;
  userProfile: any;
}

const SavedResumePage: React.FC<SavedResumePageProps> = ({
  onBack,
  onAddApplication,
  onJobPreferences,
  onUpdateProfile,
  onFindMoreJobs,
  onUpgrade,
  userProfile
}) => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDocumentType, setActiveDocumentType] = useState<'resume' | 'cover_letter'>('resume');
  const [previewStates, setPreviewStates] = useState<{ [key: string]: boolean }>({});

  const { user, loading: authLoading } = useAuth();
  const { showError } = useToastContext();

  useEffect(() => {
    if (!authLoading) {
      loadSavedResumes();
    }
  }, [user, authLoading]);

  const loadSavedResumes = async () => {
    if (authLoading) {
      return; // Still loading authentication
    }

    if (!user) {
      setError('Please log in to view your saved resumes');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const allApplications = await FirebaseJobApplicationService.getUserApplications(user.id);

      // Filter applications that have either resume_url or cover_letter_url
      const savedResumes = allApplications.filter(app =>
        app.resume_url || app.cover_letter_url
      );

      setApplications(savedResumes);

      // Set all previews to show by default
      const defaultPreviewStates: { [key: string]: boolean } = {};
      savedResumes.forEach(app => {
        defaultPreviewStates[app.id] = true;
      });
      setPreviewStates(defaultPreviewStates);
    } catch (err: any) {
      console.error('Error loading saved resumes:', err);
      setError(err.message || 'Failed to load saved resumes');
      showError('Error', 'Failed to load saved resumes');
    } finally {
      setLoading(false);
    }
  };

  const togglePreview = (applicationId: string) => {
    setPreviewStates(prev => ({
      ...prev,
      [applicationId]: !prev[applicationId]
    }));
  };

  const getDocumentUrl = (application: JobApplication) => {
    if (activeDocumentType === 'resume') {
      return application.resume_url;
    } else {
      return application.cover_letter_url;
    }
  };

  const hasDocument = (application: JobApplication) => {
    return getDocumentUrl(application) !== null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {authLoading ? 'Loading authentication...' : 'Loading saved resumes...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader
        userProfile={userProfile}
        onAddApplication={onAddApplication}
        onJobPreferences={onJobPreferences}
        onUpdateProfile={onUpdateProfile}
      />

      <LeftSidebar
        onDashboard={onBack}
        onFindMoreJobs={onFindMoreJobs}
        onAddApplication={onAddApplication}
        onSavedResume={() => {}} // Already on saved resume page
        onUpgrade={onUpgrade}
      />

      <main className="ml-64 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Saved Resumes</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                View and manage your saved resume and cover letter documents
              </p>
            </div>

            {/* Document Type Toggle */}
            <div className="flex bg-gray-900 rounded-lg p-1">
              <button
                onClick={() => setActiveDocumentType('resume')}
                className={`px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${
                  activeDocumentType === 'resume'
                    ? 'bg-gray-700'
                    : 'bg-gray-900 hover:bg-gray-800'
                }`}
              >
                Resume
              </button>
              <button
                onClick={() => setActiveDocumentType('cover_letter')}
                className={`px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${
                  activeDocumentType === 'cover_letter'
                    ? 'bg-gray-700'
                    : 'bg-gray-900 hover:bg-gray-800'
                }`}
              >
                Cover Letter
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {applications.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No saved resumes found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Generate and save resume and cover letter documents from job applications to see them here.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {applications.map((application) => (
              <div
                key={application.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Job Info Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg leading-tight">
                        {application.position}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 font-medium mt-1">
                        {application.company_name}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      application.status === 'applied' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                      application.status === 'interviewing' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' :
                      application.status === 'offered' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400' :
                      application.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
                      'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400'
                    }`}>
                      {application.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {application.location && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        <span>{application.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>Applied: {formatDate(application.application_date)}</span>
                    </div>
                    {application.job_posting_url && (
                      <div className="flex items-center gap-2">
                        <ExternalLink size={14} />
                        <a
                          href={application.job_posting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline truncate"
                        >
                          View Job Posting
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Section */}
                <div className="p-6">
                  {hasDocument(application) ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-gray-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {activeDocumentType === 'resume' ? 'Resume' : 'Cover Letter'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => togglePreview(application.id)}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-green-700 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-green-900 dark:hover:bg-gray-600 transition-colors"
                          >
                            {previewStates[application.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            {previewStates[application.id] ? 'Hide Preview' : 'Show Preview'}
                          </button>
                          <a
                            href={getDocumentUrl(application)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors"
                          >
                            <Download size={14} />
                            Download
                          </a>
                        </div>
                      </div>

                      {previewStates[application.id] && (
                        <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                          <iframe
                            src={getDocumentUrl(application)!}
                            className="w-full h-64 bg-white"
                            title={`${activeDocumentType === 'resume' ? 'Resume' : 'Cover Letter'} Preview`}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText size={32} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No {activeDocumentType === 'resume' ? 'resume' : 'cover letter'} available
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </main>
    </div>
  );
};

export default SavedResumePage;