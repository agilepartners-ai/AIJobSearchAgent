import React, { useState, useEffect } from 'react';
import { 
  User, MapPin, Briefcase, ChevronDown, X, Phone, Mail, 
  Globe, DollarSign, Clock, Shield, UserCheck, ExternalLink,
  Plus, Trash2, GraduationCap, Building
} from 'lucide-react';
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
    // Basic Information
    fullName: initialData.fullName || '',
    email: initialData.email || '',
    phone: initialData.phone || '',
    location: initialData.location || '',
    
    // Job Information
    currentJobTitle: initialData.currentJobTitle || '',
    jobProfile: initialData.jobProfile || '',
    experience: initialData.experience || 'Fresher',
    workExperience: initialData.workExperience || [{ jobTitle: '', company: '', duration: '' }],
    
    // Education
    education: initialData.education || [{ degree: '', institution: '', graduationYear: '' }],
    
    // Skills and Preferences
    skills: initialData.skills || [],
    expectedSalary: initialData.expectedSalary || '',
    currentCTC: initialData.currentCTC || '',
    
    // Job Search Preferences
    employmentType: initialData.employmentType || '',
    remoteJobsOnly: initialData.remoteJobsOnly || false,
    datePosted: initialData.datePosted || '',
    
    // Work Authorization
    willingnessToRelocate: initialData.willingnessToRelocate || false,
    workAuthorization: initialData.workAuthorization || '',
    noticePeriod: initialData.noticePeriod || '',
    availability: initialData.availability || '',
    
    // References and Social Links
    references: initialData.references || '',
    socialLinks: initialData.socialLinks || {}
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [skillInput, setSkillInput] = useState('');
  const [currentSection, setCurrentSection] = useState(0);

  // Load job search criteria from localStorage if available
  useEffect(() => {
    const jobSearchCriteria = localStorage.getItem('jobSearchCriteria');
    if (jobSearchCriteria) {
      try {
        const criteria = JSON.parse(jobSearchCriteria);
        setFormData(prev => ({
          ...prev,
          jobProfile: criteria.query || prev.jobProfile,
          location: criteria.location || prev.location,
          employmentType: criteria.employment_type || prev.employmentType,
          remoteJobsOnly: criteria.remote_jobs_only || prev.remoteJobsOnly,
          datePosted: criteria.date_posted || prev.datePosted,
          experience: criteria.experience === 'entry_level' ? 'Fresher' : 
                     criteria.experience ? 'Experienced' : prev.experience
        }));
      } catch (error) {
        console.error('Error parsing job search criteria:', error);
      }
    }
  }, []);

  const jobProfiles = JobSearchService.getCommonJobProfiles();
  const locations = JobSearchService.getPopularLocations();

  const sections = [
    'Basic Information',
    'Job Information',
    'Education',
    'Skills & Salary',
    'Work Authorization',
    'References & Social'
  ];

  const validateForm = (): boolean => {
    console.log('🔍 Starting validation...');
    const newErrors: Record<string, string> = {};

    // Basic validations
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
      console.log('❌ fullName validation failed:', formData.fullName);
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      console.log('❌ email validation failed:', formData.email);
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
      console.log('❌ location validation failed:', formData.location);
    }
    // Make currentJobTitle optional by commenting out this validation
    // if (!formData.currentJobTitle.trim()) {
    //   newErrors.currentJobTitle = 'Current job title is required';
    //   console.log('❌ currentJobTitle validation failed:', formData.currentJobTitle);
    // }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      console.log('❌ email format validation failed:', formData.email);
    }

    console.log('🔍 Validation complete. Errors found:', newErrors);
    console.log('🔍 Validation result:', Object.keys(newErrors).length === 0 ? 'PASSED' : 'FAILED');
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    console.log('🔥 FORM SUBMIT TRIGGERED!');
    console.log('🔥 Event:', e);
    console.log('🔥 Form data being submitted:', formData);
    console.log('🔥 Submit timestamp:', new Date().toISOString());
    
    e.preventDefault();
    
    console.log('🔥 Running form validation...');
    if (validateForm()) {
      console.log('🔥 Validation passed! Calling onSubmit...');
      console.log('🔥 onSubmit function:', onSubmit);
      onSubmit(formData);
      console.log('🔥 onSubmit called successfully!');
    } else {
      console.log('🔥 Validation failed!');
      console.log('🔥 Validation errors:', errors);
      console.log('🔥 Form data that failed validation:', formData);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const addWorkExperience = () => {
    setFormData(prev => ({
      ...prev,
      workExperience: [...prev.workExperience, { jobTitle: '', company: '', duration: '' }]
    }));
  };

  const removeWorkExperience = (index: number) => {
    setFormData(prev => ({
      ...prev,
      workExperience: prev.workExperience.filter((_, i) => i !== index)
    }));
  };

  const updateWorkExperience = (index: number, field: keyof WorkExperience, value: string) => {
    setFormData(prev => ({
      ...prev,
      workExperience: prev.workExperience.map((exp, i) => 
        i === index ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, { degree: '', institution: '', graduationYear: '' }]
    }));
  };

  const removeEducation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map((edu, i) => 
        i === index ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const updateSocialLink = (platform: keyof SocialLinks, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  };

  const nextSection = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const renderBasicInformation = () => (
    <div className="space-y-6">
      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <User className="h-4 w-4 inline mr-2" />
          Full Name *
        </label>
        <input
          type="text"
          value={formData.fullName}
          onChange={(e) => handleInputChange('fullName', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
            errors.fullName ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your full name"
          disabled={isLoading}
        />
        {errors.fullName && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fullName}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Mail className="h-4 w-4 inline mr-2" />
          Email Address *
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your email address"
          disabled={isLoading}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Phone className="h-4 w-4 inline mr-2" />
          Phone Number
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="Enter your phone number"
          disabled={isLoading}
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <MapPin className="h-4 w-4 inline mr-2" />
          Location (City, State, Country) *
        </label>
        <div className="relative">
          <input
            type="text"
            list="locations"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.location ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., New York, NY, USA"
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
    </div>
  );

  const renderJobInformation = () => (
    <div className="space-y-6">
      {/* Current Job Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Briefcase className="h-4 w-4 inline mr-2" />
          Current Job Title / Employment Status *
        </label>
        <input
          type="text"
          value={formData.currentJobTitle}
          onChange={(e) => handleInputChange('currentJobTitle', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
            errors.currentJobTitle ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., Software Engineer, Student, Unemployed"
          disabled={isLoading}
        />
        {errors.currentJobTitle && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.currentJobTitle}</p>
        )}
      </div>

      {/* Job Profile (from job search) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Briefcase className="h-4 w-4 inline mr-2" />
          Desired Job Profile
        </label>
        <div className="relative">
          <input
            type="text"
            list="jobProfiles"
            value={formData.jobProfile}
            onChange={(e) => handleInputChange('jobProfile', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="e.g., Software Developer, Data Scientist"
            disabled={isLoading}
          />
          <datalist id="jobProfiles">
            {jobProfiles.map((profile) => (
              <option key={profile} value={profile} />
            ))}
          </datalist>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Experience Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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

      {/* Work Experience */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <Building className="h-4 w-4 inline mr-2" />
            Work Experience
          </label>
          <button
            type="button"
            onClick={addWorkExperience}
            className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Experience
          </button>
        </div>
        <div className="space-y-4">
          {formData.workExperience.map((exp, index) => (
            <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Experience {index + 1}
                </h4>
                {formData.workExperience.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWorkExperience(index)}
                    className="text-red-600 hover:text-red-700"
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={exp.jobTitle}
                  onChange={(e) => updateWorkExperience(index, 'jobTitle', e.target.value)}
                  placeholder="Job Title"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={exp.company}
                  onChange={(e) => updateWorkExperience(index, 'company', e.target.value)}
                  placeholder="Company"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={exp.duration}
                  onChange={(e) => updateWorkExperience(index, 'duration', e.target.value)}
                  placeholder="Duration (e.g., 2020-2022)"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={isLoading}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEducation = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <GraduationCap className="h-4 w-4 inline mr-2" />
            Education
          </label>
          <button
            type="button"
            onClick={addEducation}
            className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Education
          </button>
        </div>
        <div className="space-y-4">
          {formData.education.map((edu, index) => (
            <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Education {index + 1}
                </h4>
                {formData.education.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEducation(index)}
                    className="text-red-600 hover:text-red-700"
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={edu.degree}
                  onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                  placeholder="Degree (e.g., Bachelor's in CS)"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={edu.institution}
                  onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                  placeholder="Institution"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={edu.graduationYear}
                  onChange={(e) => updateEducation(index, 'graduationYear', e.target.value)}
                  placeholder="Graduation Year"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={isLoading}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSkillsAndSalary = () => (
    <div className="space-y-6">
      {/* Skills */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Skills / Keywords
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
            placeholder="Add a skill and press Enter"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={addSkill}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            disabled={isLoading}
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.skills.map((skill, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="ml-2 text-blue-600 hover:text-blue-800"
                disabled={isLoading}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Expected Salary */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <DollarSign className="h-4 w-4 inline mr-2" />
          Expected Salary
        </label>
        <input
          type="text"
          value={formData.expectedSalary}
          onChange={(e) => handleInputChange('expectedSalary', e.target.value)}
          placeholder="e.g., $80,000 - $100,000 per year"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          disabled={isLoading}
        />
      </div>

      {/* Current CTC */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <DollarSign className="h-4 w-4 inline mr-2" />
          Current CTC (if employed)
        </label>
        <input
          type="text"
          value={formData.currentCTC}
          onChange={(e) => handleInputChange('currentCTC', e.target.value)}
          placeholder="e.g., $70,000 per year"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          disabled={isLoading}
        />
      </div>
    </div>
  );

  const renderWorkAuthorization = () => (
    <div className="space-y-6">
      {/* Willingness to Relocate */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="willingnessToRelocate"
          checked={formData.willingnessToRelocate}
          onChange={(e) => handleInputChange('willingnessToRelocate', e.target.checked)}
          className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          disabled={isLoading}
        />
        <label htmlFor="willingnessToRelocate" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
          <Globe className="h-4 w-4 inline mr-2" />
          Willing to relocate
        </label>
      </div>

      {/* Work Authorization */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Shield className="h-4 w-4 inline mr-2" />
          Work Authorization / Visa Status
        </label>
        <select
          value={formData.workAuthorization}
          onChange={(e) => handleInputChange('workAuthorization', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          disabled={isLoading}
        >
          <option value="">Select work authorization</option>
          <option value="citizen">Citizen</option>
          <option value="permanent_resident">Permanent Resident</option>
          <option value="h1b">H1B Visa</option>
          <option value="opt">OPT</option>
          <option value="cpt">CPT</option>
          <option value="l1">L1 Visa</option>
          <option value="tn">TN Visa</option>
          <option value="requires_sponsorship">Requires Sponsorship</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Notice Period */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Clock className="h-4 w-4 inline mr-2" />
          Notice Period
        </label>
        <input
          type="text"
          value={formData.noticePeriod}
          onChange={(e) => handleInputChange('noticePeriod', e.target.value)}
          placeholder="e.g., 2 weeks, 1 month, Immediate"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          disabled={isLoading}
        />
      </div>

      {/* Availability */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <UserCheck className="h-4 w-4 inline mr-2" />
          Availability
        </label>
        <input
          type="text"
          value={formData.availability}
          onChange={(e) => handleInputChange('availability', e.target.value)}
          placeholder="e.g., Immediate, After 30 days, Flexible"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          disabled={isLoading}
        />
      </div>
    </div>
  );

  const renderReferencesAndSocial = () => (
    <div className="space-y-6">
      {/* References */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          References
        </label>
        <textarea
          value={formData.references}
          onChange={(e) => handleInputChange('references', e.target.value)}
          rows={4}
          placeholder="List your references (name, title, contact information)"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          disabled={isLoading}
        />
      </div>

      {/* Social Links */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          <ExternalLink className="h-4 w-4 inline mr-2" />
          Social Links
        </label>
        <div className="space-y-3">
          {Object.entries({
            linkedin: 'LinkedIn',
            github: 'GitHub',
            portfolio: 'Portfolio',
            twitter: 'Twitter',
            dribbble: 'Dribbble',
            medium: 'Medium'
          }).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                {label}
              </label>
              <input
                type="url"
                value={formData.socialLinks[key as keyof SocialLinks] || ''}
                onChange={(e) => updateSocialLink(key as keyof SocialLinks, e.target.value)}
                placeholder={`https://${key}.com/yourusername`}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={isLoading}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0: return renderBasicInformation();
      case 1: return renderJobInformation();
      case 2: return renderEducation();
      case 3: return renderSkillsAndSalary();
      case 4: return renderWorkAuthorization();
      case 5: return renderReferencesAndSocial();
      default: return renderBasicInformation();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Complete Your Profile</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Help us find the perfect opportunities for you
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-between items-center">
        {sections.map((_, index) => (
          <div key={index} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              index <= currentSection 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
            }`}>
              {index + 1}
            </div>
            {index < sections.length - 1 && (
              <div className={`w-8 h-1 mx-2 ${
                index < currentSection ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`} />
            )}
          </div>
        ))}
      </div>
      
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {sections[currentSection]}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {renderCurrentSection()}

        {/* Navigation Buttons */}
        <div className="flex gap-4 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          
          {currentSection > 0 && (
            <button
              type="button"
              onClick={prevSection}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              disabled={isLoading}
            >
              Previous
            </button>
          )}
          
          {currentSection < sections.length - 1 ? (
            <button
              type="button"
              onClick={nextSection}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
              disabled={isLoading}
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                'Save Profile'
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ProfileForm;
