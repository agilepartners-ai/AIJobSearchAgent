import React from 'react';
import { X, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface ProfileModalProps {
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { userProfile } = useAuth();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <User className="w-8 h-8 text-gray-400" />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {userProfile?.full_name || 'No name provided'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {userProfile?.email}
              </p>
            </div>
          </div>

          {userProfile?.phone && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <p className="text-gray-900 dark:text-white">{userProfile.phone}</p>
            </div>
          )}

          {userProfile?.location && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
              </label>
              <p className="text-gray-900 dark:text-white">{userProfile.location}</p>
            </div>
          )}

          {userProfile?.current_job_title && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Job Title
              </label>
              <p className="text-gray-900 dark:text-white">{userProfile.current_job_title}</p>
            </div>
          )}

          <div className="text-center pt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Profile editing will be available in a future update.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
