import React, { useState, useEffect } from 'react';
import { X, Upload, Calendar, Building, FileText, User } from 'lucide-react';
import { JobApplication, ApplicationStatus } from '../../types/jobApplication';
import { FileUploadService } from '../../services/fileUploadService';
import { useAuth } from '../../hooks/useAuth';

interface ApplicationModalProps {
  application: JobApplication | null;
  onSave: (data: any) => void;
  onClose: () => void;
}

const ApplicationModal: React.FC<ApplicationModalProps> = ({ application, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    company_name: '',
    position: '',
    status: 'applied' as keyof typeof ApplicationStatus,
    application_date: '',
    job_description: '',
    notes: '',
    resume_url: '',
    cover_letter_url: ''
  });
  const [uploading, setUploading] = useState({ resume: false, cover_letter: false });
  const [error, setError] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    if (application) {
      setFormData({
        company_name: application.company_name,
        position: application.position,
        status: application.status as keyof typeof ApplicationStatus,
        application_date: application.application_date.split('T')[0],
        job_description: application.job_description || '',
        notes: application.notes || '',
        resume_url: application.resume_url || '',
        cover_letter_url: application.cover_letter_url || ''
      });
    } else {
      setFormData({
        company_name: '',
        position: '',
        status: 'applied',
        application_date: new Date().toISOString().split('T')[0],
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

  const handleFileUpload = async (field: 'resume_url' | 'cover_letter_url', file: File) => {
    if (!user) return;
    
    const type = field === 'resume_url' ? 'resume' : 'cover_letter';
    
    try {
      setError('');
      setUploading(prev => ({ ...prev, [type]: true }));

      // Validate file
      const validation = FileUploadService.validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Upload file
      const downloadURL = await FileUploadService.uploadFile(file, user.uid, type);
      setFormData(prev => ({ ...prev, [field]: downloadURL }));
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleFileInputChange = (field: 'resume_url' | 'cover_letter_url') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(field, file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as keyof typeof ApplicationStatus }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {Object.values(ApplicationStatus).map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resume
              </label>
              <div className="space-y-2">
                <input
                  type="url"
                  value={formData.resume_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, resume_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Resume URL"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileInputChange('resume_url')}
                    className="hidden"
                    id="resume-upload"
                    disabled={uploading.resume}
                  />
                  <label
                    htmlFor="resume-upload"
                    className={`px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1 cursor-pointer ${
                      uploading.resume ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload size={16} />
                    {uploading.resume ? 'Uploading...' : 'Upload File'}
                  </label>
                  <span className="text-xs text-gray-500">PDF, DOC, DOCX (max 10MB)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cover Letter
              </label>
              <div className="space-y-2">
                <input
                  type="url"
                  value={formData.cover_letter_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, cover_letter_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Cover letter URL"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileInputChange('cover_letter_url')}
                    className="hidden"
                    id="cover-letter-upload"
                    disabled={uploading.cover_letter}
                  />
                  <label
                    htmlFor="cover-letter-upload"
                    className={`px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1 cursor-pointer ${
                      uploading.cover_letter ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload size={16} />
                    {uploading.cover_letter ? 'Uploading...' : 'Upload File'}
                  </label>
                  <span className="text-xs text-gray-500">PDF, DOC, DOCX (max 10MB)</span>
                </div>
              </div>
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
              disabled={uploading.resume || uploading.cover_letter}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-all disabled:opacity-50"
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
  );
};

export default ApplicationModal;