import React, { useState, useEffect } from 'react';
import { X, Calendar, Building, FileText, User, Link, Sparkles, MapPin } from 'lucide-react';
import { JobApplication, ApplicationStatus, ApplicationStatusValue } from '../../types/jobApplication';
import { UserProfileData } from '../../services/profileService';
import AIEnhancementModal from './AIEnhancementModal';

interface ApplicationModalProps {
  application: JobApplication | null;
  detailedUserProfile?: UserProfileData | null;
  onSave: (data: any) => void;
  onClose: () => void;
}

const ApplicationModal: React.FC<ApplicationModalProps> = ({ application, detailedUserProfile, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    company_name: '',
    position: '',
    status: 'not_applied' as ApplicationStatusValue,
    application_date: '',
    location: '',
    job_posting_url: '',
    job_description: '',
    notes: '',
    resume_url: '',
    cover_letter_url: ''
  });
  const [error, setError] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  useEffect(() => {
    if (application) {
      setFormData({
        company_name: application.company_name,
        position: application.position,
        status: application.status as ApplicationStatusValue,
        application_date: application.application_date ? application.application_date.split('T')[0] : new Date().toISOString().split('T')[0],
        location: (application as any).location || '',
        job_posting_url: application.job_posting_url || '',
        job_description: application.job_description || '',
        notes: application.notes || '',
        resume_url: application.resume_url || '',
        cover_letter_url: application.cover_letter_url || ''
      });
    } else {
      setFormData({
        company_name: '',
        position: '',
        status: 'not_applied',
        application_date: new Date().toISOString().split('T')[0],
        location: '',
        job_posting_url: '',
        job_description: '',
        notes: '',
        resume_url: '',
        cover_letter_url: ''
      });
    }
  }, [application]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const submitData = {
      ...formData,
      application_date: new Date(formData.application_date).toISOString(),
    };

    onSave(submitData);
  };

  const handleLoadAIEnhanced = () => {
    if (!formData.job_description.trim()) {
      setError('Please add a job description first to use AI enhancement');
      return;
    }
    setShowAIModal(true);
  };

  const handleAISave = (resumeUrl: string, coverLetterUrl: string) => {
    setFormData(prev => ({
      ...prev,
      resume_url: resumeUrl,
      cover_letter_url: coverLetterUrl,
      notes: prev.notes + (prev.notes ? '\n\n' : '') +
        `AI-enhanced documents generated on ${new Date().toLocaleDateString()} based on job posting analysis.`
    }));
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
              onClick={onClose}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, application_date: e.target.value }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ApplicationStatusValue }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, job_posting_url: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, job_description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Paste or type the job description here..."
              />
            </div>

            {/* AI Enhancement Section */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Sparkles className="text-blue-600 dark:text-blue-400 mr-2" size={20} />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">AI Enhancement</h3>
                </div>
                <button
                  type="button"
                  onClick={handleLoadAIEnhanced}
                  disabled={!formData.job_description}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all disabled:cursor-not-allowed"
                >
                  <Sparkles size={16} />
                  Load AI Enhanced Resume & Letter
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
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
                  onChange={(e) => setFormData(prev => ({ ...prev, resume_url: e.target.value }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, cover_letter_url: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
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
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
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
            position: formData.position,
            company_name: formData.company_name,
            location: formData.location
          }}
          detailedUserProfile={detailedUserProfile}
          onSave={handleAISave}
          onClose={() => setShowAIModal(false)}
        />
      )}
    </>
  );
};

export default ApplicationModal;