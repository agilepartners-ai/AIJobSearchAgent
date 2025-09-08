import React from 'react';
import { Search, Plus, Crown, BookOpen, LayoutDashboard } from 'lucide-react';

interface LeftSidebarProps {
  onDashboard?: () => void;
  onFindMoreJobs?: () => void;
  onAddApplication: () => void;
  onSavedResume: () => void;
  onUpgrade: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onDashboard,
  onFindMoreJobs,
  onAddApplication,
  onSavedResume,
  onUpgrade,
}) => {
  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-gray-800 dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 z-30">
      <div className="flex flex-col h-full">
        {/* Logo/Title Section */}
        <div className="p-6 border-b border-gray-900 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">JS</span>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard</h1>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 p-6">
          <nav className="space-y-4">
            {onDashboard && (
              <button
                onClick={onDashboard}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg flex items-center gap-3 transition-all text-sm font-medium"
              >
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </button>
            )}

            {onFindMoreJobs && (
              <button
                onClick={onFindMoreJobs}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg flex items-center gap-3 transition-all text-sm font-medium"
              >
                <Search size={20} />
                <span>Find Jobs</span>
              </button>
            )}

            <button
              onClick={onAddApplication}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg flex items-center gap-3 transition-all text-sm font-medium"
            >
              <Plus size={20} />
              <span>Manual Job Entry</span>
            </button>

            <button
              onClick={onSavedResume}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg flex items-center gap-3 transition-all text-sm font-medium"
            >
              <BookOpen size={20} />
              <span>Saved Resume</span>
            </button>

            <button
              onClick={onUpgrade}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg flex items-center gap-3 transition-all text-sm font-semibold"
            >
              <Crown size={20} />
              <span>Upgrade Pro</span>
            </button>
          </nav>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Job Search Agent
          </p>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;