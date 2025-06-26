import React, { useState } from 'react';
import { Plus, Search, LogOut, User, Settings, ChevronDown, Menu, Video } from 'lucide-react';
import SupabaseAuthService from '../../services/supabaseAuthService';
import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
  userProfile: any;
  onAddApplication: () => void;
  onJobPreferences: () => void;
  onUpdateProfile: () => void;
  onFindMoreJobs?: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userProfile,
  onAddApplication,
  onJobPreferences,
  onUpdateProfile,
  onFindMoreJobs,
}) => {
  const navigate = useNavigate();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await SupabaseAuthService.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleProfileAction = (action: () => void) => {
    action();
    setIsProfileDropdownOpen(false);
  };

  // Sample profile image URL - replace with actual user image when available
  const profileImageUrl = userProfile?.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face&auto=format&q=60";

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/')}
                className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center hover:from-blue-700 hover:to-purple-700 transition-all cursor-pointer"
              >
                <span className="text-white font-bold text-sm">JS</span>
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Job Search Dashboard</h1>
            </div>
          </div>
            {/* Navbar with Job Search and Add Application */}          
          <div className="hidden md:flex items-center space-x-4">
            {onFindMoreJobs && (
              <button
                onClick={onFindMoreJobs}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
              >
                <Search size={20} />
                Find Jobs
              </button>
            )}

            <button
              onClick={() => navigate('/ai-interview')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
            >
              <Video size={20} />
              AI Interview
            </button>
            
            <button
              onClick={onAddApplication}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
            >
              <Plus size={20} />
              Add Application
            </button>
            
            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={toggleProfileDropdown}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {userProfile?.full_name || userProfile?.email || 'User'}
                </span>
                <ChevronDown size={16} className="text-gray-500" />
              </button>
              
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => handleProfileAction(onUpdateProfile)}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <User size={16} className="mr-2" />
                      Update Profile
                    </button>
                    <button
                      onClick={() => handleProfileAction(onJobPreferences)}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Settings size={16} className="mr-2" />
                      Job Preferences
                    </button>
                    <hr className="my-1 border-gray-200 dark:border-gray-600" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <LogOut size={16} className="mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleProfileDropdown}
              className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
