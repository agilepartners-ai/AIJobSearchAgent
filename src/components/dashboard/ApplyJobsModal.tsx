import React, { useState } from 'react';
import { X, Bot, Send } from 'lucide-react';

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

interface ApplyJobsModalProps {
  isOpen: boolean;
  userProfile: any;
  onClose: () => void;
  onApply: (formData: ApplyJobsForm) => void;
}

const ApplyJobsModal: React.FC<ApplyJobsModalProps> = ({
  isOpen,
  userProfile,
  onClose,
  onApply,
}) => {
  const [applyForm, setApplyForm] = useState<ApplyJobsForm>({
    targetRole: '',
    experienceLevel: '',
    preferredLocation: '',
    salaryExpectation: '',
    employmentType: '',
    remotePreference: false,
    skillsKeywords: '',
    industries: '',
    resumeVersion: 'default',
    coverLetterTemplate: 'standard',
  });

  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const updateForm = (field: keyof ApplyJobsForm, value: any) => {
    setApplyForm(prev => ({ ...prev, [field]: value }));
  };

  const handleApply = async () => {
    if (!applyForm.targetRole.trim()) {
      alert('Please specify your target role');
      return;
    }

    setIsProcessing(true);
    try {
      await onApply(applyForm);
      onClose();
    } catch (error) {
      console.error('Error applying to jobs:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setApplyForm({
      targetRole: '',
      experienceLevel: '',
      preferredLocation: '',
      salaryExpectation: '',
      employmentType: '',
      remotePreference: false,
      skillsKeywords: '',
      industries: '',
      resumeVersion: 'default',
      coverLetterTemplate: 'standard',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Bot className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                AI-Powered Job Application
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure your preferences for automated job applications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Profile Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Your Profile</h3>
            <p className="text-blue-800 dark:text-blue-300 text-sm">
              <strong>Name:</strong> {userProfile?.full_name || 'Not set'} | 
              <strong> Email:</strong> {userProfile?.email || 'Not set'} |
              <strong> Phone:</strong> {userProfile?.phone || 'Not set'}
            </p>
          </div>

          {/* Application Preferences Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Role / Position *
              </label>
              <input
                type="text"
                value={applyForm.targetRole}
                onChange={(e) => updateForm('targetRole', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g. Senior Software Engineer, Product Manager"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Experience Level
              </label>
              <select
                value={applyForm.experienceLevel}
                onChange={(e) => updateForm('experienceLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Any Experience Level</option>
                <option value="entry_level">Entry Level (0-2 years)</option>
                <option value="mid_level">Mid Level (2-5 years)</option>
                <option value="senior_level">Senior Level (5-10 years)</option>
                <option value="executive">Executive (10+ years)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Location
              </label>
              <input
                type="text"
                value={applyForm.preferredLocation}
                onChange={(e) => updateForm('preferredLocation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g. New York, San Francisco, Remote"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Salary Expectation
              </label>
              <input
                type="text"
                value={applyForm.salaryExpectation}
                onChange={(e) => updateForm('salaryExpectation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g. $80,000 - $120,000, Negotiable"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Employment Type
              </label>
              <select
                value={applyForm.employmentType}
                onChange={(e) => updateForm('employmentType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Any Type</option>
                <option value="FULLTIME">Full Time</option>
                <option value="PARTTIME">Part Time</option>
                <option value="CONTRACTOR">Contract</option>
                <option value="INTERN">Internship</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resume Version
              </label>
              <select
                value={applyForm.resumeVersion}
                onChange={(e) => updateForm('resumeVersion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="default">Default Resume</option>
                <option value="technical">Technical Resume</option>
                <option value="managerial">Managerial Resume</option>
                <option value="creative">Creative Resume</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Key Skills & Keywords
              </label>
              <input
                type="text"
                value={applyForm.skillsKeywords}
                onChange={(e) => updateForm('skillsKeywords', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g. React, Python, Project Management, Agile"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Industries
              </label>
              <input
                type="text"
                value={applyForm.industries}
                onChange={(e) => updateForm('industries', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g. Technology, Healthcare, Finance, Startups"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cover Letter Template
              </label>
              <select
                value={applyForm.coverLetterTemplate}
                onChange={(e) => updateForm('coverLetterTemplate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="standard">Standard Template</option>
                <option value="technical">Technical Template</option>
                <option value="creative">Creative Template</option>
                <option value="executive">Executive Template</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={applyForm.remotePreference}
                  onChange={(e) => updateForm('remotePreference', e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Prioritize remote opportunities
                </span>
              </label>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleApply}
              disabled={isProcessing || !applyForm.targetRole.trim()}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 transition-all disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing Applications...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Start AI Job Applications
                </>
              )}
            </button>
            
            <button
              onClick={handleClear}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Clear Form
            </button>
            
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
          </div>
          
          {/* Instructions */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">How it works:</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• AI will search for jobs matching your criteria</li>
              <li>• Automatically customize your resume and cover letter</li>
              <li>• Apply to relevant positions on your behalf</li>
              <li>• Track all applications in your dashboard</li>
              <li>• Send you updates on application status</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyJobsModal;
