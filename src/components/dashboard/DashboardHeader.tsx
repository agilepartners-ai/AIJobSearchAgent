import React, { useState } from 'react';
import { Plus, Search, LogOut, User, Settings, ChevronDown, Menu, X, Crown } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import UpgradeModal from './UpgradeModal';

interface UserProfileData {
  full_name?: string;
  email?: string;
}

interface DashboardHeaderProps {
  userProfile: UserProfileData | null;
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
  const router = useRouter();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleUpgrade = () => {
    setIsUpgradeModalOpen(true);
  };

  const handleUpgradeConfirm = async () => {
    try {
      const originalBeforeUnload = window.onbeforeunload;
      window.onbeforeunload = null;
      
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (currentUser && currentUser.uid) {
        const paymentUrl = `https://pay.rev.cat/sandbox/evfhfhevsehbykku/${currentUser.uid}`;
        window.location.href = paymentUrl;
      } else {
        window.onbeforeunload = originalBeforeUnload;
        alert('Please log in to upgrade your subscription.');
        router.push('/login');
      }
    } catch (error) {
      console.error('Error getting user for upgrade:', error);
      alert('There was an error processing your request. Please try again.');
    }
    setIsUpgradeModalOpen(false);
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

  return (
    <>
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Left side - Logo and Title */}
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <button
                onClick={() => router.push('/')}
                className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center hover:from-blue-700 hover:to-purple-700 transition-all cursor-pointer flex-shrink-0"
              >
                <span className="text-white font-bold text-xs sm:text-sm">JS</span>
              </button>
              <h1 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white hidden xs:block whitespace-nowrap">
                Job Search Dashboard
              </h1>
              <h1 className="text-base font-semibold text-gray-900 dark:text-white xs:hidden whitespace-nowrap">
                Dashboard
              </h1>
            </div>

            {/* Right side - Profile and Mobile Menu */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Desktop Profile Dropdown */}
              <div className="hidden lg:block relative">
                <button
                  onClick={toggleProfileDropdown}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 flex-shrink-0">
                    <User size={16} />
                  </div>
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
                        className="flex items-center w-full px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <LogOut size={16} className="mr-2" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
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
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 py-3">
              <div className="space-y-2">
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600 space-y-1">
                  <div className="flex items-center px-2 py-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 mr-3">
                      <User size={16} />
                    </div>
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
                    className="w-full flex items-center px-2 py-2 text-sm text-rose-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
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

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onConfirm={handleUpgradeConfirm}
        userProfile={userProfile}
      />
    </>
  );
};

export default DashboardHeader;
