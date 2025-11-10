import React, { useState, useRef } from 'react';
import { 
  Search, Filter, Edit3, Eye, Trash2, ExternalLink, ChevronLeft, ChevronRight, Briefcase, Sparkles, LayoutGrid, LayoutList 
} from 'lucide-react';
import { format } from 'date-fns';
import { JobApplication } from '../../services/firebaseJobApplicationService';

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
  onLoadAIEnhanced,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRightState, setCanScrollRightState] = useState(true);
  
  const filteredApplications = applications.filter(app => {
    const matchesSearch = (app.position || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (app.company_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  // Update scroll button states
  const updateScrollButtons = () => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRightState(scrollLeft + clientWidth < scrollWidth - 10);
  };
  
  // Listen to scroll events
  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    updateScrollButtons();
    container.addEventListener('scroll', updateScrollButtons);
    
    return () => {
      container.removeEventListener('scroll', updateScrollButtons);
    };
  }, [filteredApplications.length]);
  
  const handleQuickApply = (application: JobApplication) => {
    if (application.job_posting_url) {
      window.open(application.job_posting_url, '_blank', 'noopener,noreferrer');
      if (application.status === 'not_applied' && onUpdateApplicationStatus) {
        onUpdateApplicationStatus(application.id, 'applied');
      }
    }
  };

  // Get actual card width including gap
  const getCardWidth = () => {
    if (!scrollContainerRef.current) return 0;
    const firstCard = scrollContainerRef.current.querySelector('div') as HTMLElement;
    if (!firstCard) return 0;
    const cardRect = firstCard.getBoundingClientRect();
    const gap = 24; // space-x-6 (24px gap)
    return cardRect.width + gap;
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current && currentIndex > 0) {
      const cardWidth = getCardWidth();
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      
      scrollContainerRef.current.scrollTo({
        left: newIndex * cardWidth,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = getCardWidth();
      const containerWidth = container.clientWidth;
      const scrollWidth = container.scrollWidth;
      const maxScroll = scrollWidth - containerWidth;
      
      const newIndex = currentIndex + 1;
      const newScrollPosition = newIndex * cardWidth;
      
      // Only scroll if there's more content to show
      if (newScrollPosition < maxScroll + cardWidth) {
        setCurrentIndex(newIndex);
        container.scrollTo({
          left: Math.min(newScrollPosition, maxScroll),
          behavior: 'smooth'
        });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'interview': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'offer': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatSafeDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return format(date, 'MMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };
  
  const toggleViewMode = () => {
    setViewMode(viewMode === 'card' ? 'table' : 'card');
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm flex flex-col h-full overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Compact Header - Fixed */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span>📋</span> Applications ({filteredApplications.length})
          </h2>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-48">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white/70" size={14} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-white/30 rounded-lg bg-white/10 backdrop-blur text-white placeholder-white/60 focus:ring-2 focus:ring-white/50 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white/70 pointer-events-none" size={14} />
                <select
                  value={statusFilter}
                  onChange={(e) => onStatusFilterChange(e.target.value)}
                  className="pl-8 pr-8 py-1.5 text-sm border border-white/30 rounded-lg bg-white/10 backdrop-blur text-white focus:ring-2 focus:ring-white/50 appearance-none cursor-pointer"
                >
                  <option value="all" className="bg-gray-800">All</option>
                  <option value="not_applied" className="bg-gray-800">Not Applied</option>
                  <option value="applied" className="bg-gray-800">Applied</option>
                  <option value="screening" className="bg-gray-800">Screening</option>
                  <option value="interview" className="bg-gray-800">Interview</option>
                  <option value="offer" className="bg-gray-800">Offer</option>
                  <option value="rejected" className="bg-gray-800">Rejected</option>
                </select>
              </div>
              
              <button 
                onClick={toggleViewMode}
                className="p-1.5 border border-white/30 rounded-lg bg-white/10 backdrop-blur text-white hover:bg-white/20 transition-colors"
                title={viewMode === 'card' ? "Table view" : "Card view"}
              >
                {viewMode === 'card' ? <LayoutList size={16} /> : <LayoutGrid size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card View */}
      {viewMode === 'card' && (
        <div className="relative flex-1 flex flex-col overflow-hidden">
          {filteredApplications.length > 0 ? (
            <>
            <div className="flex-1 flex items-center gap-2">
              {/* Left Navigation Button - Outside cards container */}
              {filteredApplications.length > 3 && (
                <button
                  onClick={scrollLeft}
                  disabled={!canScrollLeft}
                  className="flex-shrink-0 bg-white dark:bg-gray-700 shadow-lg h-24 w-10 hover:w-12 hover:shadow-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center z-10"
                >
                  <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
                </button>
              )}

              {/* Carousel Container - Holds exactly 3 cards */}
              <div className="flex-1 overflow-hidden">
                <div 
                  ref={scrollContainerRef}
                  className="flex gap-4 py-6 scrollbar-hide h-full items-center scroll-smooth overflow-x-auto"
                  style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                    scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  {filteredApplications.map((application) => (
                    <div
                      key={application.id}
                      className="relative flex-shrink-0 bg-white dark:bg-gray-700 rounded-xl shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-600 cursor-pointer flex flex-col h-[calc(100vh-22rem)]"
                      style={{ 
                        scrollSnapAlign: 'start',
                        width: 'calc((100% - 2rem) / 3)' // Exactly 3 cards with gaps
                      }}
                    >
                    {/* Status Corner Indicators */}
                    {application.status === 'applied' && (
                      <div className="absolute top-0 right-0 h-8 w-8 bg-gradient-to-bl from-green-400 to-transparent rounded-tr-xl"></div>
                    )}
                    {application.status === 'not_applied' && (
                      <div className="absolute top-0 right-0 h-8 w-8 bg-gradient-to-bl from-red-400 to-transparent rounded-tr-xl"></div>
                    )}
                    {application.status === 'interviewing' && (
                      <div className="absolute top-0 right-0 h-8 w-8 bg-gradient-to-bl from-yellow-300 to-transparent rounded-tr-xl"></div>
                    )}
                    {application.status === 'offered' && (
                      <div className="absolute top-0 right-0 h-8 w-8 bg-gradient-to-bl from-orange-400 to-transparent rounded-tr-xl"></div>
                    )}
                    {application.status === 'rejected' && (
                      <div className="absolute top-0 right-0 h-8 w-8 bg-gradient-to-bl from-red-700 to-transparent rounded-tr-xl"></div>
                    )}
                    {application.status === 'accepted' && (
                      <div className="absolute top-0 right-0 h-8 w-8 bg-gradient-to-bl from-purple-500 to-transparent rounded-tr-xl"></div>
                    )}
                    {application.status === 'declined' && (
                      <div className="absolute top-0 right-0 h-8 w-8 bg-gradient-to-bl from-gray-200 dark:from-gray-400 to-transparent rounded-tr-xl"></div>
                    )}
                    
                    {/* Card Header - Compact */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-600">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                            {application.position}
                          </h3>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                              <Briefcase size={15} className="mr-1.5" />
                              <span className="text-base font-medium truncate">{application.company_name}</span>
                            </div>
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 ml-2 flex-shrink-0 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                              {formatSafeDate(application.updated_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Body - Compact Content Area */}
                    <div className="p-4 space-y-2 flex-1">
                      {/* Description Preview - 2 lines only */}
                      {application.job_description && (
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                            {application.job_description}
                          </p>
                        </div>
                      )}

                      {/* Notes Preview */}
                      {application.notes && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-500 italic line-clamp-1">
                            "{application.notes}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Card Footer - Compact */}
                    <div className="p-4 pt-0 mt-auto">
                      <div className="space-y-2">
                        {/* Main Action Buttons - Grouped with visual distinction */}
                        <div className="flex flex-col rounded-lg overflow-hidden">
                          {/* Primary Action Button */}
                          {application.job_posting_url && application.status === 'not_applied' && (
                            <button
                              onClick={() => handleQuickApply(application)}
                              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-3 py-2 text-sm font-medium transition-all flex items-center justify-center shadow-sm hover:shadow-md"
                            >
                              <ExternalLink size={14} className="mr-2" />
                              Apply Now
                            </button>
                          )}
                          
                          {application.job_posting_url && application.status !== 'not_applied' && (
                            <button
                              onClick={() => onEditApplication(application)}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-sm font-medium transition-all flex items-center justify-center shadow-sm hover:shadow-md"
                            >
                              <Edit3 size={14} className="mr-2" />
                              View Job
                            </button>
                          )}

                          {/* AI Enhance Button - Always show */}
                          {onLoadAIEnhanced && (
                            <button
                              onClick={() => onLoadAIEnhanced(application)}
                              className="w-full bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 text-sm font-medium transition-all flex items-center justify-center shadow-sm hover:shadow-md mt-1.5"
                            >
                              <Sparkles size={14} className="mr-2" />
                              AI Enhance
                            </button>
                          )}
                        </div>

                        {/* Secondary Action Buttons - Fixed at Bottom */}
                        <div className="flex justify-center space-x-2 pt-1">
                          <button
                            onClick={() => onEditApplication(application)}
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
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
                              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                              title="View Job Description"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          
                          <button
                            onClick={() => onDeleteApplication(application.id)}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
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
              </div>

              {/* Right Navigation Button - Outside cards container */}
              {filteredApplications.length > 3 && (
                <button
                  onClick={scrollRight}
                  disabled={!canScrollRightState}
                  className="flex-shrink-0 bg-white dark:bg-gray-700 shadow-lg h-24 w-10 hover:w-12 hover:shadow-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center z-10"
                >
                  <ChevronRight size={20} className="text-gray-600 dark:text-gray-300" />
                </button>
              )}
            </div>

            {/* Carousel Indicators - Compact Design */}
            {filteredApplications.length > 3 && (
              <div className="flex items-center justify-center gap-1.5 py-3">
                {Array.from({ length: Math.ceil(filteredApplications.length / 3) }).map((_, pageIndex) => {
                  const isActive = currentIndex === pageIndex;
                  return (
                    <button
                      key={pageIndex}
                      onClick={() => {
                        setCurrentIndex(pageIndex);
                        if (scrollContainerRef.current) {
                          const cardWidth = getCardWidth();
                          scrollContainerRef.current.scrollTo({
                            left: pageIndex * cardWidth * 3,
                            behavior: 'smooth'
                          });
                        }
                      }}
                      className={`transition-all rounded-full ${
                        isActive 
                          ? 'w-8 h-2 bg-gradient-to-r from-blue-600 to-purple-600' 
                          : 'w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                      }`}
                      title={`Page ${pageIndex + 1}`}
                    />
                  );
                })}
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {currentIndex + 1} / {Math.ceil(filteredApplications.length / 3)}
                </span>
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
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto">
          {filteredApplications.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 applications-table">
              <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                    Applied Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredApplications.map((application, index) => (
                  <tr 
                    key={application.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      index % 2 === 0 
                        ? 'bg-white dark:bg-gray-800' 
                        : 'bg-gray-50 dark:bg-gray-750'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {application.company_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {application.position}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(application.status || 'not_applied')}`}>
                        {(application.status || 'not_applied').replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatSafeDate(application.application_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatSafeDate(application.updated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onEditApplication(application)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          title="Edit application"
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
                            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                            title="View job description"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        
                        {onLoadAIEnhanced && (
                          <button
                            onClick={() => onLoadAIEnhanced(application)}
                            className="text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 p-1 rounded hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                            title="AI Resume & Cover Letter"
                          >
                            <Sparkles size={16} />
                          </button>
                        )}
                        
                        <button
                          onClick={() => onDeleteApplication(application.id)}
                          className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                          title="Delete application"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                {searchTerm || statusFilter !== 'all' ? 'No applications match your filters.' : 'No applications yet. Add your first application!'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApplicationsTable;
