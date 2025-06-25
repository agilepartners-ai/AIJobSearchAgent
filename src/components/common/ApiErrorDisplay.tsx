import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ApiErrorDisplayProps {
  error: Error | string;
  statusCode?: number;
  onRetry?: () => void;
}

const ApiErrorDisplay: React.FC<ApiErrorDisplayProps> = ({ 
  error, 
  statusCode, 
  onRetry 
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return (
    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-red-100 dark:bg-red-800 rounded-full">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-1">
            API Request Failed {statusCode && `(${statusCode})`}
          </h3>
          <p className="text-red-600 dark:text-red-400 mb-4">
            {errorMessage}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw size={16} className="mr-2" />
              Retry Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiErrorDisplay;