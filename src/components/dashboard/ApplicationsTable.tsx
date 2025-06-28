import React, { useState, useRef } from 'react';
import { Search, Filter, Edit3, Eye, Trash2, ExternalLink, ChevronLeft, ChevronRight, Briefcase, Calendar, Clock, Video, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { JobApplication } from '../../types/supabase';

interface ApplicationsTableProps {
  applications: JobApplication[];
  searchTerm: string;
  statusFilter: string;
  onSearchTermChange: (term: string) => void;
  onStatusFilterChange: (status: string) => void;
  onEditApplication: (application: JobApplication) => void;
  onViewJobDescription: (job: { title: string; company: string; description: string }) => void;
  onDeleteApplication: (id: string) => void;
  onUpdateApplicationStatus?: (id: string, status: string) => void;
  onStartInterview?: (application: JobApplication) => void;
  onLoadAIEnhanced?: (application: JobApplication) => void;
}

const ApplicationsTable: React.FC<ApplicationsTableProps> = ({
  applications,
  searchTerm,
  statusFilter,
  onSearchTermChange,
  onStatusFilterChange,
  onEditApplication,
  onViewJobDescription,
  onDeleteApplication,
  onUpdateApplicationStatus,
  onStartInterview,
  onLoadAIEnhanced,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardWidth = 320; // Width of each card + margin
  const handleQuickApply = async (application: JobApplication) => {
    try {
      const url = application.job_posting_url;
      if (url) {
        // Update status to 'applied' if currently 'not_applied'
        if (application.status === 'not_applied' && onUpdateApplicationStatus) {
          console.log('ApplicationsTable: Updating status to applied for', application.id);
          onUpdateApplicationStatus(application.id, 'applied');
        }
        window.open(url, '_blank');
      } else {
        console.log('No application URL available');
      }
    } catch (error) {
      console.error('Error during quick apply:', error);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const newIndex = Math.max(0, currentIndex - 1);
      setCurrentIndex(newIndex);
      scrollContainerRef.current.scrollTo({
        left: newIndex * cardWidth,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const maxIndex = Math.max(0, filteredApplications.length - 3);
      const newIndex = Math.min(maxIndex, currentIndex + 1);
      setCurrentIndex(newIndex);
      scrollContainerRef.current.scrollTo({
        left: newIndex * cardWidth,
        behavior: 'smooth'
      });
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
          </div>        </div>
      </div>

      {/* Carousel Container with space for external navigation */}
      <div className="relative mx-12">
        {filteredApplications.length > 0 ? (
          <>
            {/* Carousel Navigation Buttons - Moved outside */}
            {filteredApplications.length > 3 && (
              <>
                <button
                  onClick={scrollLeft}
                  disabled={currentIndex === 0}
                  className="absolute -left-12 top-1/2 transform -translate-y-1/2 z-10 bg-white dark:bg-gray-700 shadow-lg rounded-full p-3 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-600"
                >
                  <ChevronLeft size={24} className="text-gray-600 dark:text-gray-300" />
                </button>
                <button
                  onClick={scrollRight}
                  disabled={currentIndex >= Math.max(0, filteredApplications.length - 3)}
                  className="absolute -right-12 top-1/2 transform -translate-y-1/2 z-10 bg-white dark:bg-gray-700 shadow-lg rounded-full p-3 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-600"
                >
                  <ChevronRight size={24} className="text-gray-600 dark:text-gray-300" />
                </button>
              </>
            )}

            {/* Carousel Content */}
            <div 
              ref={scrollContainerRef}
              className="flex overflow-x-auto space-x-6 px-6 py-6 scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {filteredApplications.map((application) => (
                <div
                  key={application.id}
                  className="flex-shrink-0 w-80 bg-white dark:bg-gray-700 rounded-xl shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-600 cursor-pointer"
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {application.position}
                        </h3>
                        <div className="flex items-center text-gray-600 dark:text-gray-400 mb-3">
                          <Briefcase size={16} className="mr-2" />
                          <span className="text-sm">{application.company_name}</span>
                        </div>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status || 'not_applied')}`}>
                        {(application.status || 'not_applied').replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-4">
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Calendar size={14} className="mr-2" />
                        <div>
                          <div className="text-xs font-medium">Applied</div>
                          <div>{formatSafeDate(application.application_date)}</div>
                        </div>
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Clock size={14} className="mr-2" />
                        <div>
                          <div className="text-xs font-medium">Updated</div>
                          <div>{formatSafeDate(application.updated_at)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Description Preview */}
                    {application.job_description && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                          {application.job_description.substring(0, 120)}...
                        </p>
                      </div>
                    )}

                    {/* Notes Preview */}
                    {application.notes && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                          "{application.notes.substring(0, 60)}..."
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Footer - Actions */}
                  <div className="p-6 pt-0">
                    <div className="space-y-3">
                      {/* Main Action Buttons - Grouped with visual distinction */}
                      <div className="flex flex-col border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                        {/* Primary Action Button */}
                        {application.job_posting_url && application.status === 'not_applied' && (
                          <button
                            onClick={() => handleQuickApply(application)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center border-b border-blue-200/30"
                          >
                            <ExternalLink size={14} className="mr-2" />
                            Apply Now
                          </button>
                        )}
                        
                        {application.job_posting_url && application.status !== 'not_applied' && (
                          <button
                            onClick={() => window.open(application.job_posting_url || '', '_blank')}
                            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center border-b border-gray-200/30"
                          >
                            <ExternalLink size={14} className="mr-2" />
                            View Job
                          </button>
                        )}

                        {/* Feature Buttons - Connected with distinction */}
                        {application.job_description && onStartInterview && (
                          <button
                            onClick={() => onStartInterview(application)}
                            className={`w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center ${
                              onLoadAIEnhanced ? 'border-b border-purple-200/30' : ''
                            }`}
                          >
                            <Video size={14} className="mr-2" />
                            Practice Interview
                          </button>
                        )}

                        {onLoadAIEnhanced && (
                          <button
                            onClick={() => onLoadAIEnhanced(application)}
                            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center"
                          >
                            <Sparkles size={14} className="mr-2" />
                            AI Resume & Cover Letter
                          </button>
                        )}
                      </div>

                      {/* Secondary Action Buttons */}
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => onEditApplication(application)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit Application"
                        >
                          <Edit3 size={16} />
                        </button>
                        
                        {application.job_description && (
                          <button
                            onClick={() => onViewJobDescription({
                              title: application.position,
                              company: application.company_name,
                              description: application.job_description || ''
                            })}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="View Job Description"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        
                        <button
                          onClick={() => onDeleteApplication(application.id)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete Application"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Carousel Indicators */}
            {filteredApplications.length > 3 && (
              <div className="flex justify-center space-x-2 pb-6">
                {Array.from({ length: Math.ceil(filteredApplications.length / 3) }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentIndex(index);
                      if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTo({
                          left: index * cardWidth,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      Math.floor(currentIndex / 3) === index
                        ? 'bg-blue-600'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
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
