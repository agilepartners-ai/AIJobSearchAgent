import React, { useState, useEffect, useRef } from 'react';
import { X, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import ProfileForm, { ProfileData } from '../forms/ProfileFormNew';
import { ProfileService, UserProfileData } from '../../services/profileService';

interface ProfileModalProps {
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { user, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [localUserProfile, setLocalUserProfile] = useState<UserProfileData | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const profile = await ProfileService.getOrCreateProfile(
          user.id,
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

  const handleEditProfile = async (profileData: ProfileData) => {
    if (!user) {
      setError('No user found. Please login again.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData: Partial<UserProfileData> = {
        fullName: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
        location: profileData.location,
        currentJobTitle: profileData.currentJobTitle,
        jobProfile: profileData.jobProfile,
        experience: profileData.experience,
        workExperience: profileData.workExperience,
        education: profileData.education,
        skills: profileData.skills,
        expectedSalary: profileData.expectedSalary,
        currentCTC: profileData.currentCTC,
        employmentType: profileData.employmentType,
        remoteJobsOnly: profileData.remoteJobsOnly,
        datePosted: profileData.datePosted,
        willingnessToRelocate: profileData.willingnessToRelocate,
        workAuthorization: profileData.workAuthorization,
        noticePeriod: profileData.noticePeriod,
        availability: profileData.availability,
        references: profileData.references,
        portfolio: profileData.socialLinks?.portfolio,
        github: profileData.socialLinks?.github,
        linkedin: profileData.socialLinks?.linkedin,
      };

      await ProfileService.updateUserProfile(user.id, updateData);
      const updatedProfile = await ProfileService.getUserProfile(user.id);
      setLocalUserProfile(updatedProfile);
      setSuccess('Profile saved successfully!');
      onClose()
    } catch (error) {
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const getInitialProfileData = (): Partial<ProfileData> => {
    const profileToUse = localUserProfile || userProfile;
    if (!profileToUse) return {};

    const isUserProfileData = (profile: any): profile is UserProfileData => {
      return 'fullName' in profile;
    };

    if (isUserProfileData(profileToUse)) {
      return {
        fullName: profileToUse.fullName || '',
        email: profileToUse.email || '',
        phone: profileToUse.phone || '',
        location: profileToUse.location || '',
        currentJobTitle: profileToUse.currentJobTitle || '',
        jobProfile: profileToUse.jobProfile || '',
        experience: profileToUse.experience || 'Fresher',
        workExperience: profileToUse.workExperience || [{ jobTitle: '', company: '', duration: '' }],
        education: profileToUse.education || [{ degree: '', institution: '', graduationYear: '' }],
        skills: profileToUse.skills || [],
        expectedSalary: profileToUse.expectedSalary || '',
        currentCTC: profileToUse.currentCTC || '',
        employmentType: profileToUse.employmentType || '',
        remoteJobsOnly: profileToUse.remoteJobsOnly || false,
        datePosted: profileToUse.datePosted || '',
        willingnessToRelocate: profileToUse.willingnessToRelocate || false,
        workAuthorization: profileToUse.workAuthorization || '',
        noticePeriod: profileToUse.noticePeriod || '',
        availability: profileToUse.availability || '',
        references: profileToUse.references || '',
        socialLinks: {
          linkedin: profileToUse.linkedin || '',
          github: profileToUse.github || '',
          portfolio: profileToUse.portfolio || '',
        },
      };
    }

    // Fallback for legacy or differently structured profile
    return {
      fullName: (profileToUse as any).full_name || '',
      email: (profileToUse as any).email || '',
      phone: (profileToUse as any).phone || '',
      location: (profileToUse as any).location || '',
      currentJobTitle: (profileToUse as any).current_job_title || '',
      jobProfile: (profileToUse as any).job_profile || '',
      experience: (profileToUse as any).experience || 'Fresher',
      workExperience: (profileToUse as any).work_experience || [{ jobTitle: '', company: '', duration: '' }],
      education: (profileToUse as any).education || [{ degree: '', institution: '', graduationYear: '' }],
      skills: (profileToUse as any).skills || [],
      expectedSalary: (profileToUse as any).expected_salary || '',
      currentCTC: (profileToUse as any).current_ctc || '',
      employmentType: (profileToUse as any).employment_type || '',
      remoteJobsOnly: (profileToUse as any).remote_jobs_only || false,
      datePosted: (profileToUse as any).date_posted || '',
      willingnessToRelocate: (profileToUse as any).willingness_to_relocate || false,
      workAuthorization: (profileToUse as any).work_authorization || '',
      noticePeriod: (profileToUse as any).notice_period || '',
      availability: (profileToUse as any).availability || '',
      references: (profileToUse as any).references || '',
      socialLinks: {
        linkedin: (profileToUse as any).linkedin_url || '',
        github: (profileToUse as any).github_url || '',
        portfolio: (profileToUse as any).portfolio_url || '',
      },
    };
  };


  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div 
        ref={modalRef}
        className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
          aria-label="Close Modal"
        >
          <X className="w-6 h-6" />
        </button>
        {isLoading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-xl text-gray-600 dark:text-gray-400">Loading Profile...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-300">Save Failed</h4>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
                </div>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {success && (
              <div className="mb-4 flex items-start space-x-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-green-800 dark:text-green-300">Success</h4>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">{success}</p>
                </div>
                <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600 dark:hover:text-green-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <ProfileForm
              onSubmit={handleEditProfile}
              onCancel={onClose}
              isLoading={isLoading}
              initialData={getInitialProfileData()}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
