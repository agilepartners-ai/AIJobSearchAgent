import React, { useState, useRef } from 'react';
import { User, MapPin, Briefcase, ChevronDown, Camera, X, Phone, Mail, Globe, DollarSign, Clock, Shield, UserCheck, ExternalLink } from 'lucide-react';
import { JobSearchService } from '../../services/jobSearchService';

export interface WorkExperience {
  jobTitle: string;
  company: string;
  duration: string;
}

export interface Education {
  degree: string;
  institution: string;
  graduationYear: string;
}

export interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  github?: string;
  dribbble?: string;
  medium?: string;
  portfolio?: string;
}

export interface ProfileData {
  // Basic Information
  fullName: string;
  email: string;
  phone: string;
  location: string; // City, State, Country
  
  // Job Information
  currentJobTitle: string;
  jobProfile: string; // From job search page
  experience: 'Fresher' | 'Experienced'; // From job search page
  workExperience: WorkExperience[];
  
  // Education
  education: Education[];
  
  // Skills and Preferences
  skills: string[];
  expectedSalary: string;
  currentCTC: string;
  
  // Job Search Preferences (from job search page)
  employmentType: string;
  remoteJobsOnly: boolean;
  datePosted: string;
  
  // Work Authorization
  willingnessToRelocate: boolean;
  workAuthorization: string;
  noticePeriod: string;
  availability: string;
  
  // References and Social Links
  references: string;
  socialLinks: SocialLinks;
  
  // Profile Picture
  profilePicture?: string;
}

interface ProfileFormProps {
  onSubmit: (data: ProfileData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<ProfileData>;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  initialData = {} 
}) => {
  const [formData, setFormData] = useState<ProfileData>({
    jobProfile: initialData.jobProfile || '',
    experience: initialData.experience || 'Fresher',
    location: initialData.location || '',
    profilePicture: initialData.profilePicture || ''
  });

  const [errors, setErrors] = useState<Partial<ProfileData>>({});
  const [isUploadingProfilePic, setIsUploadingProfilePic] = useState(false);
  const [profilePicPreview, setProfilePicPreview] = useState<string>(initialData.profilePicture || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const jobProfiles = JobSearchService.getCommonJobProfiles();
  const locations = JobSearchService.getPopularLocations();

  const validateForm = (): boolean => {
    const newErrors: Partial<ProfileData> = {};

    if (!formData.jobProfile.trim()) {
      newErrors.jobProfile = 'Job profile is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };
  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleProfilePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, profilePicture: 'Please select an image file.' }));
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setErrors(prev => ({ ...prev, profilePicture: 'File size must be less than 5MB.' }));
      return;
    }

    // Clear any previous errors
    setErrors(prev => ({ ...prev, profilePicture: undefined }));

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfilePicPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file (for demo purposes, we'll just simulate upload)
    setIsUploadingProfilePic(true);
    try {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would upload to a file storage service
      const simulatedURL = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, profilePicture: simulatedURL }));
    } catch (error) {
      console.error('Upload failed:', error);
      setErrors(prev => ({ ...prev, profilePicture: 'Failed to upload profile picture' }));
      setProfilePicPreview(''); // Reset preview on error
    } finally {
      setIsUploadingProfilePic(false);
    }
  };

  const removeProfilePicture = () => {
    setFormData(prev => ({ ...prev, profilePicture: '' }));
    setProfilePicPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Profile</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Tell us about your job preferences to find the best opportunities
        </p>
      </div>

      {/* Profile Picture Section */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border-4 border-white dark:border-gray-600 shadow-lg">
            {profilePicPreview ? (
              <img 
                src={profilePicPreview} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="h-10 w-10 text-gray-400" />
              </div>
            )}
          </div>
          
          {profilePicPreview && (
            <button
              type="button"
              onClick={removeProfilePicture}
              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg transition-colors"
              disabled={isLoading || isUploadingProfilePic}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleProfilePictureChange}
            className="hidden"
            disabled={isLoading || isUploadingProfilePic}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploadingProfilePic}
            className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploadingProfilePic ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                {profilePicPreview ? 'Change Photo' : 'Add Photo'}
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            JPEG, PNG, WebP up to 5MB
          </p>
          {errors.profilePicture && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.profilePicture}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Job Profile */}
        <div>
          <label htmlFor="jobProfile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Briefcase className="h-4 w-4 inline mr-2" />
            Job Profile / Role
          </label>
          <div className="relative">
            <input
              type="text"
              id="jobProfile"
              list="jobProfiles"
              value={formData.jobProfile}
              onChange={(e) => handleInputChange('jobProfile', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.jobProfile ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Software Developer, Data Scientist, Product Manager"
              disabled={isLoading}
            />
            <datalist id="jobProfiles">
              {jobProfiles.map((profile) => (
                <option key={profile} value={profile} />
              ))}
            </datalist>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {errors.jobProfile && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.jobProfile}</p>
          )}
        </div>

        {/* Experience Level */}
        <div>
          <label htmlFor="experience" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Experience Level
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="relative">
              <input
                type="radio"
                name="experience"
                value="Fresher"
                checked={formData.experience === 'Fresher'}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                className="sr-only"
                disabled={isLoading}
              />
              <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                formData.experience === 'Fresher'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}>
                <div className="text-center">
                  <div className="text-lg font-medium text-gray-900 dark:text-white">Fresher</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">0-2 years experience</div>
                </div>
              </div>
            </label>

            <label className="relative">
              <input
                type="radio"
                name="experience"
                value="Experienced"
                checked={formData.experience === 'Experienced'}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                className="sr-only"
                disabled={isLoading}
              />
              <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                formData.experience === 'Experienced'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}>
                <div className="text-center">
                  <div className="text-lg font-medium text-gray-900 dark:text-white">Experienced</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">2+ years experience</div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <MapPin className="h-4 w-4 inline mr-2" />
            Preferred Location
          </label>
          <div className="relative">
            <input
              type="text"
              id="location"
              list="locations"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.location ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., New York, NY or Remote"
              disabled={isLoading}
            />
            <datalist id="locations">
              {locations.map((location) => (
                <option key={location} value={location} />
              ))}
            </datalist>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {errors.location && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.location}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Searching...
              </div>
            ) : (
              'Find Jobs'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileForm;
