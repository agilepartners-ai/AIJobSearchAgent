import React, { useState } from 'react';
import { X, Video, FileText, Briefcase, ExternalLink, Loader } from 'lucide-react';
import { JobApplication } from '../../types/jobApplication';
import { createConversation } from '../../services/interviewService';
import { IConversation } from '../../types';

interface InterviewModalProps {
  application: JobApplication;
  onClose: () => void;
}

const InterviewModal: React.FC<InterviewModalProps> = ({ application, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversation, setConversation] = useState<IConversation | null>(null);

  const handleStartInterview = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Prepare context from job application
      const context = `
        Job Title: ${application.position}
        Company: ${application.company_name}
        Job Description: ${application.job_description || 'Not provided'}
        
        This is a mock interview for the position above. Please tailor your questions to this specific role and company.
      `;
      
      const conversationData = await createConversation(context);
      setConversation(conversationData);
    } catch (err: any) {
      setError(err.message || 'Failed to create interview session');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInterview = () => {
    if (conversation?.conversation_url) {
      window.open(`https://myjobsearchagent.web.app/${conversation.conversation_id}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <Video className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                AI Interview Practice
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Practice your interview skills for this position
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
        
        <div className="p-6 space-y-6">
          {/* Job Details */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="text-blue-600 dark:text-blue-400" size={18} />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {application.position}
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
              {application.company_name}
            </p>
            {application.job_description && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="text-gray-500 dark:text-gray-400" size={16} />
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Job Description Preview
                  </h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 pl-6">
                  {application.job_description.substring(0, 200)}...
                </p>
              </div>
            )}
          </div>
          
          {/* Status */}
          {loading && (
            <div className="text-center py-8">
              <Loader className="h-10 w-10 text-purple-600 dark:text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                Setting up your interview session...
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                This may take a few moments
              </p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}
          
          {!conversation && !loading && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg text-center">
              <Video className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">
                Ready for Your Interview?
              </h3>
              <p className="text-blue-700 dark:text-blue-400 mb-6">
                Click the button below to start your AI-powered interview practice session for this position.
              </p>
              <button
                onClick={handleStartInterview}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-6 rounded-lg font-medium transition-all"
              >
                Let's Start Interview
              </button>
            </div>
          )}
          
          {conversation && (
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Video className="text-green-600 dark:text-green-400" size={20} />
                <h3 className="font-semibold text-green-800 dark:text-green-300">
                  Interview Session Ready
                </h3>
              </div>
              <p className="text-green-700 dark:text-green-400 text-sm mb-4">
                Your AI interview session has been created successfully. Click the button below to start your interview.
              </p>
              <button
                onClick={handleOpenInterview}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <ExternalLink size={18} />
                Open Interview Session
              </button>
              <p className="text-xs text-green-600 dark:text-green-500 mt-2 text-center">
                The interview will open in a new tab
              </p>
            </div>
          )}
          
          {/* Instructions */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Interview Tips
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Ensure your camera and microphone are working properly</li>
              <li>• Find a quiet space with good lighting</li>
              <li>• Dress professionally as you would for a real interview</li>
              <li>• Speak clearly and maintain eye contact with the camera</li>
              <li>• Take your time to think before answering questions</li>
              <li>• Have a copy of your resume nearby for reference</li>
            </ul>
          </div>
        </div>
        
        <div className="p-6 pt-0 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewModal;