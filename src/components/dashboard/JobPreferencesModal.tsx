import React, { useState, useEffect } from 'react';
import { X, Briefcase, MapPin, DollarSign, Globe, Clock, Building, ChevronDown, ChevronUp, Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import SupabaseJobPreferencesService from '../../services/supabaseJobPreferencesService';
import { JobPreferences } from '../../types/supabase';
import { useToastContext } from '../ui/ToastProvider';

interface JobPreferencesModalProps {
  onClose: () => void;
}

const JobPreferencesModal: React.FC<JobPreferencesModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useToastContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<JobPreferences | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['jobTitles', 'salary', 'location', 'workPreferences']));
  
  // Form state
  const [formData, setFormData] = useState({
    jobTitles: [''],
    industries: [''],
    companies: [''],
    excludedCompanies: [''],
    locations: [''],
    excludedLocations: [''],
    salaryMin: '',
    salaryMax: '',
    employmentTypes: [] as string[],
    remotePreference: 'flexible',
    travelPercentage: '25',
    yearsExperienceMin: '0',
    yearsExperienceMax: '',
    noticePeriod: 'immediate',
    currentlyEmployed: true,
    additionalNotes: '',
  });

  // Load existing preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const userPreferences = await SupabaseJobPreferencesService.getUserJobPreferences(user.uid);
        
        if (userPreferences) {
          setPreferences(userPreferences);
          
          // Map database values to form state
          setFormData({
            jobTitles: userPreferences.preferred_job_titles?.length ? 
              userPreferences.preferred_job_titles : [''],
            industries: userPreferences.preferred_industries?.length ? 
              userPreferences.preferred_industries : [''],
            companies: [], // Not in current schema
            excludedCompanies: userPreferences.excluded_companies?.length ? 
              userPreferences.excluded_companies : [''],
            locations: userPreferences.preferred_locations?.length ? 
              userPreferences.preferred_locations : [''],
            excludedLocations: [], // Not in current schema
            salaryMin: userPreferences.preferred_salary_min?.toString() || '',
            salaryMax: userPreferences.preferred_salary_max?.toString() || '',
            employmentTypes: userPreferences.preferred_employment_types || [],
            remotePreference: userPreferences.remote_preference || 'flexible',
            travelPercentage: '25', // Not in current schema
            yearsExperienceMin: userPreferences.minimum_experience_years?.toString() || '0',
            yearsExperienceMax: userPreferences.maximum_experience_years?.toString() || '',
            noticePeriod: 'immediate', // Not in current schema
            currentlyEmployed: true, // Not in current schema
            additionalNotes: userPreferences.additional_notes || '',
          });
        }
      } catch (error) {
        console.error('Error loading job preferences:', error);
        showError('Failed to load preferences', 'Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadPreferences();
  }, [user]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle array field changes (job titles, locations, etc.)
  const handleArrayFieldChange = (field: string, index: number, value: string) => {
    setFormData(prev => {
      const newArray = [...prev[field as keyof typeof prev] as string[]];
      newArray[index] = value;
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  // Add new item to array field
  const addArrayItem = (field: string) => {
    setFormData(prev => {
      const newArray = [...prev[field as keyof typeof prev] as string[], ''];
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  // Remove item from array field
  const removeArrayItem = (field: string, index: number) => {
    setFormData(prev => {
      const newArray = [...prev[field as keyof typeof prev] as string[]];
      newArray.splice(index, 1);
      // Ensure at least one empty field remains
      if (newArray.length === 0) {
        newArray.push('');
      }
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  // Handle checkbox changes for employment types
  const handleEmploymentTypeChange = (type: string) => {
    setFormData(prev => {
      const types = [...prev.employmentTypes];
      if (types.includes(type)) {
        return {
          ...prev,
          employmentTypes: types.filter(t => t !== type)
        };
      } else {
        return {
          ...prev,
          employmentTypes: [...types, type]
        };
      }
    });
  };

  // Reset form to initial state or loaded preferences
  const handleReset = () => {
    if (preferences) {
      // Reset to loaded preferences
      setFormData({
        jobTitles: preferences.preferred_job_titles?.length ? 
          preferences.preferred_job_titles : [''],
        industries: preferences.preferred_industries?.length ? 
          preferences.preferred_industries : [''],
        companies: [], // Not in current schema
        excludedCompanies: preferences.excluded_companies?.length ? 
          preferences.excluded_companies : [''],
        locations: preferences.preferred_locations?.length ? 
          preferences.preferred_locations : [''],
        excludedLocations: [], // Not in current schema
        salaryMin: preferences.preferred_salary_min?.toString() || '',
        salaryMax: preferences.preferred_salary_max?.toString() || '',
        employmentTypes: preferences.preferred_employment_types || [],
        remotePreference: preferences.remote_preference || 'flexible',
        travelPercentage: '25', // Not in current schema
        yearsExperienceMin: preferences.minimum_experience_years?.toString() || '0',
        yearsExperienceMax: preferences.maximum_experience_years?.toString() || '',
        noticePeriod: 'immediate', // Not in current schema
        currentlyEmployed: true, // Not in current schema
        additionalNotes: preferences.additional_notes || '',
      });
    } else {
      // Reset to default values
      setFormData({
        jobTitles: [''],
        industries: [''],
        companies: [''],
        excludedCompanies: [''],
        locations: [''],
        excludedLocations: [''],
        salaryMin: '',
        salaryMax: '',
        employmentTypes: [],
        remotePreference: 'flexible',
        travelPercentage: '25',
        yearsExperienceMin: '0',
        yearsExperienceMax: '',
        noticePeriod: 'immediate',
        currentlyEmployed: true,
        additionalNotes: '',
      });
    }
    
    showInfo('Form Reset', 'The form has been reset to its original values.');
  };

  // Save preferences to Supabase
  const handleSave = async () => {
    if (!user) {
      showError('Not Authenticated', 'Please log in to save your preferences.');
      return;
    }
    
    try {
      setSaving(true);
      
      // Filter out empty values from arrays
      const filteredJobTitles = formData.jobTitles.filter(title => title.trim() !== '');
      const filteredIndustries = formData.industries.filter(industry => industry.trim() !== '');
      const filteredLocations = formData.locations.filter(location => location.trim() !== '');
      const filteredExcludedCompanies = formData.excludedCompanies.filter(company => company.trim() !== '');
      
      // Convert string numbers to actual numbers
      const salaryMin = formData.salaryMin ? parseInt(formData.salaryMin, 10) : null;
      const salaryMax = formData.salaryMax ? parseInt(formData.salaryMax, 10) : null;
      const yearsExperienceMin = formData.yearsExperienceMin ? parseInt(formData.yearsExperienceMin, 10) : 0;
      const yearsExperienceMax = formData.yearsExperienceMax ? parseInt(formData.yearsExperienceMax, 10) : null;
      
      // Validate salary range
      if (salaryMin && salaryMax && salaryMin > salaryMax) {
        showError('Invalid Salary Range', 'Minimum salary cannot be greater than maximum salary.');
        setSaving(false);
        return;
      }
      
      // Validate experience range
      if (yearsExperienceMin && yearsExperienceMax && yearsExperienceMin > yearsExperienceMax) {
        showError('Invalid Experience Range', 'Minimum experience cannot be greater than maximum experience.');
        setSaving(false);
        return;
      }
      
      // Prepare data for Supabase
      const preferencesData = {
        preferred_job_titles: filteredJobTitles.length ? filteredJobTitles : null,
        preferred_industries: filteredIndustries.length ? filteredIndustries : null,
        excluded_companies: filteredExcludedCompanies.length ? filteredExcludedCompanies : null,
        preferred_locations: filteredLocations.length ? filteredLocations : null,
        preferred_salary_min: salaryMin,
        preferred_salary_max: salaryMax,
        preferred_employment_types: formData.employmentTypes.length ? formData.employmentTypes : null,
        remote_preference: formData.remotePreference,
        minimum_experience_years: yearsExperienceMin,
        maximum_experience_years: yearsExperienceMax,
        additional_notes: formData.additionalNotes.trim() || null,
        willing_to_relocate: formData.remotePreference !== 'remote_only'
      };
      
      // Save to Supabase
      await SupabaseJobPreferencesService.saveJobPreferences(user.uid, preferencesData);
      
      // Update local state
      setPreferences(await SupabaseJobPreferencesService.getUserJobPreferences(user.uid));
      
      showSuccess('Preferences Saved', 'Your job preferences have been successfully saved.');
    } catch (error) {
      console.error('Error saving job preferences:', error);
      showError('Save Failed', 'Failed to save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl mx-4 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Job Preferences</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-white dark:bg-gray-800 z-10 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Job Preferences</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Job Titles Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 cursor-pointer"
              onClick={() => toggleSection('jobTitles')}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="text-blue-500 dark:text-blue-400" size={20} />
                <h3 className="font-medium text-gray-900 dark:text-white">Job Type & Titles</h3>
              </div>
              {expandedSections.has('jobTitles') ? (
                <ChevronUp size={20} className="text-gray-500" />
              ) : (
                <ChevronDown size={20} className="text-gray-500" />
              )}
            </div>
            
            {expandedSections.has('jobTitles') && (
              <div className="p-4 space-y-4">
                {/* Job Titles */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preferred Job Titles
                  </label>
                  <div className="space-y-2">
                    {formData.jobTitles.map((title, index) => (
                      <div key={`job-title-${index}`} className="flex gap-2">
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => handleArrayFieldChange('jobTitles', index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="e.g., Software Engineer, Product Manager"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem('jobTitles', index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          disabled={formData.jobTitles.length === 1}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addArrayItem('jobTitles')}
                    className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add Another Job Title
                  </button>
                </div>
                
                {/* Employment Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Employment Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {['FULLTIME', 'PARTTIME', 'CONTRACTOR', 'INTERN'].map((type) => (
                      <label key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.employmentTypes.includes(type)}
                          onChange={() => handleEmploymentTypeChange(type)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700 dark:text-gray-300">
                          {type === 'FULLTIME' ? 'Full-time' : 
                           type === 'PARTTIME' ? 'Part-time' : 
                           type === 'CONTRACTOR' ? 'Contract' : 'Internship'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Current Employment Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Employment Status
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={formData.currentlyEmployed}
                        onChange={() => handleInputChange('currentlyEmployed', true)}
                        className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Employed</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={!formData.currentlyEmployed}
                        onChange={() => handleInputChange('currentlyEmployed', false)}
                        className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Unemployed</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Salary Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 cursor-pointer"
              onClick={() => toggleSection('salary')}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="text-green-500 dark:text-green-400" size={20} />
                <h3 className="font-medium text-gray-900 dark:text-white">Salary Expectations</h3>
              </div>
              {expandedSections.has('salary') ? (
                <ChevronUp size={20} className="text-gray-500" />
              ) : (
                <ChevronDown size={20} className="text-gray-500" />
              )}
            </div>
            
            {expandedSections.has('salary') && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Expected Salary Range (USD per year)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Minimum</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400">
                          $
                        </span>
                        <input
                          type="number"
                          value={formData.salaryMin}
                          onChange={(e) => handleInputChange('salaryMin', e.target.value)}
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Min salary"
                          min="0"
                          step="1000"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Maximum</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400">
                          $
                        </span>
                        <input
                          type="number"
                          value={formData.salaryMax}
                          onChange={(e) => handleInputChange('salaryMax', e.target.value)}
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Max salary"
                          min="0"
                          step="1000"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Location Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 cursor-pointer"
              onClick={() => toggleSection('location')}
            >
              <div className="flex items-center gap-2">
                <MapPin className="text-red-500 dark:text-red-400" size={20} />
                <h3 className="font-medium text-gray-900 dark:text-white">Location Preferences</h3>
              </div>
              {expandedSections.has('location') ? (
                <ChevronUp size={20} className="text-gray-500" />
              ) : (
                <ChevronDown size={20} className="text-gray-500" />
              )}
            </div>
            
            {expandedSections.has('location') && (
              <div className="p-4 space-y-4">
                {/* Preferred Locations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preferred Work Locations
                  </label>
                  <div className="space-y-2">
                    {formData.locations.map((location, index) => (
                      <div key={`location-${index}`} className="flex gap-2">
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => handleArrayFieldChange('locations', index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="e.g., New York, NY or Remote"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem('locations', index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          disabled={formData.locations.length === 1}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addArrayItem('locations')}
                    className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add Another Location
                  </button>
                </div>
                
                {/* Remote Work Preference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Remote Work Preference
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { value: 'remote_only', label: 'Remote Only' },
                      { value: 'hybrid', label: 'Hybrid' },
                      { value: 'on_site', label: 'On-site' },
                      { value: 'flexible', label: 'Flexible' }
                    ].map((option) => (
                      <label 
                        key={option.value} 
                        className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.remotePreference === option.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="remotePreference"
                          value={option.value}
                          checked={formData.remotePreference === option.value}
                          onChange={() => handleInputChange('remotePreference', option.value)}
                          className="sr-only"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Travel Percentage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Travel Percentage
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['0', '25', '50', '75', '100'].map((percentage) => (
                      <label 
                        key={percentage} 
                        className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.travelPercentage === percentage
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="travelPercentage"
                          value={percentage}
                          checked={formData.travelPercentage === percentage}
                          onChange={() => handleInputChange('travelPercentage', percentage)}
                          className="sr-only"
                        />
                        <span>{percentage === '0' ? 'No Travel' : `${percentage}%`}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Work Preferences Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 cursor-pointer"
              onClick={() => toggleSection('workPreferences')}
            >
              <div className="flex items-center gap-2">
                <Building className="text-purple-500 dark:text-purple-400" size={20} />
                <h3 className="font-medium text-gray-900 dark:text-white">Work Preferences</h3>
              </div>
              {expandedSections.has('workPreferences') ? (
                <ChevronUp size={20} className="text-gray-500" />
              ) : (
                <ChevronDown size={20} className="text-gray-500" />
              )}
            </div>
            
            {expandedSections.has('workPreferences') && (
              <div className="p-4 space-y-4">
                {/* Industries */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preferred Industries
                  </label>
                  <div className="space-y-2">
                    {formData.industries.map((industry, index) => (
                      <div key={`industry-${index}`} className="flex gap-2">
                        <input
                          type="text"
                          value={industry}
                          onChange={(e) => handleArrayFieldChange('industries', index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="e.g., Technology, Healthcare, Finance"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem('industries', index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          disabled={formData.industries.length === 1}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addArrayItem('industries')}
                    className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add Another Industry
                  </button>
                </div>
                
                {/* Experience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Years of Experience
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Minimum</label>
                      <input
                        type="number"
                        value={formData.yearsExperienceMin}
                        onChange={(e) => handleInputChange('yearsExperienceMin', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Min years"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Maximum</label>
                      <input
                        type="number"
                        value={formData.yearsExperienceMax}
                        onChange={(e) => handleInputChange('yearsExperienceMax', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Max years"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Notice Period */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notice Period
                  </label>
                  <select
                    value={formData.noticePeriod}
                    onChange={(e) => handleInputChange('noticePeriod', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="15days">15 days</option>
                    <option value="30days">30 days</option>
                    <option value="60days">60 days</option>
                    <option value="90days">90 days</option>
                  </select>
                </div>
                
                {/* Additional Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.additionalNotes}
                    onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Any additional preferences or requirements..."
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Companies Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 cursor-pointer"
              onClick={() => toggleSection('companies')}
            >
              <div className="flex items-center gap-2">
                <Building className="text-orange-500 dark:text-orange-400" size={20} />
                <h3 className="font-medium text-gray-900 dark:text-white">Target & Excluded Companies</h3>
              </div>
              {expandedSections.has('companies') ? (
                <ChevronUp size={20} className="text-gray-500" />
              ) : (
                <ChevronDown size={20} className="text-gray-500" />
              )}
            </div>
            
            {expandedSections.has('companies') && (
              <div className="p-4 space-y-4">
                {/* Target Companies */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Companies
                  </label>
                  <div className="space-y-2">
                    {formData.companies.map((company, index) => (
                      <div key={`company-${index}`} className="flex gap-2">
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => handleArrayFieldChange('companies', index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="e.g., Google, Microsoft, Amazon"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem('companies', index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          disabled={formData.companies.length === 1}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addArrayItem('companies')}
                    className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add Another Company
                  </button>
                </div>
                
                {/* Excluded Companies */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Excluded Companies
                  </label>
                  <div className="space-y-2">
                    {formData.excludedCompanies.map((company, index) => (
                      <div key={`excluded-company-${index}`} className="flex gap-2">
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => handleArrayFieldChange('excludedCompanies', index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Companies you don't want to work for"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem('excludedCompanies', index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          disabled={formData.excludedCompanies.length === 1}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addArrayItem('excludedCompanies')}
                    className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add Another Excluded Company
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Preferences
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <RotateCcw size={18} />
              Reset Form
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
        
        {/* Current Preferences Summary */}
        {preferences && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Current Saved Preferences</h3>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {preferences.preferred_job_titles?.length > 0 && (
                  <div className="col-span-2">
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Job Titles</dt>
                    <dd className="mt-1 text-gray-600 dark:text-gray-400">
                      {preferences.preferred_job_titles.join(', ')}
                    </dd>
                  </div>
                )}
                
                {preferences.preferred_industries?.length > 0 && (
                  <div className="col-span-2">
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Industries</dt>
                    <dd className="mt-1 text-gray-600 dark:text-gray-400">
                      {preferences.preferred_industries.join(', ')}
                    </dd>
                  </div>
                )}
                
                {preferences.preferred_locations?.length > 0 && (
                  <div className="col-span-2">
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Locations</dt>
                    <dd className="mt-1 text-gray-600 dark:text-gray-400">
                      {preferences.preferred_locations.join(', ')}
                    </dd>
                  </div>
                )}
                
                {(preferences.preferred_salary_min || preferences.preferred_salary_max) && (
                  <div>
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Salary Range</dt>
                    <dd className="mt-1 text-gray-600 dark:text-gray-400">
                      {preferences.preferred_salary_min && `$${preferences.preferred_salary_min.toLocaleString()}`}
                      {preferences.preferred_salary_min && preferences.preferred_salary_max && ' - '}
                      {preferences.preferred_salary_max && `$${preferences.preferred_salary_max.toLocaleString()}`}
                    </dd>
                  </div>
                )}
                
                {preferences.remote_preference && (
                  <div>
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Remote Preference</dt>
                    <dd className="mt-1 text-gray-600 dark:text-gray-400">
                      {preferences.remote_preference === 'remote_only' ? 'Remote Only' :
                       preferences.remote_preference === 'hybrid' ? 'Hybrid' :
                       preferences.remote_preference === 'on_site' ? 'On-site' : 'Flexible'}
                    </dd>
                  </div>
                )}
                
                {preferences.preferred_employment_types?.length > 0 && (
                  <div>
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Employment Types</dt>
                    <dd className="mt-1 text-gray-600 dark:text-gray-400">
                      {preferences.preferred_employment_types.map(type => 
                        type === 'FULLTIME' ? 'Full-time' : 
                        type === 'PARTTIME' ? 'Part-time' : 
                        type === 'CONTRACTOR' ? 'Contract' : 'Internship'
                      ).join(', ')}
                    </dd>
                  </div>
                )}
                
                {(preferences.minimum_experience_years !== undefined || preferences.maximum_experience_years) && (
                  <div>
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Experience</dt>
                    <dd className="mt-1 text-gray-600 dark:text-gray-400">
                      {preferences.minimum_experience_years !== undefined && `${preferences.minimum_experience_years} years`}
                      {preferences.minimum_experience_years !== undefined && preferences.maximum_experience_years && ' - '}
                      {preferences.maximum_experience_years && `${preferences.maximum_experience_years} years`}
                    </dd>
                  </div>
                )}
                
                {preferences.additional_notes && (
                  <div className="col-span-2">
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Additional Notes</dt>
                    <dd className="mt-1 text-gray-600 dark:text-gray-400">
                      {preferences.additional_notes}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobPreferencesModal;