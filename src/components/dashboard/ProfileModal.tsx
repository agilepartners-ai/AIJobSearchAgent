import React, { useState, useEffect, useRef } from 'react';
import { X, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import ProfileForm, { ProfileData } from '../forms/ProfileFormNew';
import { SupabaseProfileService } from '../../services/profileService';
import { supabase } from '../../lib/supabase';

interface ProfileModalProps {
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { user, userProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(true); // Start in editing mode immediately
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
        const profile = await SupabaseProfileService.getOrCreateProfile(
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
      // First, let's verify the Supabase connection and authentication
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw new Error(`Authentication failed: ${authError.message}`);
      }
      
      if (!authUser.user) {
        throw new Error('No authenticated user found');
      }
      
      const currentProfile = await SupabaseProfileService.getOrCreateProfile(
        user.uid, 
        authUser.user.email || '', 
        profileData.fullName?.trim() || 'New User'
      );
      
      // Prepare update data with all profile fields for database
      const updateData = {
        full_name: profileData.fullName?.trim(),
        phone: profileData.phone?.trim() || null,
        location: profileData.location?.trim() || null,
        current_job_title: profileData.currentJobTitle?.trim() || null,
        years_of_experience: profileData.experience === 'Fresher' ? 0 : 2,
        skills: Array.isArray(profileData.skills) ? profileData.skills.filter(s => s?.trim()) : [],
        linkedin_url: profileData.socialLinks?.linkedin?.trim() || null,
        github_url: profileData.socialLinks?.github?.trim() || null,
        portfolio_url: profileData.socialLinks?.portfolio?.trim() || null,
        bio: profileData.currentJobTitle || null,
        expected_salary: profileData.expectedSalary?.trim() || null,
        current_ctc: profileData.currentCTC?.trim() || null,
        work_authorization: profileData.workAuthorization?.trim() || null,
        notice_period: profileData.noticePeriod?.trim() || null,
        availability: profileData.availability?.trim() || null,
        willingness_to_relocate: profileData.willingnessToRelocate || false,
        twitter_url: profileData.socialLinks?.twitter?.trim() || null,
        dribbble_url: profileData.socialLinks?.dribbble?.trim() || null,
        medium_url: profileData.socialLinks?.medium?.trim() || null,
        reference_contacts: profileData.references?.trim() || null,
        job_preferences: {
          jobProfile: profileData.jobProfile || '',
          employmentType: profileData.employmentType || '',
          remoteJobsOnly: profileData.remoteJobsOnly || false,
          datePosted: profileData.datePosted || '',
          experience: profileData.experience || 'Fresher',
          workExperience: profileData.workExperience || [],
          education: profileData.education || []
        }
      };

      // Attempt profile update
      const updateResult = await SupabaseProfileService.updateProfile(user.uid, updateData);
      
      // Verify the update actually happened
      const verifyResult = await SupabaseProfileService.getUserProfile(user.uid);
      
      if (!verifyResult || verifyResult.full_name !== updateData.full_name) {
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
        // Handle Supabase errors
        const supabaseError = error as any;
        if (supabaseError.code) {
          switch (supabaseError.code) {
            case 'PGRST116':
              errorMessage = 'Database error: Profile not found. Please try logging out and back in.';
              break;
            case '23505':
              errorMessage = 'Database error: Duplicate entry detected. Please check your input values.';
              break;
            case '42501':
              errorMessage = 'Permission error: You do not have permission to update this profile.';
              break;
            case '08006':
              errorMessage = 'Database connection error: Please check your internet connection and try again.';
              break;
            default:
              errorMessage = `Database error: ${supabaseError.message || 'Unknown database error'}`;
          }
        } else if (supabaseError.message) {
          errorMessage += supabaseError.message;
        } else {
          errorMessage = 'Unknown database error occurred. Please try again.';
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
    if (profileToUse.job_preferences) {
      try {
        jobPrefs = typeof profileToUse.job_preferences === 'string' ? 
          JSON.parse(profileToUse.job_preferences) : profileToUse.job_preferences;
      } catch (error) {
        // Handle parse error silently
      }
    }

    return {
      fullName: profileToUse.full_name || '',
      email: profileToUse.email || '',
      phone: profileToUse.phone || '',
      location: profileToUse.location || '',
      currentJobTitle: profileToUse.current_job_title || '',
      skills: profileToUse.skills || [],
      expectedSalary: profileToUse.expected_salary || '',
      currentCTC: profileToUse.current_ctc || '',
      workAuthorization: profileToUse.work_authorization || '',
      noticePeriod: profileToUse.notice_period || '',
      availability: profileToUse.availability || '',
      willingnessToRelocate: profileToUse.willingness_to_relocate || false,
      references: profileToUse.reference_contacts || '',
      socialLinks: {
        linkedin: profileToUse.linkedin_url || '',
        github: profileToUse.github_url || '',
        portfolio: profileToUse.portfolio_url || '',
        twitter: profileToUse.twitter_url || '',
        dribbble: profileToUse.dribbble_url || '',
        medium: profileToUse.medium_url || ''
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