import React from 'react';
import { Search, Filter, Edit3, Eye, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { JobApplication } from '../../types/jobApplication';

interface ApplicationsTableProps {
  applications: JobApplication[];
  searchTerm: string;
  statusFilter: string;
  hoveredJob: string | null;
  onSearchTermChange: (term: string) => void;
  onStatusFilterChange: (status: string) => void;
  onEditApplication: (application: JobApplication) => void;
  onViewJobDescription: (job: { title: string; company: string; description: string }) => void;
  onDeleteApplication: (id: string) => void;
  onJobHover: (id: string | null) => void;
  onUpdateApplicationStatus?: (id: string, status: string) => void;
}

const ApplicationsTable: React.FC<ApplicationsTableProps> = ({
  applications,
  searchTerm,
  statusFilter,
  hoveredJob,
  onSearchTermChange,
  onStatusFilterChange,
  onEditApplication,
  onViewJobDescription,
  onDeleteApplication,
  onJobHover,
  onUpdateApplicationStatus,
}) => {  const handleQuickApply = async (application: JobApplication) => {
    try {
      const url = application.job_posting_url;
      if (url) {
        // Update status to 'applied' if currently 'not_applied'
        if (application.status === 'not_applied' && onUpdateApplicationStatus) {
          onUpdateApplicationStatus(application.id, 'applied');
        }
        window.open(url, '_blank');
      } else {
        console.log('No application URL available');
        // Could show a toast notification here
      }
    } catch (error) {
      console.error('Error during quick apply:', error);
      // Could show error toast notification here
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'interview': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'offer': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatSafeDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm relative">
      {/* Centered tooltip overlay */}
      {hoveredJob && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 bg-gray-900 text-white text-xs rounded-lg p-4 shadow-lg z-50 pointer-events-none">
          {(() => {
            const application = filteredApplications.find(app => app.id === hoveredJob);
            if (!application) return null;
            
            return (
              <div className="space-y-2">
                <div className="font-semibold text-blue-300 text-sm">
                  {application.position} - {application.company_name}
                </div>
                {application.job_description && (
                  <div>
                    <p className="font-semibold text-yellow-300">Description:</p>
                    <p className="text-gray-200">{application.job_description.substring(0, 200)}...</p>
                  </div>
                )}
                {application.notes && (
                  <div>
                    <p className="font-semibold text-yellow-300">Notes:</p>
                    <p className="text-gray-200">{application.notes}</p>
                  </div>
                )}
                <p className="text-xs text-green-300 mt-2 font-medium">
                  {application.status === 'applied' 
                    ? 'Click to view job posting' 
                    : 'Click to apply to this job'
                  }
                </p>
              </div>
            );
          })()}
        </div>
      )}
      
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Applications ({filteredApplications.length})
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Status</option>
                <option value="not_applied">Not Applied</option>
                <option value="applied">Applied</option>
                <option value="screening">Screening</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
                <option value="accepted">Accepted</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Position & Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Applied Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredApplications.map((application) => (
              <tr
                key={application.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onMouseEnter={() => onJobHover(application.id)}
                onMouseLeave={() => onJobHover(null)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {application.position}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {application.company_name}
                      </div>
                    </div>
                  </div>
                </td><td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status || 'not_applied')}`}>
                    {(application.status || 'not_applied').replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatSafeDate(application.application_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatSafeDate(application.last_updated)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2 relative">
                    <button
                      onClick={() => onEditApplication(application)}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                    
                    {application.job_description && (
                      <button                        onClick={() => onViewJobDescription({
                          title: application.position,
                          company: application.company_name,
                          description: application.job_description || ''
                        })}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                    )}
                    
                    <button
                      onClick={() => onDeleteApplication(application.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>                      {application.job_posting_url ? (
                      <button
                        onClick={() => handleQuickApply(application)}
                        className={`px-3 py-1 rounded text-xs flex items-center gap-1 transition-all font-medium ${
                          application.status === 'applied' 
                            ? 'bg-green-100 hover:bg-green-200 text-green-700 border border-green-300'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                        title={application.status === 'applied' ? 'View job posting' : 'Apply to this job'}
                      >
                        <ExternalLink size={12} />
                        {application.status === 'applied' ? 'View' : 'Apply'}
                      </button>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 text-xs">No link available</span>
                        <button
                          onClick={() => onEditApplication(application)}
                          className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs flex items-center gap-1 transition-all"
                        >
                          <ExternalLink size={12} />
                          Add Link
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredApplications.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' ? 'No applications match your filters.' : 'No applications yet. Add your first application!'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationsTable;
