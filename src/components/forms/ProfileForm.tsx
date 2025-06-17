import React, { useState } from 'react';
import { User, MapPin, Briefcase, ChevronDown } from 'lucide-react';
import { JobSearchService } from '../../services/jobSearchService';

export interface ProfileData {
  jobProfile: string;
  experience: 'Fresher' | 'Experienced';
  location: string;
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
    location: initialData.location || ''
  });

  const [errors, setErrors] = useState<Partial<ProfileData>>({});

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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Profile</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Tell us about your job preferences to find the best opportunities
        </p>
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
