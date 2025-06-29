import React, { useState } from 'react';
import { Plus, Search, LogOut, User, Settings, ChevronDown, Menu, X } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleProfileAction = (action: () => void) => {
    action();
    setIsProfileDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  // Sample profile image URL - replace with actual user image when available
  const profileImageUrl = userProfile?.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face&auto=format&q=60";

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo and Title */}
          <div className="flex items-center flex-shrink-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => navigate('/')}
                className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center hover:from-blue-700 hover:to-purple-700 transition-all cursor-pointer"
              >
                <span className="text-white font-bold text-xs sm:text-sm">JS</span>
              </button>
              <h1 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white hidden xs:block">
                Job Search Dashboard
              </h1>
              <h1 className="text-base font-semibold text-gray-900 dark:text-white xs:hidden">
                Dashboard
              </h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-3 xl:space-x-4">
            {onFindMoreJobs && (
              <button
                onClick={onFindMoreJobs}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 xl:px-4 xl:py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-medium"
              >
                <Search size={18} />
                <span className="hidden xl:inline">Find Jobs</span>
                <span className="xl:hidden">Find</span>
              </button>
            )}
            
            <button
              onClick={onAddApplication}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 xl:px-4 xl:py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-medium"
            >
              <Plus size={18} />
              <span className="hidden xl:inline">Manual Job Entry</span>
              <span className="xl:hidden">Add Job</span>
            </button>
            
            {/* Desktop Profile Dropdown */}
            <div className="relative">
              <button
                onClick={toggleProfileDropdown}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 max-w-32 truncate">
                  {userProfile?.full_name || userProfile?.email || 'User'}
                </span>
                <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />
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
          <div className="lg:hidden">
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 py-3">
            <div className="space-y-2">
              {onFindMoreJobs && (
                <button
                  onClick={() => {
                    onFindMoreJobs();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-sm font-medium"
                >
                  <Search size={18} />
                  Find Jobs
                </button>
              )}
              
              <button
                onClick={() => {
                  onAddApplication();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-sm font-medium"
              >
                <Plus size={18} />
                Manual Job Entry
              </button>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-600 space-y-1">
                <div className="flex items-center px-2 py-2">
                  <img
                    src={profileImageUrl}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover mr-3"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {userProfile?.full_name || userProfile?.email || 'User'}
                  </span>
                </div>
                
                <button
                  onClick={() => handleProfileAction(onUpdateProfile)}
                  className="w-full flex items-center px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  <User size={16} className="mr-3" />
                  Update Profile
                </button>
                
                <button
                  onClick={() => handleProfileAction(onJobPreferences)}
                  className="w-full flex items-center px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  <Settings size={16} className="mr-3" />
                  Job Preferences
                </button>
                
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center px-2 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  <LogOut size={16} className="mr-3" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default DashboardHeader;