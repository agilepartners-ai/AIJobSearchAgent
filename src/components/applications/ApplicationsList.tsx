import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { JobApplication, ApplicationStatus } from '../../types/jobApplication';
import { Search, Filter, ArrowUpDown } from 'lucide-react';

interface SortConfig {
  field: keyof JobApplication;
  direction: 'asc' | 'desc';
}

// Mock data for demonstration
const mockApplications: JobApplication[] = [
  {
    id: '1',
    user_id: '1',
    company_name: 'TechCorp Inc.',
    position: 'Senior Software Engineer',
    status: 'interview',
    application_date: '2024-01-15T10:00:00Z',
    last_updated: '2024-01-20T14:30:00Z',
    notes: 'Great company culture, looking forward to the technical interview',
    resume_url: 'https://example.com/resume.pdf',
    cover_letter_url: 'https://example.com/cover-letter.pdf',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T14:30:00Z'
  },
  {
    id: '2',
    user_id: '1',
    company_name: 'StartupXYZ',
    position: 'Frontend Developer',
    status: 'applied',
    application_date: '2024-01-18T09:15:00Z',
    last_updated: '2024-01-18T09:15:00Z',
    notes: 'Exciting startup with innovative products',
    resume_url: 'https://example.com/resume.pdf',
    cover_letter_url: 'https://example.com/cover-letter.pdf',
    created_at: '2024-01-18T09:15:00Z',
    updated_at: '2024-01-18T09:15:00Z'
  },
  {
    id: '3',
    user_id: '1',
    company_name: 'Global Solutions Ltd.',
    position: 'Full Stack Developer',
    status: 'rejected',
    application_date: '2024-01-10T16:45:00Z',
    last_updated: '2024-01-22T11:20:00Z',
    notes: 'Received rejection email, but good interview experience',
    resume_url: 'https://example.com/resume.pdf',
    cover_letter_url: 'https://example.com/cover-letter.pdf',
    created_at: '2024-01-10T16:45:00Z',
    updated_at: '2024-01-22T11:20:00Z'
  }
];

const ApplicationsList: React.FC = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'application_date',
    direction: 'desc'
  });

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      // Mock API call - replace with actual API later
      await new Promise(resolve => setTimeout(resolve, 500));
      setApplications(mockApplications);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof JobApplication) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredAndSortedApplications = applications
    .filter(app => {
      const matchesSearch = 
        app.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      return 0;
    });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Job Applications
        </h1>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Status</option>
                {Object.values(ApplicationStatus).map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('company_name')}
                >
                  <div className="flex items-center gap-2">
                    Company
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('position')}
                >
                  <div className="flex items-center gap-2">
                    Position
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('application_date')}
                >
                  <div className="flex items-center gap-2">
                    Applied Date
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('last_updated')}
                >
                  <div className="flex items-center gap-2">
                    Last Updated
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Documents
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Loading applications...
                  </td>
                </tr>
              ) : filteredAndSortedApplications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No applications found
                  </td>
                </tr>
              ) : (
                filteredAndSortedApplications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {application.company_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {application.position}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${application.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          application.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          application.status === 'interview' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(application.application_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(application.last_updated), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex gap-2">
                        {application.resume_url && (
                          <a
                            href={application.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Resume
                          </a>
                        )}
                        {application.cover_letter_url && (
                          <a
                            href={application.cover_letter_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Cover Letter
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ApplicationsList;