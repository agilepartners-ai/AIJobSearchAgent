import React from 'react';
import { X } from 'lucide-react';

interface JobDescriptionModalProps {
  isOpen: boolean;
  jobDescription: {
    title: string;
    company: string;
    description: string;
  } | null;
  onClose: () => void;
}

const JobDescriptionModal: React.FC<JobDescriptionModalProps> = ({
  isOpen,
  jobDescription,
  onClose,
}) => {
  if (!isOpen || !jobDescription) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {jobDescription.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{jobDescription.company}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div 
            className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: jobDescription.description.replace(/\n/g, '<br>') }}
          />
        </div>
      </div>
    </div>
  );
};

export default JobDescriptionModal;
