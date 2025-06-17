import React from 'react';
import { Plus, Bot, LogOut, User } from 'lucide-react';
import { AuthService } from '../../services/authService';
import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
  userProfile: any;
  onAddApplication: () => void;
  onAutomatedApply: () => void;
  onImportJobs: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userProfile,
  onAddApplication,
  onAutomatedApply,
  onImportJobs,
}) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">JS</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Job Search Dashboard</h1>
            </div>
          </div>
            <div className="flex items-center space-x-4">
            <button
              onClick={onAddApplication}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
            >
              <Plus size={20} />
              Add Application
            </button>
            
            <button
              onClick={onAutomatedApply}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
            >
              <Bot size={20} />
              Apply Jobs
            </button>
            
            <button
              onClick={onImportJobs}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
            >
              Import Jobs
            </button>
            
            <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
              <User size={20} />
              <span className="text-sm">
                {userProfile?.full_name || userProfile?.email || 'User'}
              </span>
            </div>
            
            <button
              onClick={handleProfile}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <User size={20} />
            </button>
            
            <button
              onClick={handleSignOut}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
