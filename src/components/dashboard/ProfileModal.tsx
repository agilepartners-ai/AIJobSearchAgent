import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Shield, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ProfileService } from '../../services/profileService';

interface Reference {
  fullName: string;
  relationship: string;
  companyName: string;
  jobTitle: string;
  companyAddress: string;
  phoneNumber: string;
  email: string;
}

interface Education {
  degreeType: string;
  universityName: string;
  universityAddress: string;
  major: string;
  minor: string;
  timeframeFrom: string;
  timeframeTo: string;
  gpa: string;
}

interface Certification {
  name: string;
  licenseNumber: string;
  issuingOrganization: string;
  dateAchieved: string;
  expirationDate: string;
}

interface ProfileData {
  fullName: string;
  streetAddress: string;
  city: string;
  county: string;
  state: string;
  zipCode: string;
  contactNumber: string;
  dateOfBirth: string;
  hasPhoneAccess: boolean;
  gender: string;
  ethnicity: string;
  race: string;
  veteranStatus: string;
  travelPercentage: string;
  otherLanguages: string;
  nationality: string;
  additionalNationalities: string;
  openToTravel: boolean;
  willingToRelocate: boolean;
  canWorkEveningsWeekends: boolean;
  authorizedToWork: boolean;
  requiresSponsorship: boolean;
  expectedSalaryFrom: string;
  expectedSalaryTo: string;
  salaryNotes: string;
  references: Reference[];
  education: Education[];
  certifications: Certification[];
  governmentEmployment: boolean;
  hasAgreements: boolean;
  hasConvictions: boolean;
  interviewAvailability: string;
  // Missing fields from UserProfileData
  includeAge: boolean;
  hasDisabilities: boolean;
  disabilityDescription: string;
  hasOtherCitizenship: boolean;
  visaType: string;
  sponsorshipType: string;
  governmentDetails: string;
  agreementDetails: string;
  convictionDetails: string;
}

interface ProfileModalProps {
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState<ProfileData>({
    fullName: '',
    streetAddress: '',
    city: '',
    county: '',
    state: '',
    zipCode: '',
    contactNumber: '',
    dateOfBirth: '',
    hasPhoneAccess: false,
    gender: '',
    ethnicity: '',
    race: '',
    veteranStatus: '',
    travelPercentage: '',
    otherLanguages: '',
    nationality: '',
    additionalNationalities: '',
    openToTravel: false,
    willingToRelocate: false,
    canWorkEveningsWeekends: false,
    authorizedToWork: false,
    requiresSponsorship: false,
    expectedSalaryFrom: '',
    expectedSalaryTo: '',
    salaryNotes: '',
    references: [
      { fullName: '', relationship: '', companyName: '', jobTitle: '', companyAddress: '', phoneNumber: '', email: '' }
    ],
    education: [
      { degreeType: '', universityName: '', universityAddress: '', major: '', minor: '', timeframeFrom: '', timeframeTo: '', gpa: '' }
    ],
    certifications: [
      { name: '', licenseNumber: '', issuingOrganization: '', dateAchieved: '', expirationDate: '' }
    ],
    governmentEmployment: false,
    hasAgreements: false,
    hasConvictions: false,
    interviewAvailability: '',
    // Add missing fields with default values
    includeAge: false,
    hasDisabilities: false,
    disabilityDescription: '',
    hasOtherCitizenship: false,
    visaType: '',
    sponsorshipType: '',
    governmentDetails: '',
    agreementDetails: '',
    convictionDetails: ''
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const profile = await ProfileService.getUserProfile(user.uid);
      if (profile) {
        setFormData(profile);
      }
    } catch (err: any) {
      setError('Failed to load profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Simple form update function exactly like ApplyJobsModal
  const updateForm = (field: keyof ProfileData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateArrayItem = (arrayName: keyof ProfileData, index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: (prev[arrayName] as any[]).map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addArrayItem = (arrayName: keyof ProfileData, newItem: any) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: [...(prev[arrayName] as any[]), newItem]
    }));
  };

  const removeArrayItem = (arrayName: keyof ProfileData, index: number) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: (prev[arrayName] as any[]).filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      
      await ProfileService.saveUserProfile(user.uid, formData);
      setSuccess('Profile saved successfully!');
      
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError('Failed to save profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const yesNoOptions = [
    { value: true, label: 'Yes' },
    { value: false, label: 'No' }
  ];

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ];

  const raceOptions = [
    { value: '', label: 'Select race' },
    { value: 'white', label: 'White' },
    { value: 'black', label: 'Black or African American' },
    { value: 'asian', label: 'Asian' },
    { value: 'native-american', label: 'American Indian or Alaska Native' },
    { value: 'pacific-islander', label: 'Native Hawaiian or Other Pacific Islander' },
    { value: 'two-or-more', label: 'Two or More Races' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <User className="text-blue-600 dark:text-blue-400" size={28} />
                Update Profile
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Complete your professional profile information (all fields are optional)
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Personal Information */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <User size={20} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => updateForm('fullName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.streetAddress}
                  onChange={(e) => updateForm('streetAddress', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter street address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateForm('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter city"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => updateForm('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter state"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Zip Code
                </label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => updateForm('zipCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter zip code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Number
                </label>
                <input
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) => updateForm('contactNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gender
                </label>
                <div className="flex flex-wrap gap-4">
                  {genderOptions.map(option => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value={option.value}
                        checked={formData.gender === option.value}
                        onChange={() => updateForm('gender', option.value)}
                        className="mr-2 text-blue-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Race
                </label>
                <select
                  value={formData.race}
                  onChange={(e) => updateForm('race', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {raceOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Work Authorization */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield size={20} className="text-green-600 dark:text-green-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Work Authorization</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Legally authorized to work in the USA?
                </label>
                <div className="flex flex-wrap gap-4">
                  {yesNoOptions.map(option => (
                    <label key={String(option.value)} className="flex items-center">
                      <input
                        type="radio"
                        name="authorizedToWork"
                        value={String(option.value)}
                        checked={formData.authorizedToWork === option.value}
                        onChange={() => updateForm('authorizedToWork', option.value)}
                        className="mr-2 text-blue-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Require sponsorship for employment eligibility?
                </label>
                <div className="flex flex-wrap gap-4">
                  {yesNoOptions.map(option => (
                    <label key={String(option.value)} className="flex items-center">
                      <input
                        type="radio"
                        name="requiresSponsorship"
                        value={String(option.value)}
                        checked={formData.requiresSponsorship === option.value}
                        onChange={() => updateForm('requiresSponsorship', option.value)}
                        className="mr-2 text-blue-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Salary Expectations */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Calendar size={20} className="text-purple-600 dark:text-purple-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Salary Expectations</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expected Salary From (USD)
                </label>
                <input
                  type="number"
                  value={formData.expectedSalaryFrom}
                  onChange={(e) => updateForm('expectedSalaryFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="200000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expected Salary To (USD)
                </label>
                <input
                  type="number"
                  value={formData.expectedSalaryTo}
                  onChange={(e) => updateForm('expectedSalaryTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="350000"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Notes for Salary Negotiations
              </label>
              <textarea
                value={formData.salaryNotes}
                onChange={(e) => updateForm('salaryNotes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Negotiable based on future career growth..."
                rows={3}
              />
            </div>
          </div>

          {/* References */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Users size={20} className="text-orange-600 dark:text-orange-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Professional References</h3>
            </div>

            {formData.references.map((ref, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Reference {index + 1}</h4>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('references', index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={ref.fullName}
                      onChange={(e) => updateArrayItem('references', index, 'fullName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={ref.email}
                      onChange={(e) => updateArrayItem('references', index, 'email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter email address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={ref.phoneNumber}
                      onChange={(e) => updateArrayItem('references', index, 'phoneNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={ref.companyName}
                      onChange={(e) => updateArrayItem('references', index, 'companyName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter company name"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addArrayItem('references', { 
                fullName: '', relationship: '', companyName: '', jobTitle: '', 
                companyAddress: '', phoneNumber: '', email: '' 
              })}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              + Add Another Reference
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-6 rounded-lg font-medium transition-all disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
