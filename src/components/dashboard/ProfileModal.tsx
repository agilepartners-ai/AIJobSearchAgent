import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Shield, GraduationCap, Award, Users, Briefcase } from 'lucide-react';
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

interface ProfileModalProps {
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Use a single state object and update it immutably
  const [formData, setFormData] = useState({
    // Personal Information
    fullName: '',
    streetAddress: '',
    city: '',
    county: '',
    state: '',
    zipCode: '',
    contactNumber: '',
    hasPhoneAccess: true,
    gender: '',
    dateOfBirth: '',
    includeAge: false,
    ethnicity: '',
    race: '',
    hasDisabilities: false,
    disabilityDescription: '',
    veteranStatus: '',
    travelPercentage: '',
    openToTravel: true,
    willingToRelocate: true,
    canWorkEveningsWeekends: true,
    otherLanguages: '',
    nationality: '',
    additionalNationalities: '',
    hasOtherCitizenship: false,
    visaType: '',
    expectedSalaryFrom: '',
    expectedSalaryTo: '',
    salaryNotes: '',
    
    // Professional Information
    authorizedToWork: true,
    requiresSponsorship: false,
    sponsorshipType: '',
    
    // References (3 required)
    references: [
      { fullName: '', relationship: '', companyName: '', jobTitle: '', companyAddress: '', phoneNumber: '', email: '' },
      { fullName: '', relationship: '', companyName: '', jobTitle: '', companyAddress: '', phoneNumber: '', email: '' },
      { fullName: '', relationship: '', companyName: '', jobTitle: '', companyAddress: '', phoneNumber: '', email: '' }
    ] as Reference[],
    
    // Education (multiple entries)
    education: [
      { degreeType: '', universityName: '', universityAddress: '', major: '', minor: '', timeframeFrom: '', timeframeTo: '', gpa: '' }
    ] as Education[],
    
    // Certifications
    certifications: [
      { name: '', licenseNumber: '', issuingOrganization: '', dateAchieved: '', expirationDate: '' }
    ] as Certification[],
    
    // Additional Questions
    governmentEmployment: false,
    governmentDetails: '',
    hasAgreements: false,
    agreementDetails: '',
    hasConvictions: false,
    convictionDetails: '',
    interviewAvailability: ''
  });

  useEffect(() => {
    loadProfile();
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
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await ProfileService.saveUserProfile(user.uid, formData);
      setSuccess('Profile updated successfully!');
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };
  // Simple update functions like ApplyJobsModal
  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateArrayField = (arrayName: string, index: number, field: string, value: string) => {
    setFormData(prev => {
      const arrayKey = arrayName as keyof typeof prev;
      const currentArray = prev[arrayKey];
      
      if (Array.isArray(currentArray)) {
        return {
          ...prev,
          [arrayName]: currentArray.map((item: any, i: number) => 
            i === index ? { ...item, [field]: value } : item
          )
        };
      }
      return prev;
    });
  };

  const addArrayItem = (arrayName: string, emptyItem: any) => {
    setFormData(prev => {
      const arrayKey = arrayName as keyof typeof prev;
      const currentArray = prev[arrayKey];
      
      if (Array.isArray(currentArray)) {
        return {
          ...prev,
          [arrayName]: [...currentArray, emptyItem]
        };
      }
      return prev;
    });
  };

  const removeArrayItem = (arrayName: string, index: number) => {
    setFormData(prev => {
      const arrayKey = arrayName as keyof typeof prev;
      const currentArray = prev[arrayKey];
      
      if (Array.isArray(currentArray)) {
        return {
          ...prev,
          [arrayName]: currentArray.filter((_: any, i: number) => i !== index)
        };
      }
      return prev;
    });  };

  // Simple options arrays like ApplyJobsModal
  const raceOptions = [
    { value: 'american-indian', label: 'American Indian or Alaska Native' },
    { value: 'asian', label: 'Asian (East / South)' },
    { value: 'pacific-islander', label: 'Native Hawaiian or Other Pacific Islander' },
    { value: 'black', label: 'Black or African American' },
    { value: 'white', label: 'White' },
    { value: 'two-or-more', label: 'Two or more races' }
  ];

  const veteranOptions = [
    { value: 'not-veteran', label: 'I am not a veteran' },
    { value: 'not-protected', label: 'I am not a protected veteran' },
    { value: 'protected', label: 'I identify as one or more classifications of a protected veteran' },
    { value: 'no-answer', label: 'I do not wish to answer' }
  ];

  const travelOptions = [
    { value: '0-10', label: '0 < 10%' },
    { value: '0-25', label: '0 < 25%' },
    { value: '0-50', label: '0 < 50%' },
    { value: '0-75', label: '0 < 75%' },
    { value: '100', label: '100%' }
  ];

  const yesNoOptions = [
    { value: true, label: 'Yes' },
    { value: false, label: 'No' }
  ];

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ];

  const ethnicityOptions = [
    { value: 'hispanic', label: 'Hispanic or Latino' },
    { value: 'not-hispanic', label: 'Not Hispanic or Latino' }  ];

  // Simple components like ApplyJobsModal
  const FormSection = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );

  const FormGrid = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  );

  const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      {children}
    </div>
  );

  const Input = ({ 
    value, 
    onChange, 
    placeholder, 
    type = 'text' 
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    placeholder?: string; 
    type?: string;
  }) => (
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
    />
  );

  const TextArea = ({ 
    value, 
    onChange, 
    placeholder, 
    rows = 3 
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    placeholder?: string; 
    rows?: number;
  }) => (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-vertical"
    />
  );

  const Select = ({ 
    value, 
    onChange, 
    options, 
    placeholder 
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    options: Array<{ value: string; label: string }>; 
    placeholder?: string;
  }) => (    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
  const RadioGroup = ({ 
    value, 
    onChange, 
    options, 
    name 
  }: {
    value: string | boolean;
    onChange: (value: any) => void;
    options: Array<{ value: any; label: string }>;
    name: string;
  }) => (
    <div className="flex flex-wrap gap-4">
      {options.map(option => (
        <label key={String(option.value)} className="flex items-center">
          <input
            type="radio"
            name={name}
            value={String(option.value)}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="mr-2 text-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
        </label>
      ))}
    </div>
  );

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
          <FormSection title="Personal Information" icon={<User size={20} />}>
            <FormGrid>
              <FormField label="Full Name">
                <Input
                  value={formData.fullName}
                  onChange={(value) => updateField('fullName', value)}
                  placeholder="Enter your full name"
                />
              </FormField>
              <FormField label="Street Address">
                <Input
                  value={formData.streetAddress}
                  onChange={(value) => updateField('streetAddress', value)}
                  placeholder="Enter street address"
                />
              </FormField>
              <FormField label="City">
                <Input
                  value={formData.city}
                  onChange={(value) => updateField('city', value)}
                  placeholder="Enter city"
                />
              </FormField>
              <FormField label="County">
                <Input
                  value={formData.county}
                  onChange={(value) => updateField('county', value)}
                  placeholder="Enter county"
                />
              </FormField>
              <FormField label="State">
                <Input
                  value={formData.state}
                  onChange={(value) => updateField('state', value)}
                  placeholder="Enter state"
                />
              </FormField>
              <FormField label="Zip Code">
                <Input
                  value={formData.zipCode}
                  onChange={(value) => updateField('zipCode', value)}
                  placeholder="Enter zip code"
                />
              </FormField>
              <FormField label="24/7 Contact Number">
                <Input
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(value) => updateField('contactNumber', value)}
                  placeholder="Enter phone number"
                />
              </FormField>
              <FormField label="Date of Birth">
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(value) => updateField('dateOfBirth', value)}
                />
              </FormField>
            </FormGrid>

            <div className="mt-4 space-y-4">
              <FormField label="Do you have telephone accessibility 24 hours a day?">
                <RadioGroup
                  value={formData.hasPhoneAccess}
                  onChange={(value) => updateField('hasPhoneAccess', value)}
                  options={yesNoOptions}
                  name="hasPhoneAccess"
                />
              </FormField>

              <FormField label="Gender">
                <RadioGroup
                  value={formData.gender}
                  onChange={(value) => updateField('gender', value)}
                  options={genderOptions}
                  name="gender"
                />
              </FormField>

              <FormField label="Ethnicity">
                <RadioGroup
                  value={formData.ethnicity}
                  onChange={(value) => updateField('ethnicity', value)}
                  options={ethnicityOptions}
                  name="ethnicity"
                />
              </FormField>

              <FormField label="Race">
                <Select
                  value={formData.race}
                  onChange={(value) => updateField('race', value)}
                  placeholder="Select race"
                  options={raceOptions}
                />
              </FormField>

              <FormField label="Veteran Status">
                <Select
                  value={formData.veteranStatus}
                  onChange={(value) => updateField('veteranStatus', value)}
                  placeholder="Select veteran status"
                  options={veteranOptions}
                />
              </FormField>
            </div>
          </FormSection>

          {/* Work Preferences */}
          <FormSection title="Work Preferences" icon={<Briefcase size={20} />}>
            <FormGrid>
              <FormField label="Travel Percentage">
                <Select
                  value={formData.travelPercentage}
                  onChange={(value) => updateField('travelPercentage', value)}
                  placeholder="Select travel percentage"
                  options={travelOptions}
                />
              </FormField>
              <FormField label="Other Languages">
                <Input
                  value={formData.otherLanguages}
                  onChange={(value) => updateField('otherLanguages', value)}
                  placeholder="e.g., Hindi, Spanish"
                />
              </FormField>
              <FormField label="Nationality">
                <Input
                  value={formData.nationality}
                  onChange={(value) => updateField('nationality', value)}
                  placeholder="e.g., US Citizen"
                />
              </FormField>
              <FormField label="Additional Nationalities">
                <Input
                  value={formData.additionalNationalities}
                  onChange={(value) => updateField('additionalNationalities', value)}
                  placeholder="e.g., Canadian Citizen, Indian OCI"
                />
              </FormField>
            </FormGrid>

            <div className="mt-4 space-y-4">
              <FormField label="Open to Travel?">
                <RadioGroup
                  value={formData.openToTravel}
                  onChange={(value) => updateField('openToTravel', value)}
                  options={yesNoOptions}
                  name="openToTravel"
                />
              </FormField>

              <FormField label="Willing to Relocate?">
                <RadioGroup
                  value={formData.willingToRelocate}
                  onChange={(value) => updateField('willingToRelocate', value)}
                  options={yesNoOptions}
                  name="willingToRelocate"
                />
              </FormField>

              <FormField label="Can work evenings, weekends?">
                <RadioGroup
                  value={formData.canWorkEveningsWeekends}
                  onChange={(value) => updateField('canWorkEveningsWeekends', value)}
                  options={yesNoOptions}
                  name="canWorkEveningsWeekends"
                />
              </FormField>

              <FormField label="Legally authorized to work in the USA?">
                <RadioGroup
                  value={formData.authorizedToWork}
                  onChange={(value) => updateField('authorizedToWork', value)}
                  options={yesNoOptions}
                  name="authorizedToWork"
                />
              </FormField>

              <FormField label="Require sponsorship for employment eligibility?">
                <RadioGroup
                  value={formData.requiresSponsorship}
                  onChange={(value) => updateField('requiresSponsorship', value)}
                  options={yesNoOptions}
                  name="requiresSponsorship"
                />
              </FormField>
            </div>
          </FormSection>

          {/* Salary Expectations */}
          <FormSection title="Salary Expectations" icon={<Calendar size={20} />}>
            <FormGrid>
              <FormField label="Expected Salary From (USD)">
                <Input
                  type="number"
                  value={formData.expectedSalaryFrom}
                  onChange={(value) => updateField('expectedSalaryFrom', value)}
                  placeholder="200000"
                />
              </FormField>
              <FormField label="Expected Salary To (USD)">
                <Input
                  type="number"
                  value={formData.expectedSalaryTo}
                  onChange={(value) => updateField('expectedSalaryTo', value)}
                  placeholder="350000"
                />
              </FormField>
            </FormGrid>
            <div className="mt-4">
              <FormField label="Additional Notes for Salary Negotiations">
                <TextArea
                  value={formData.salaryNotes}
                  onChange={(value) => updateField('salaryNotes', value)}
                  placeholder="Negotiable based on future career growth..."
                />
              </FormField>
            </div>
          </FormSection>

          {/* Professional References */}
          <FormSection title="Professional References" icon={<Users size={20} />}>
            {formData.references.map((ref, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Reference {index + 1}</h4>
                <FormGrid>                  <FormField label="Full Name">
                    <Input
                      value={ref.fullName}
                      onChange={(value) => updateArrayField('references', index, 'fullName', value)}
                      placeholder="Enter full name"
                    />
                  </FormField>
                  <FormField label="Relationship">
                    <Input
                      value={ref.relationship}
                      onChange={(value) => updateArrayField('references', index, 'relationship', value)}
                      placeholder="e.g., Reported to Me"
                    />
                  </FormField>
                  <FormField label="Company Name">
                    <Input
                      value={ref.companyName}
                      onChange={(value) => updateArrayField('references', index, 'companyName', value)}
                      placeholder="Enter company name"
                    />
                  </FormField>
                  <FormField label="Job Title">
                    <Input
                      value={ref.jobTitle}
                      onChange={(value) => updateArrayField('references', index, 'jobTitle', value)}
                      placeholder="Enter job title"
                    />
                  </FormField>
                  <FormField label="Company Address">
                    <Input
                      value={ref.companyAddress}
                      onChange={(value) => updateArrayField('references', index, 'companyAddress', value)}
                      placeholder="Enter company address"
                    />
                  </FormField>
                  <FormField label="Phone Number">
                    <Input
                      type="tel"
                      value={ref.phoneNumber}
                      onChange={(value) => updateArrayField('references', index, 'phoneNumber', value)}
                      placeholder="Enter phone number"
                    />
                  </FormField>
                  <FormField label="Email">
                    <Input
                      type="email"
                      value={ref.email}
                      onChange={(value) => updateArrayField('references', index, 'email', value)}
                      placeholder="Enter email address"
                    />
                  </FormField>
                </FormGrid>
              </div>
            ))}
          </FormSection>

          {/* Education */}
          <FormSection title="Education" icon={<GraduationCap size={20} />}>
            {formData.education.map((edu, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Education {index + 1}</h4>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('education', index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <FormGrid>                  <FormField label="Degree Type">
                    <Input
                      value={edu.degreeType}
                      onChange={(value) => updateArrayField('education', index, 'degreeType', value)}
                      placeholder="e.g., MBA, Bachelor's"
                    />
                  </FormField>
                  <FormField label="University Name">
                    <Input
                      value={edu.universityName}
                      onChange={(value) => updateArrayField('education', index, 'universityName', value)}
                      placeholder="Enter university name"
                    />
                  </FormField>
                  <FormField label="Major">
                    <Input
                      value={edu.major}
                      onChange={(value) => updateArrayField('education', index, 'major', value)}
                      placeholder="Enter major"
                    />
                  </FormField>
                  <FormField label="Minor">
                    <Input
                      value={edu.minor}
                      onChange={(value) => updateArrayField('education', index, 'minor', value)}
                      placeholder="Enter minor"
                    />
                  </FormField>
                  <FormField label="From (MM/YYYY)">
                    <Input
                      value={edu.timeframeFrom}
                      onChange={(value) => updateArrayField('education', index, 'timeframeFrom', value)}
                      placeholder="09/2018"
                    />
                  </FormField>
                  <FormField label="To (MM/YYYY)">
                    <Input
                      value={edu.timeframeTo}
                      onChange={(value) => updateArrayField('education', index, 'timeframeTo', value)}
                      placeholder="05/2022"
                    />
                  </FormField>
                  <FormField label="GPA">
                    <Input
                      value={edu.gpa}
                      onChange={(value) => updateArrayField('education', index, 'gpa', value)}
                      placeholder="3.8"
                    />
                  </FormField>
                </FormGrid>
                <div className="mt-4">
                  <FormField label="University Address">
                    <TextArea
                      value={edu.universityAddress}
                      onChange={(value) => updateArrayField('education', index, 'universityAddress', value)}
                      placeholder="Enter university address"
                      rows={2}
                    />
                  </FormField>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('education', { degreeType: '', universityName: '', universityAddress: '', major: '', minor: '', timeframeFrom: '', timeframeTo: '', gpa: '' })}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              + Add Another Education
            </button>
          </FormSection>

          {/* Certifications */}
          <FormSection title="Licenses and Certifications" icon={<Award size={20} />}>
            {formData.certifications.map((cert, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Certification {index + 1}</h4>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('certifications', index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <FormGrid>                  <FormField label="Certification Name">
                    <Input
                      value={cert.name}
                      onChange={(value) => updateArrayField('certifications', index, 'name', value)}
                      placeholder="e.g., CISSP, PMP"
                    />
                  </FormField>
                  <FormField label="License Number">
                    <Input
                      value={cert.licenseNumber}
                      onChange={(value) => updateArrayField('certifications', index, 'licenseNumber', value)}
                      placeholder="Enter license number"
                    />
                  </FormField>
                  <FormField label="Issuing Organization">
                    <Input
                      value={cert.issuingOrganization}
                      onChange={(value) => updateArrayField('certifications', index, 'issuingOrganization', value)}
                      placeholder="e.g., ISC2, PMI"
                    />
                  </FormField>
                  <FormField label="Date Achieved">
                    <Input
                      value={cert.dateAchieved}
                      onChange={(value) => updateArrayField('certifications', index, 'dateAchieved', value)}
                      placeholder="MM/DD/YYYY"
                    />
                  </FormField>
                  <FormField label="Expiration Date">
                    <Input
                      value={cert.expirationDate}
                      onChange={(value) => updateArrayField('certifications', index, 'expirationDate', value)}
                      placeholder="MM/DD/YYYY"
                    />
                  </FormField>
                </FormGrid>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('certifications', { name: '', licenseNumber: '', issuingOrganization: '', dateAchieved: '', expirationDate: '' })}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              + Add Another Certification
            </button>
          </FormSection>

          {/* Additional Questions */}
          <FormSection title="Additional Information" icon={<Shield size={20} />}>
            <div className="space-y-4">
              <FormField label="Within the last three years, have you been employed by a government entity in the USA?">
                <RadioGroup
                  value={formData.governmentEmployment}
                  onChange={(value) => updateField('governmentEmployment', value)}
                  options={yesNoOptions}
                  name="governmentEmployment"
                />
              </FormField>

              <FormField label="Are you subject to any agreement or covenant not to compete?">
                <RadioGroup
                  value={formData.hasAgreements}
                  onChange={(value) => updateField('hasAgreements', value)}
                  options={yesNoOptions}
                  name="hasAgreements"
                />
              </FormField>

              <FormField label="Have you ever been convicted of a felony or misdemeanor?">
                <RadioGroup
                  value={formData.hasConvictions}
                  onChange={(value) => updateField('hasConvictions', value)}
                  options={yesNoOptions}
                  name="hasConvictions"
                />
              </FormField>

              <FormField label="Interview Availability (2-3 dates and time ranges)">
                <TextArea
                  value={formData.interviewAvailability}
                  onChange={(value) => updateField('interviewAvailability', value)}
                  placeholder="Put Friday First Choice then Monday&#10;Fridays, Mondays, Evenings, Weekends"
                  rows={3}
                />
              </FormField>
            </div>
          </FormSection>

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