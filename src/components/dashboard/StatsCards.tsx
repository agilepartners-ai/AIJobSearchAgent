import React from 'react';
import { Calendar, Building, FileText, User } from 'lucide-react';

interface StatsCardsProps {
  stats: {
    total: number;
    interviews: number;
    offers: number;
    pending: number;
  };
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Applications</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Interviews Scheduled</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.interviews}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <Building className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Offers Received</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.offers}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Applications</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.pending}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
