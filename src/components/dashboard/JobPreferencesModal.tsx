import React, { useState, useEffect } from 'react';
import { X, Target, MapPin, Building, DollarSign, Briefcase, Globe, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { JobPreferencesService } from '../../services/jobPreferencesService';

interface JobPreferencesModalProps {
  onClose: () => void;
}

const JobPreferencesModal: React.FC<JobPreferencesModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    // Job Titles of Interest
    jobTitles: ['', '', '', '', '', '', '', ''],
    
    // Preferred Industries
    preferredIndustries: ['', '', '', '', '', ''],
    
    // Companies of Interest
    companiesOfInterest: ['', '', '', '', '', ''],
    
    // Job Titles/Industries/Companies of No Interest
    noInterestJobTitles: ['', '', '', '', '', ''],
    noInterestIndustries: ['', '', '', '', '', ''],
    noInterestCompanies: ['', '', '', '', '', ''],
    
    // Geographic Preferences
    willingToRelocate: true,
    preferredLocations: ['', '', '', '', '', ''],
    notPreferredLocations: ['', '', '', '', '', ''],
    travelPercentage: '',
    
    // Salary Expectations
    expectedSalaryFrom: '',
    expectedSalaryTo: '',
    currentSalaryFrom: '',
    currentSalaryTo: '',
    
    // Job Postings for Reference
    referenceJobPostings: ['', '', '', '', '']
  });

  useEffect(() => {
    loadJobPreferences();
  }, [user]);

  const loadJobPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const preferences = await JobPreferencesService.getUserJobPreferences(user.uid);
      if (preferences) {
        setFormData(preferences);
      }
    } catch (err: any) {
      console.error('Error loading job preferences:', err);
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

      await JobPreferencesService.saveUserJobPreferences(user.uid, formData);
      setSuccess('Job preferences updated successfully!');
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save job preferences');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateArrayField = (arrayName: string, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName as keyof typeof prev].map((item: string, i: number) => 
        i === index ? value : item
      )
    }));
  };

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

  const FormField = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );

  const Input = ({ value, onChange, placeholder, type = 'text' }: { 
    value: string; 
    onChange: (value: string) => void; 
    placeholder?: string; 
    type?: string;
  }) => (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
    />
  );

  const Select = ({ value, onChange, options, placeholder }: { 
    value: string; 
    onChange: (value: string) => void; 
    options: Array<{ value: string; label: string }>; 
    placeholder?: string;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );

  const RadioGroup = ({ value, onChange, options, name }: {
    value: string | boolean;
    onChange: (value: any) => void;
    options: Array<{ value: any; label: string }>;
    name: string;
  }) => (
    <div className="flex flex-wrap gap-4">
      {options.map(option => (
        <label key={option.value} className="flex items-center">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(option.value)}
            className="mr-2 text-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
        </label>
      ))}
    </div>
  );

  const ArrayInputs = ({ 
    values, 
    onChange, 
    placeholder, 
    label 
  }: { 
    values: string[]; 
    onChange: (index: number, value: string) => void; 
    placeholder: string;
    label: string;
  }) => (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900 dark:text-white">{label}</h4>
      {values.map((value, index) => (
        <Input
          key={index}
          value={value}
          onChange={(newValue) => onChange(index, newValue)}
          placeholder={`${placeholder} ${index + 1}`}
        />
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
                <Target className="text-purple-600 dark:text-purple-400" size={28} />
                Job Search Preferences
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Set your job search preferences to get better matches
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

          {/* Job Titles of Interest */}
          <FormSection title="Job Titles of Interest" icon={<Briefcase size={20} />}>
            <ArrayInputs
              values={formData.jobTitles}
              onChange={(index, value) => updateArrayField('jobTitles', index, value)}
              placeholder="Job title"
              label="Please list the job titles or positions you're keen on applying for:"
            />
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Examples:</strong> Chief Technology Officer, Vice President of Technology, Senior Manager, Director of Information, Chief Architect, Chief Information Officer, Sr Director for Security and Compliance, Sr Consultant/Partner
              </p>
            </div>
          </FormSection>

          {/* Preferred Industries */}
          <FormSection title="Preferred Industries" icon={<Building size={20} />}>
            <ArrayInputs
              values={formData.preferredIndustries}
              onChange={(index, value) => updateArrayField('preferredIndustries', index, value)}
              placeholder="Industry"
              label="Which industries are you most interested in for job applications?"
            />
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Examples:</strong> Information Technology, Automotive, Healthcare, Finance, Manufacturing, Consulting
              </p>
            </div>
          </FormSection>

          {/* Companies of Interest */}
          <FormSection title="Companies/Organizations of Interest" icon={<Building size={20} />}>
            <ArrayInputs
              values={formData.companiesOfInterest}
              onChange={(index, value) => updateArrayField('companiesOfInterest', index, value)}
              placeholder="Company name"
              label="Do you have a list of companies or organizations that particularly pique your interest?"
            />
          </FormSection>

          {/* Not Interested */}
          <FormSection title="Job Titles, Industries, and Companies of No Interest" icon={<X size={20} />}>
            <div className="space-y-6">
              <ArrayInputs
                values={formData.noInterestJobTitles}
                onChange={(index, value) => updateArrayField('noInterestJobTitles', index, value)}
                placeholder="Job title to avoid"
                label="Job Titles Not Interested In:"
              />
              <ArrayInputs
                values={formData.noInterestIndustries}
                onChange={(index, value) => updateArrayField('noInterestIndustries', index, value)}
                placeholder="Industry to avoid"
                label="Industries Not Interested In:"
              />
              <ArrayInputs
                values={formData.noInterestCompanies}
                onChange={(index, value) => updateArrayField('noInterestCompanies', index, value)}
                placeholder="Company to avoid"
                label="Companies Not Interested In:"
              />
            </div>
          </FormSection>

          {/* Geographic Preferences */}
          <FormSection title="Geographic Preferences" icon={<MapPin size={20} />}>
            <div className="space-y-6">
              <FormField label="Do you like to Relocate (Inside USA) for the right opportunity?">
                <RadioGroup
                  value={formData.willingToRelocate}
                  onChange={(value) => updateField('willingToRelocate', value)}
                  options={[
                    { value: true, label: 'Yes' },
                    { value: false, label: 'No' }
                  ]}
                  name="willingToRelocate"
                />
              </FormField>

              <ArrayInputs
                values={formData.preferredLocations}
                onChange={(index, value) => updateArrayField('preferredLocations', index, value)}
                placeholder="Preferred location"
                label="In which geographic areas would you prefer to seek employment?"
              />
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Examples:</strong> Detroit, Michigan, Pittsburgh, San Mateo, Mid-west (Near Detroit e.g. IN, OH), North East (New York etc)
                </p>
              </div>

              <ArrayInputs
                values={formData.notPreferredLocations}
                onChange={(index, value) => updateArrayField('notPreferredLocations', index, value)}
                placeholder="Location to avoid"
                label="In which geographic areas would you not prefer to seek employment?"
              />

              <FormField label="How much travel do you want to do in your next role?">
                <Select
                  value={formData.travelPercentage}
                  onChange={(value) => updateField('travelPercentage', value)}
                  placeholder="Select travel percentage"
                  options={[
                    { value: '25', label: '25%' },
                    { value: '50', label: '50%' },
                    { value: '75', label: '75%' },
                    { value: '100', label: '100%' },
                    { value: '0', label: 'No Travel (100% remote jobs)' }
                  ]}
                />
              </FormField>
            </div>
          </FormSection>

          {/* Salary Expectations */}
          <FormSection title="Salary Expectations" icon={<DollarSign size={20} />}>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Expected Base Salary Per Year (USD)</h4>
                <FormGrid>
                  <FormField label="From">
                    <Input
                      type="number"
                      value={formData.expectedSalaryFrom}
                      onChange={(value) => updateField('expectedSalaryFrom', value)}
                      placeholder="225000"
                    />
                  </FormField>
                  <FormField label="To">
                    <Input
                      type="number"
                      value={formData.expectedSalaryTo}
                      onChange={(value) => updateField('expectedSalaryTo', value)}
                      placeholder="350000"
                    />
                  </FormField>
                </FormGrid>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Current Base Salary Per Year (USD)</h4>
                <FormGrid>
                  <FormField label="From">
                    <Input
                      type="number"
                      value={formData.currentSalaryFrom}
                      onChange={(value) => updateField('currentSalaryFrom', value)}
                      placeholder="200000"
                    />
                  </FormField>
                  <FormField label="To">
                    <Input
                      type="number"
                      value={formData.currentSalaryTo}
                      onChange={(value) => updateField('currentSalaryTo', value)}
                      placeholder="225000"
                    />
                  </FormField>
                </FormGrid>
              </div>
            </div>
          </FormSection>

          {/* Job Postings for Reference */}
          <FormSection title="Job Postings for Reference" icon={<LinkIcon size={20} />}>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                To help us identify the roles that best align with your career goals and preferences, please share five recent job postings that closely reflect the type of positions you are targeting. These examples are essential for our experts to accurately match you with the most suitable opportunities.
              </p>
              <ArrayInputs
                values={formData.referenceJobPostings}
                onChange={(index, value) => updateArrayField('referenceJobPostings', index, value)}
                placeholder="https://www.linkedin.com/jobs/..."
                label="Please include five active hyperlinks:"
              />
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  <strong>Note:</strong> This step is mandatory. Please provide active job posting URLs that represent your target positions.
                </p>
              </div>
            </div>
          </FormSection>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-6 rounded-lg font-medium transition-all disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Job Preferences'}
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

export default JobPreferencesModal;