import React, { useState, useEffect } from 'react';
import { X, Target, MapPin, Building, DollarSign, Briefcase, Link as LinkIcon } from 'lucide-react';
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
    }  };
  // Simple form update function exactly like ApplyJobsModal and ProfileModal
  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  const updateArrayField = (arrayName: string, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: (prev[arrayName as keyof typeof prev] as string[]).map((item: string, i: number) => 
        i === index ? value : item
      )
    }));
  };

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
          )}          {/* Job Titles of Interest */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Briefcase size={20} />
              Job Titles of Interest
            </h3>
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Please list the job titles or positions you're keen on applying for:</h4>
              {formData.jobTitles.map((title, index) => (
                <input
                  key={index}
                  type="text"
                  value={title}
                  onChange={(e) => updateArrayField('jobTitles', index, e.target.value)}
                  placeholder={`Job title ${index + 1}`}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Examples:</strong> Chief Technology Officer, Vice President of Technology, Senior Manager, Director of Information, Chief Architect, Chief Information Officer, Sr Director for Security and Compliance, Sr Consultant/Partner
              </p>
            </div>
          </div>          {/* Preferred Industries */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building size={20} />
              Preferred Industries
            </h3>
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Which industries are you most interested in for job applications?</h4>
              {formData.preferredIndustries.map((industry, index) => (
                <input
                  key={index}
                  type="text"
                  value={industry}
                  onChange={(e) => updateArrayField('preferredIndustries', index, e.target.value)}
                  placeholder={`Industry ${index + 1}`}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Examples:</strong> Information Technology, Automotive, Healthcare, Finance, Manufacturing, Consulting
              </p>
            </div>
          </div>          {/* Companies of Interest */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building size={20} />
              Companies/Organizations of Interest
            </h3>
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Do you have a list of companies or organizations that particularly pique your interest?</h4>
              {formData.companiesOfInterest.map((company, index) => (
                <input
                  key={index}
                  type="text"
                  value={company}
                  onChange={(e) => updateArrayField('companiesOfInterest', index, e.target.value)}
                  placeholder={`Company name ${index + 1}`}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              ))}
            </div>
          </div>          {/* Not Interested */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <X size={20} />
              Job Titles, Industries, and Companies of No Interest
            </h3>
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-white">Job Titles Not Interested In:</h4>
                {formData.noInterestJobTitles.map((title, index) => (
                  <input
                    key={index}
                    type="text"
                    value={title}
                    onChange={(e) => updateArrayField('noInterestJobTitles', index, e.target.value)}
                    placeholder={`Job title to avoid ${index + 1}`}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                ))}
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-white">Industries Not Interested In:</h4>
                {formData.noInterestIndustries.map((industry, index) => (
                  <input
                    key={index}
                    type="text"
                    value={industry}
                    onChange={(e) => updateArrayField('noInterestIndustries', index, e.target.value)}
                    placeholder={`Industry to avoid ${index + 1}`}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                ))}
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-white">Companies Not Interested In:</h4>
                {formData.noInterestCompanies.map((company, index) => (
                  <input
                    key={index}
                    type="text"
                    value={company}
                    onChange={(e) => updateArrayField('noInterestCompanies', index, e.target.value)}
                    placeholder={`Company to avoid ${index + 1}`}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                ))}
              </div>
            </div>
          </div>          {/* Geographic Preferences */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MapPin size={20} />
              Geographic Preferences
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Do you like to Relocate (Inside USA) for the right opportunity?
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="willingToRelocate"
                      value="true"
                      checked={formData.willingToRelocate === true}
                      onChange={() => updateForm('willingToRelocate', true)}
                      className="mr-2 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="willingToRelocate"
                      value="false"
                      checked={formData.willingToRelocate === false}
                      onChange={() => updateForm('willingToRelocate', false)}
                      className="mr-2 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">No</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-white">In which geographic areas would you prefer to seek employment?</h4>
                {formData.preferredLocations.map((location, index) => (
                  <input
                    key={index}
                    type="text"
                    value={location}
                    onChange={(e) => updateArrayField('preferredLocations', index, e.target.value)}
                    placeholder={`Preferred location ${index + 1}`}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                ))}
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Examples:</strong> Detroit, Michigan, Pittsburgh, San Mateo, Mid-west (Near Detroit e.g. IN, OH), North East (New York etc)
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-white">In which geographic areas would you not prefer to seek employment?</h4>
                {formData.notPreferredLocations.map((location, index) => (
                  <input
                    key={index}
                    type="text"
                    value={location}
                    onChange={(e) => updateArrayField('notPreferredLocations', index, e.target.value)}
                    placeholder={`Location to avoid ${index + 1}`}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  How much travel do you want to do in your next role?
                </label>
                <select
                  value={formData.travelPercentage}
                  onChange={(e) => updateForm('travelPercentage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select travel percentage</option>
                  <option value="25">25%</option>
                  <option value="50">50%</option>
                  <option value="75">75%</option>
                  <option value="100">100%</option>
                  <option value="0">No Travel (100% remote jobs)</option>
                </select>
              </div>
            </div>
          </div>          {/* Salary Expectations */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <DollarSign size={20} />
              Salary Expectations
            </h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Expected Base Salary Per Year (USD)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
                    <input
                      type="number"
                      value={formData.expectedSalaryFrom}
                      onChange={(e) => updateForm('expectedSalaryFrom', e.target.value)}
                      placeholder="225000"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
                    <input
                      type="number"
                      value={formData.expectedSalaryTo}
                      onChange={(e) => updateForm('expectedSalaryTo', e.target.value)}
                      placeholder="350000"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Current Base Salary Per Year (USD)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
                    <input
                      type="number"
                      value={formData.currentSalaryFrom}
                      onChange={(e) => updateForm('currentSalaryFrom', e.target.value)}
                      placeholder="200000"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
                    <input
                      type="number"
                      value={formData.currentSalaryTo}
                      onChange={(e) => updateForm('currentSalaryTo', e.target.value)}
                      placeholder="225000"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>          {/* Job Postings for Reference */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <LinkIcon size={20} />
              Job Postings for Reference
            </h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                To help us identify the roles that best align with your career goals and preferences, please share five recent job postings that closely reflect the type of positions you are targeting. These examples are essential for our experts to accurately match you with the most suitable opportunities.
              </p>
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-white">Please include five active hyperlinks:</h4>
                {formData.referenceJobPostings.map((posting, index) => (
                  <input
                    key={index}
                    type="url"
                    value={posting}
                    onChange={(e) => updateArrayField('referenceJobPostings', index, e.target.value)}
                    placeholder={`https://www.linkedin.com/jobs/... ${index + 1}`}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                ))}
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  <strong>Note:</strong> This step is mandatory. Please provide active job posting URLs that represent your target positions.
                </p>
              </div>
            </div>
          </div>

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