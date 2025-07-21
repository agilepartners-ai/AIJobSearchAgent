import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface JsonViewerProps {
  data: any;
  initialExpanded?: boolean;
  maxHeight?: string;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ 
  data, 
  initialExpanded = true,
  maxHeight = '300px'
}) => {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatValue = (value: any): JSX.Element | string => {
    if (value === null) return <span className="text-gray-500">null</span>;
    if (value === undefined) return <span className="text-gray-500">undefined</span>;
    
    switch (typeof value) {
      case 'boolean':
        return <span className="text-purple-600 dark:text-purple-400">{value.toString()}</span>;
      case 'number':
        return <span className="text-blue-600 dark:text-blue-400">{value}</span>;
      case 'string':
        return <span className="text-green-600 dark:text-green-400">"{value}"</span>;
      default:
        return JSON.stringify(value);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
      <div 
        className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Response Data
          </span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard();
          }}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Copy to clipboard"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      
      {expanded && (
        <div 
          className="p-4 overflow-auto font-mono text-sm"
          style={{ maxHeight }}
        >
          <pre className="text-gray-800 dark:text-gray-200">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default JsonViewer;