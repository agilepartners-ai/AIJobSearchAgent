import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setFormData, updateFormField, resetForm } from '../../store/applicationModalSlice';
import { openModal as openAIModal, closeModal as closeAIModal, resetState as resetAIState } from '../../store/aiEnhancementModalSlice';
import { X, Calendar, Building, FileText, User, Link, Sparkles, MapPin } from 'lucide-react';
import { JobApplication } from '../../services/firebaseJobApplicationService';
import { UserProfileData } from '../../services/profileService';
import AIEnhancementModal from './AIEnhancementModal';

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

interface ApplicationModalProps {
  application: JobApplication | null;
  detailedUserProfile?: UserProfileData | null;
  onSave: (data: any) => void;
  onClose: () => void;
}

const ApplicationModal: React.FC<ApplicationModalProps> = ({ application, detailedUserProfile, onSave, onClose }) => {
  const dispatch = useAppDispatch();
  const formData = useAppSelector((state) => state.applicationModal.formData);
  const [error, setError] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  useEffect(() => {
    if (application) {
      dispatch(setFormData({
        company_name: application.company_name || '',
        position: application.position || '',
        status: application.status || 'not_applied',
        application_date: application.application_date ? new Date(application.application_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        location: application.location || '',
        job_posting_url: application.job_posting_url || '',
        job_description: application.job_description || '',
        notes: application.notes || '',
        resume_url: application.resume_url || '',
        cover_letter_url: application.cover_letter_url || ''
      }));
    } else {
      dispatch(resetForm());
    }
  }, [application, dispatch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const submitData = {
      ...formData,
      application_date: new Date(formData.application_date).toISOString(),
    };

    onSave(submitData);
    dispatch(resetForm());
  };

  const handleLoadAIEnhanced = () => {
    if (!formData.job_description.trim()) {
      setError('Please add a job description first to use AI enhancement');
      return;
    }
    dispatch(resetAIState());
    dispatch(openAIModal({ jobDescription: formData.job_description }));
    setShowAIModal(true);
  };

  const handleAISave = (resumeUrl: string, coverLetterUrl: string) => {
    dispatch(setFormData({
      ...formData,
      resume_url: resumeUrl,
      cover_letter_url: coverLetterUrl,
      notes: formData.notes + (formData.notes ? '\n\n' : '') +
        `AI-enhanced documents generated on ${new Date().toLocaleDateString()} based on job posting analysis.`
    }));
    dispatch(closeAIModal());
    setShowAIModal(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {application ? 'Edit Application' : 'Add New Application'}
            </h2>
            <button
              onClick={() => { dispatch(resetForm()); onClose(); }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Building size={16} className="inline mr-2" />
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => dispatch(updateFormField({ field: 'company_name', value: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <User size={16} className="inline mr-2" />
                  Position
                </label>
                <input
                  type="text"
                  required
                  value={formData.position}
                  onChange={(e) => dispatch(updateFormField({ field: 'position', value: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter position title"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar size={16} className="inline mr-2" />
                  Application Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.application_date}
                  onChange={(e) => dispatch(updateFormField({ field: 'application_date', value: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin size={16} className="inline mr-2" />
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => dispatch(updateFormField({ field: 'location', value: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., San Francisco, CA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => dispatch(updateFormField({ field: 'status', value: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {Object.values(ApplicationStatus).map(status => (
                    <option key={status} value={status}>
                      {status === 'not_applied' ? 'Not Applied' :
                        status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Link size={16} className="inline mr-2" />
                URL of the Job Posting
              </label>
              <input
                type="url"
                value={formData.job_posting_url}
                onChange={(e) => dispatch(updateFormField({ field: 'job_posting_url', value: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://example.com/job-posting"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Enter the direct URL to the job posting for reference
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText size={16} className="inline mr-2" />
                Job Description
              </label>
              <textarea
                value={formData.job_description}
                onChange={(e) => dispatch(updateFormField({ field: 'job_description', value: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Paste the job description here..."
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <button 
                type="button"
                onClick={handleLoadAIEnhanced}
                disabled={!formData.job_description.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles size={18} />
                AI Enhance Resume & Cover Letter
              </button>
              <p className="text-xs text-center text-blue-600 dark:text-blue-400 mt-2">
                Generate AI-optimized resume and cover letter tailored to this specific job posting.
                {!formData.job_description && " Please add a job description first."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Resume URL
                </label>
                <input
                  type="url"
                  value={formData.resume_url}
                  onChange={(e) => dispatch(updateFormField({ field: 'resume_url', value: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="https://example.com/resume.pdf"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Enter a direct URL to your resume
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cover Letter URL
                </label>
                <input
                  type="url"
                  value={formData.cover_letter_url}
                  onChange={(e) => dispatch(updateFormField({ field: 'cover_letter_url', value: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="https://example.com/cover-letter.pdf"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Enter a direct URL to your cover letter
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => dispatch(updateFormField({ field: 'notes', value: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Add any notes about this application..."
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-all"
              >
                {application ? 'Update Application' : 'Add Application'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* AI Enhancement Modal */}
      {showAIModal && (
        <AIEnhancementModal
          jobDescription={formData.job_description}
          applicationData={{
            id: application?.id || "",
            position: formData.position,
            company_name: formData.company_name,
            location: formData.location
          }}
          detailedUserProfile={detailedUserProfile}
          onSave={handleAISave}
          onClose={() => {
            dispatch(closeAIModal());
            setShowAIModal(false);
          }}
        />
      )}
    </>
  );
};

export default ApplicationModal;