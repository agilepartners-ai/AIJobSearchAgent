import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import JsonViewer from './JsonViewer';

interface RequestDetailsProps {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  initialExpanded?: boolean;
}

const RequestDetails: React.FC<RequestDetailsProps> = ({
  method,
  url,
  headers,
  body,
  initialExpanded = false
}) => {
  const [expanded, setExpanded] = useState(initialExpanded);

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
      <div 
        className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Request Details
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
            {method}
          </span>
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</h4>
            <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 overflow-x-auto">
              <code className="text-sm text-gray-800 dark:text-gray-200">{url}</code>
            </div>
          </div>
          
          {headers && Object.keys(headers).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Headers</h4>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600">
                {Object.entries(headers).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-2 mb-1 text-sm">
                    <div className="text-gray-600 dark:text-gray-400">{key}:</div>
                    <div className="col-span-2 text-gray-800 dark:text-gray-200">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {body && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Request Body</h4>
              <JsonViewer data={body} maxHeight="200px" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RequestDetails;