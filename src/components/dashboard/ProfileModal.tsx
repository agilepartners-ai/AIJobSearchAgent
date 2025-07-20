import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import ProfileForm, { ProfileData } from '../forms/ProfileFormNew';
import { ProfileService } from '../../services/profileService';
import { auth } from '../../lib/firebase';

interface ProfileModalProps {
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { user, userProfile } = useAuth();
  const [, setIsEditing] = useState(true); // Start in editing mode immediately
  const [isLoading, setIsLoading] = useState(true); // Start with loading state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSaveData, setLastSaveData] = useState<ProfileData | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [localUserProfile, setLocalUserProfile] = useState<any>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Prevent accidental closing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formSubmitted || isClosing) return;
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formSubmitted, isClosing]);

  // Load profile data when modal opens or user changes
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        const profile = await ProfileService.getOrCreateProfile(
          user.uid,
          user.email || '',
          user.displayName || 'New User'
        );
        
        setLocalUserProfile(profile);
      } catch (error) {
        setError('Failed to load profile data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Use local profile data or auth profile data
  const currentProfile = localUserProfile || userProfile;

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if form is being submitted or is already closing
      if (formSubmitted || isClosing) return;
      
      // Don't close if clicking inside the modal
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        // Ignore clicks outside - don't close the modal
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // Add event listener with capture phase to intercept events early
    document.addEventListener('mousedown', handleClickOutside, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [formSubmitted, isClosing]);

  const handleEditProfile = async (profileData: ProfileData) => {
    // Set form as submitted to prevent auto-closing
    setFormSubmitted(true);
    
    // Store the data for potential retry
    setLastSaveData(profileData);
    
    // Clear previous messages and reset debug steps
    setError(null);
    setSuccess(null);

    // Validate user exists
    if (!user) {
      const errorMsg = 'No user found. Please login again.';
      setError(errorMsg);
      return;
    }

    // Validate required fields
    if (!profileData.fullName?.trim()) {
      const errorMsg = 'Full name is required';
      setError(errorMsg);
      return;
    }

    if (!profileData.email?.trim()) {
      const errorMsg = 'Email is required';
      setError(errorMsg);
      return;
    }

    setIsLoading(true);
    
    try {
      // First, let's verify the Firebase connection and authentication
      const authUser = auth.currentUser;

      if (!authUser) {
        throw new Error('No authenticated user found');
      }
      // Prepare update data with all profile fields for database
      const updateData: Partial<import('../../services/profileService').UserProfileData> = {
        fullName: profileData.fullName?.trim(),
        phone: profileData.phone?.trim() || undefined,
        location: profileData.location?.trim() || undefined,
        currentJobTitle: profileData.currentJobTitle?.trim() || undefined,
        experience: profileData.experience,
        skills: Array.isArray(profileData.skills) ? profileData.skills.filter(s => s?.trim()) : [],
        linkedin: profileData.socialLinks?.linkedin?.trim() || undefined,
        github: profileData.socialLinks?.github?.trim() || undefined,
        portfolio: profileData.socialLinks?.portfolio?.trim() || undefined,
        expectedSalary: profileData.expectedSalary?.trim() || undefined,
        currentCTC: profileData.currentCTC?.trim() || undefined,
        workAuthorization: profileData.workAuthorization?.trim() || undefined,
        noticePeriod: profileData.noticePeriod?.trim() || undefined,
        availability: profileData.availability?.trim() || undefined,
        willingnessToRelocate: profileData.willingnessToRelocate || false,
        references: profileData.references?.trim() || undefined,
        jobProfile: profileData.jobProfile || '',
        employmentType: profileData.employmentType || '',
        remoteJobsOnly: profileData.remoteJobsOnly || false,
        datePosted: profileData.datePosted || '',
        workExperience: profileData.workExperience || [],
        education: profileData.education || []
      };

      // Attempt profile update
      await ProfileService.updateUserProfile(user.uid, updateData);

      // Verify the update actually happened
      const verifyResult = await ProfileService.getUserProfile(user.uid);
      
      if (!verifyResult || verifyResult.fullName !== updateData.fullName) {
        throw new Error('Profile update verification failed - changes may not have been saved');
      }
      
      setSuccess('Profile saved successfully! All data has been saved to the database.');
      
      // Update local profile with the verified result
      setLocalUserProfile(verifyResult);
      
      // Clear the saved data since save was successful
      setLastSaveData(null);
      
      // Close the editing modal after a brief delay
      setTimeout(() => {
        setIsClosing(true);
        setIsEditing(false);
        setSuccess(null);
        // Also close the entire modal after successful save
        onClose();
      }, 2000); // Reduced delay to 2 seconds
      
    } catch (error) {
      let errorMessage = 'Failed to save profile. ';
      
      if (error instanceof Error) {
        // Handle common error cases with user-friendly messages
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error: Please check your internet connection and try again.';
        } else if (error.message.includes('auth') || error.message.includes('unauthorized')) {
          errorMessage = 'Authentication error: Please log out and log back in, then try again.';
        } else if (error.message.includes('permission') || error.message.includes('denied')) {
          errorMessage = 'Permission error: You do not have permission to update this profile.';
        } else {
          errorMessage += error.message;
        }
      } else if (typeof error === 'object' && error !== null) {
        // Handle Firebase errors
        const firebaseError = error as any;
        if (firebaseError.code) {
          switch (firebaseError.code) {
            case 'auth/network-request-failed':
              errorMessage = 'Network error: Please check your internet connection and try again.';
              break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
              errorMessage = 'Authentication error: Please log out and log back in, then try again.';
              break;

            case 'permission-denied':
              errorMessage = 'Permission error: You do not have permission to update this profile.';
              break;
            default:
              errorMessage = `Firebase error: ${firebaseError.message || 'Unknown Firebase error'}`;
          }
        } else if (firebaseError.message) {
          errorMessage += firebaseError.message;
        } else {
          errorMessage = 'Unknown error occurred. Please try again.';
        }
      } else {
        errorMessage = 'Unknown error occurred. Please try again or contact support.';
      }
      
      setError(errorMessage);
      setFormSubmitted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastSaveData) {
      handleEditProfile(lastSaveData);
    }
  };

  const getInitialProfileData = (): Partial<ProfileData> => {
    const profileToUse = currentProfile;
    if (!profileToUse) return {};

    // Parse job_preferences from database if available
    let jobPrefs = {};
    if ((profileToUse as any).job_preferences) {
      try {
        jobPrefs = typeof (profileToUse as any).job_preferences === 'string' ?
          JSON.parse((profileToUse as any).job_preferences) : (profileToUse as any).job_preferences;
      } catch (error) {
        // Handle parse error silently
      }
    }

    return {
      fullName: profileToUse.fullName || '',
      email: profileToUse.email || '',
      phone: profileToUse.phone || '',
      location: profileToUse.location || '',
      currentJobTitle: profileToUse.currentJobTitle || '',
      skills: profileToUse.skills || [],
      expectedSalary: profileToUse.expectedSalary || '',
      currentCTC: profileToUse.currentCTC || '',
      workAuthorization: profileToUse.workAuthorization || '',
      noticePeriod: profileToUse.noticePeriod || '',
      availability: profileToUse.availability || '',
      willingnessToRelocate: profileToUse.willingnessToRelocate || false,
      references: profileToUse.references || '',
      socialLinks: {
        linkedin: profileToUse.linkedin || '',
        github: profileToUse.github || '',
        portfolio: profileToUse.portfolio || '',
        twitter: (profileToUse as any).twitter_url || '',
        dribbble: (profileToUse as any).dribbble_url || '',
        medium: (profileToUse as any).medium_url || ''
      },
      // From job_preferences JSON field
      jobProfile: (jobPrefs as any)?.jobProfile || '',
      employmentType: (jobPrefs as any)?.employmentType || '',
      remoteJobsOnly: (jobPrefs as any)?.remoteJobsOnly || false,
      datePosted: (jobPrefs as any)?.datePosted || '',
      experience: (jobPrefs as any)?.experience || 'Fresher',
      workExperience: (jobPrefs as any)?.workExperience || [{ jobTitle: '', company: '', duration: '' }],
      education: (jobPrefs as any)?.education || [{ degree: '', institution: '', graduationYear: '' }]
    };
  };

  // Show loading state while fetching profile data
  if (isLoading && !formSubmitted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Loading Profile</h3>
          <p className="text-gray-600 dark:text-gray-400">Retrieving your profile data...</p>
        </div>
      </div>
    );
  }

  // Show the profile form directly
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        // This prevents the modal from closing when clicking on the backdrop
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => {
          // This prevents clicks inside the modal from propagating to the backdrop
          e.stopPropagation();
        }}
      >
        <div className="p-6">
          {/* Error Message in Edit Modal */}
          {error && (
            <div className="mb-4 flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-300">
                  Save Failed
                </h4>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  {error}
                </p>
                {lastSaveData && (
                  <div className="mt-2 flex space-x-2">
                    <button
                      onClick={handleRetry}
                      disabled={isLoading}
                      className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded transition-colors"
                    >
                      {isLoading ? 'Retrying...' : 'Retry'}
                    </button>
                    <button
                      onClick={() => setShowDebugInfo(!showDebugInfo)}
                      className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                    >
                      {showDebugInfo ? 'Hide' : 'Show'} Debug Info
                    </button>
                  </div>
                )}
                {showDebugInfo && (
                  <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                    <div><strong>User ID:</strong> {user?.uid || 'Not available'}</div>
                    <div><strong>Database Connected:</strong> {userProfile ? 'Yes' : 'No'}</div>
                    <div><strong>Last Error:</strong> {error}</div>
                    <div><strong>Timestamp:</strong> {new Date().toISOString()}</div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Success Message in Edit Modal */}
          {success && (
            <div className="mb-4 flex items-start space-x-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-800 dark:text-green-300">
                  Profile Saved Successfully
                </h4>
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  {success}
                </p>
              </div>
              <button
                onClick={() => setSuccess(null)}
                className="text-green-400 hover:text-green-600 dark:hover:text-green-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <ProfileForm
            onSubmit={handleEditProfile}
            onCancel={() => {
              setIsClosing(true);
              setIsEditing(false);
              setError(null);
              setSuccess(null);
              setLastSaveData(null);
              onClose();
            }}
            isLoading={isLoading}
            initialData={getInitialProfileData()}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
