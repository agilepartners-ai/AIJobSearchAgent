import React, { useState, useEffect } from 'react';
import { X, Briefcase, MapPin, DollarSign, ChevronDown, ChevronUp, Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { FirebaseJobPreferencesService, JobPreferences } from '../../services/firebaseJobPreferencesService';
import { useToastContext } from '../ui/ToastProvider';

interface JobPreferencesFormData {
  jobTitles: string[];
  locations: string[];
  salaryMin: string;
  employmentTypes: string[];
  remotePreference: string;
}

interface JobPreferencesModalProps {
  onClose: () => void;
}

const JobPreferencesModal: React.FC<JobPreferencesModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useToastContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<JobPreferences | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['jobTitles', 'salary', 'location']));

  const [formData, setFormData] = useState<JobPreferencesFormData>({
    jobTitles: [''],
    locations: [''],
    salaryMin: '',
    employmentTypes: [],
    remotePreference: 'flexible',
  });

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const userPreferences = await FirebaseJobPreferencesService.getUserJobPreferences(user.id);
        
        if (userPreferences) {
          setPreferences(userPreferences);
          
          setFormData({
            jobTitles: userPreferences.job_titles?.length ? userPreferences.job_titles : [''],
            locations: userPreferences.locations?.length ? userPreferences.locations : [''],
            salaryMin: userPreferences.salary_expectation?.toString() || '',
            employmentTypes: userPreferences.employment_types || [],
            remotePreference: userPreferences.remote_only ? 'remote_only' : 'flexible',
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

  const handleInputChange = (field: keyof JobPreferencesFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayFieldChange = (field: 'jobTitles' | 'locations', index: number, value: string) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  const addArrayItem = (field: 'jobTitles' | 'locations') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field: 'jobTitles' | 'locations', index: number) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray.splice(index, 1);
      if (newArray.length === 0) {
        newArray.push('');
      }
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

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

  const handleReset = () => {
    if (preferences) {
      setFormData({
        jobTitles: preferences.job_titles?.length ? preferences.job_titles : [''],
        locations: preferences.locations?.length ? preferences.locations : [''],
        salaryMin: preferences.salary_expectation?.toString() || '',
        employmentTypes: preferences.employment_types || [],
        remotePreference: preferences.remote_only ? 'remote_only' : 'flexible',
      });
    } else {
      setFormData({
        jobTitles: [''],
        locations: [''],
        salaryMin: '',
        employmentTypes: [],
        remotePreference: 'flexible',
      });
    }
    showInfo('Form Reset', 'The form has been reset to its original values.');
  };

  const handleSave = async () => {
    if (!user) {
      showError('Not Authenticated', 'Please log in to save your preferences.');
      return;
    }
    
    try {
      setSaving(true);

      const preferencesToSave: Omit<JobPreferences, 'id' | 'updated_at'> = {
        job_titles: formData.jobTitles.filter(t => t.trim() !== ''),
        locations: formData.locations.filter(l => l.trim() !== ''),
        salary_expectation: formData.salaryMin ? parseInt(formData.salaryMin) : null,
        employment_types: formData.employmentTypes,
        remote_only: formData.remotePreference === 'remote_only',
        skills: preferences?.skills || [],
      };

      await FirebaseJobPreferencesService.saveJobPreferences(user.id, preferencesToSave as any);
      
      const updatedPreferences = await FirebaseJobPreferencesService.getUserJobPreferences(user.id);
      setPreferences(updatedPreferences);
      
      showSuccess('Preferences Saved', 'Your job preferences have been successfully saved.');
    } catch (error) {
      console.error('Error saving job preferences:', error);
      showError('Save Failed', 'Failed to save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl mx-4 p-6">
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
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" aria-label="Close">
            <X className="w-5 h-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Job Titles Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 cursor-pointer" onClick={() => toggleSection('jobTitles')}>
              <div className="flex items-center gap-2">
                <Briefcase className="text-blue-500 dark:text-blue-400" size={20} />
                <h3 className="font-medium text-gray-900 dark:text-white">Job Type & Titles</h3>
              </div>
              {expandedSections.has('jobTitles') ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
            </div>
            
            {expandedSections.has('jobTitles') && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preferred Job Titles</label>
                  <div className="space-y-2">
                    {formData.jobTitles.map((title, index) => (
                      <div key={`job-title-${index}`} className="flex gap-2">
                        <input type="text" value={title} onChange={(e) => handleArrayFieldChange('jobTitles', index, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" placeholder="e.g., Software Engineer" />
                        <button type="button" onClick={() => removeArrayItem('jobTitles', index)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" disabled={formData.jobTitles.length === 1}><Trash2 size={18} /></button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => addArrayItem('jobTitles')} className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"><Plus size={16} />Add Another Job Title</button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Employment Type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {['full-time', 'part-time', 'contract', 'internship'].map((type) => (
                      <label key={type} className="flex items-center space-x-2">
                        <input type="checkbox" checked={formData.employmentTypes.includes(type)} onChange={() => handleEmploymentTypeChange(type)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-gray-700 dark:text-gray-300">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Salary Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 cursor-pointer" onClick={() => toggleSection('salary')}>
              <div className="flex items-center gap-2">
                <DollarSign className="text-green-500 dark:text-green-400" size={20} />
                <h3 className="font-medium text-gray-900 dark:text-white">Salary Expectations</h3>
              </div>
              {expandedSections.has('salary') ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
            </div>
            
            {expandedSections.has('salary') && (
              <div className="p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expected Salary (USD per year)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400">$</span>
                  <input type="number" value={formData.salaryMin} onChange={(e) => handleInputChange('salaryMin', e.target.value)} className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" placeholder="e.g., 85000" min="0" step="1000" />
                </div>
              </div>
            )}
          </div>

          {/* Location Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 cursor-pointer" onClick={() => toggleSection('location')}>
              <div className="flex items-center gap-2">
                <MapPin className="text-purple-500 dark:text-purple-400" size={20} />
                <h3 className="font-medium text-gray-900 dark:text-white">Location Preferences</h3>
              </div>
              {expandedSections.has('location') ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
            </div>
            
            {expandedSections.has('location') && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preferred Locations</label>
                  <div className="space-y-2">
                    {formData.locations.map((location, index) => (
                      <div key={`location-${index}`} className="flex gap-2">
                        <input type="text" value={location} onChange={(e) => handleArrayFieldChange('locations', index, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" placeholder="e.g., San Francisco, CA or Remote" />
                        <button type="button" onClick={() => removeArrayItem('locations', index)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" disabled={formData.locations.length === 1}><Trash2 size={18} /></button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => addArrayItem('locations')} className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"><Plus size={16} />Add Another Location</button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Remote Preference</label>
                  <select value={formData.remotePreference} onChange={(e) => handleInputChange('remotePreference', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                    <option value="flexible">Flexible</option>
                    <option value="remote_only">Remote Only</option>
                    <option value="on_site_only">On-site Only</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? (<><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>Saving...</>) : (<><Save size={18} />Save Preferences</>)}
            </button>
            <button type="button" onClick={handleReset} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
              <RotateCcw size={18} />
              Reset Form
            </button>
            <button type="button" onClick={onClose} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Close</button>
          </div>
        </div>
        
        {preferences && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Current Saved Preferences</h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {preferences.job_titles && preferences.job_titles.length > 0 && (
                  <div className="col-span-2">
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Job Titles</dt>
                    <dd className="mt-1 text-gray-600 dark:text-gray-400">{preferences.job_titles.join(', ')}</dd>
                  </div>
                )}
                {preferences.locations && preferences.locations.length > 0 && (
                  <div className="col-span-2">
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Locations</dt>
                    <dd className="mt-1 text-gray-600 dark:text-gray-400">{preferences.locations.join(', ')}</dd>
                  </div>
                )}
                {preferences.salary_expectation && (
                  <div>
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Salary Expectation</dt>
                    <dd className="mt-1 text-gray-600 dark:text-gray-400">{`$${preferences.salary_expectation.toLocaleString()}`}</dd>
                  </div>
                )}
                {preferences.remote_only !== undefined && (
                  <div>
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Remote Preference</dt>
                    <dd className="mt-1 text-gray-600 dark:text-gray-400">{preferences.remote_only ? 'Remote Only' : 'Flexible'}</dd>
                  </div>
                )}
                {preferences.employment_types && preferences.employment_types.length > 0 && (
                  <div>
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Employment Types</dt>
                    <dd className="mt-1 text-gray-600 dark:text-gray-400">{preferences.employment_types.map(type => type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()).join(', ')}</dd>
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