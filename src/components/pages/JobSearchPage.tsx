import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Clock, ArrowRight, User, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import SupabaseAuthService from '../../services/supabaseAuthService';

interface JobSearchForm {
  query: string;
  location: string;
  experience: string;
  employment_type: string;
  remote_jobs_only: boolean;
  date_posted: string;
}

const JobSearchPage: React.FC = () => {  const navigate = useNavigate();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<JobSearchForm>({
    query: '',
    location: '',
    experience: '',
    employment_type: '',
    remote_jobs_only: false,
    date_posted: ''
  });

  // Redirect to login if not authenticated (but wait for auth to load)
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const handleInputChange = (field: keyof JobSearchForm, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Store the search criteria in localStorage for the next page
      localStorage.setItem('jobSearchCriteria', JSON.stringify(formData));
      
      // Navigate to job listings page
      navigate('/job-listings');
    } catch (error) {
      console.error('Error processing search:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await SupabaseAuthService.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const experienceOptions = [
    { value: '', label: 'Any experience level' },
    { value: 'entry_level', label: 'Entry Level' },
    { value: 'mid_level', label: 'Mid Level' },
    { value: 'senior_level', label: 'Senior Level' },
    { value: 'executive', label: 'Executive' }
  ];

  const employmentTypeOptions = [
    { value: '', label: 'Any employment type' },
    { value: 'FULLTIME', label: 'Full-time' },
    { value: 'PARTTIME', label: 'Part-time' },
    { value: 'CONTRACTOR', label: 'Contract' },
    { value: 'INTERN', label: 'Internship' }
  ];
  const datePostedOptions = [
    { value: '', label: 'Any time' },
    { value: 'today', label: 'Past 24 hours' },
    { value: 'week', label: 'Past week' },
    { value: 'month', label: 'Past month' }
  ];
  // Show loading if auth is still loading or user is not authenticated
  if (authLoading || (!authLoading && !user)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {authLoading ? 'Loading...' : 'Redirecting to login...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">JS</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Find Your Dream Job</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <User size={16} />
                <span>Welcome, {userProfile?.email || user?.email}!</span>
              </div>
              <button 
                onClick={handleSignOut}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Sign out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            What kind of job are you looking for?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Tell us your preferences and we'll find the perfect opportunities for you
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Job Title/Keywords */}
            <div>
              <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
                <Search className="h-5 w-5 inline mr-2" />
                Job Title or Keywords
              </label>
              <input
                type="text"
                value={formData.query}
                onChange={(e) => handleInputChange('query', e.target.value)}
                className="w-full px-4 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Software Engineer, Data Scientist, Product Manager"
                required
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
                <MapPin className="h-5 w-5 inline mr-2" />
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-4 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., New York, NY or Remote"
                required
              />
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
                Experience Level
              </label>
              <select
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                className="w-full px-4 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {experienceOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Employment Type */}
            <div>
              <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
                <Clock className="h-5 w-5 inline mr-2" />
                Employment Type
              </label>
              <select
                value={formData.employment_type}
                onChange={(e) => handleInputChange('employment_type', e.target.value)}
                className="w-full px-4 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {employmentTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Date Posted */}
            <div>
              <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
                <Calendar className="h-5 w-5 inline mr-2" />
                Date Posted
              </label>
              <select
                value={formData.date_posted}
                onChange={(e) => handleInputChange('date_posted', e.target.value)}
                className="w-full px-4 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {datePostedOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Remote Jobs Only */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remote_jobs_only"
                checked={formData.remote_jobs_only}
                onChange={(e) => handleInputChange('remote_jobs_only', e.target.checked)}
                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="remote_jobs_only" className="ml-3 text-lg text-gray-700 dark:text-gray-300">
                Remote jobs only
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    Search Jobs
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default JobSearchPage;
