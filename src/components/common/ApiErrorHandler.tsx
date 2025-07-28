import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Copy, Check, Globe } from 'lucide-react';

interface ApiErrorHandlerProps {
  error: Error | string;
  endpoint: string;
  params: Record<string, any>;
  responseData?: any;
  statusCode?: number;
  onRetry: (endpoint: string, params: Record<string, any>) => Promise<void>;
  onClose?: () => void;
}

const ApiErrorHandler: React.FC<ApiErrorHandlerProps> = ({
  error,
  endpoint,
  params,
  responseData,
  statusCode,
  onRetry,
  onClose
}) => {
  const [modifiedEndpoint, setModifiedEndpoint] = useState(endpoint);
  const [modifiedParams, setModifiedParams] = useState({ ...params });
  const [loading, setLoading] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [showJsonViewer, setShowJsonViewer] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showCorsHelp, setShowCorsHelp] = useState(isCorsError(error, statusCode));

  const errorMessage = typeof error === 'string' ? error : error.message;

  function isCorsError(error: Error | string, statusCode?: number): boolean {
    const message = typeof error === 'string' ? error : error.message;
    return message.includes('CORS') || 
           message.includes('cross-origin') || 
           statusCode === 0 || 
           (responseData && responseData.type === 'CORS_ERROR');
  }

  const handleParamChange = (key: string, value: any) => {
    setModifiedParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleRetry = async () => {
    setLoading(true);
    setRetryError(null);
    
    try {
      await onRetry(modifiedEndpoint, modifiedParams);
      // If successful, the parent component will handle closing this
    } catch (err: any) {
      setRetryError(err.message || 'Failed to retry request');
    } finally {
      setLoading(false);
    }
  };

  const copyErrorDetails = () => {
    const errorDetails = JSON.stringify({
      endpoint: modifiedEndpoint,
      params: modifiedParams,
      error: errorMessage,
      statusCode,
      responseData
    }, null, 2);
    
    navigator.clipboard.writeText(errorDetails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatJson = (json: any): string => {
    try {
      return JSON.stringify(json, null, 2);
    } catch (e) {
      return 'Invalid JSON data';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-300 dark:border-red-700 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-red-50 dark:bg-red-900/30 p-4 border-b border-red-300 dark:border-red-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">
                API Request Failed {statusCode && `(${statusCode})`}
              </h2>
              <p className="text-red-600 dark:text-red-400 text-sm">
                {errorMessage}
              </p>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* CORS Help Section */}
      {showCorsHelp && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full flex-shrink-0">
              <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-md font-medium text-blue-800 dark:text-blue-300 mb-2">
                CORS Issue Detected
              </h3>
              <p className="text-blue-700 dark:text-blue-400 text-sm mb-3">
                This appears to be a Cross-Origin Resource Sharing (CORS) issue. The server is not allowing requests from your origin.
              </p>
              <div className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
                <p><strong>Server-side solution:</strong> The API server needs to include the following headers:</p>
                <pre className="bg-blue-100 dark:bg-blue-800/50 p-2 rounded text-xs overflow-x-auto">
                  Access-Control-Allow-Origin: {window.location.origin}<br/>
                  Access-Control-Allow-Methods: POST, GET, OPTIONS<br/>
                  Access-Control-Allow-Headers: Content-Type, Authorization<br/>
                  Access-Control-Max-Age: 86400
                </pre>
                <p><strong>Client-side workaround:</strong> Use a proxy server or CORS proxy to route your requests.</p>
                <button
                  onClick={() => setShowCorsHelp(false)}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Hide CORS help
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6 space-y-6">
        {retryError && (
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {retryError}
          </div>
        )}

        {/* Endpoint URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Endpoint
          </label>
          <input
            type="url"
            value={modifiedEndpoint}
            onChange={(e) => setModifiedEndpoint(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Request Parameters */}
        <div>
          <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">
            Request Parameters
          </h3>
          <div className="space-y-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            {Object.entries(modifiedParams).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {key}
                </label>
                {typeof value === 'string' ? (
                  key === 'job_description' || key === 'resume_text' || value.length > 100 ? (
                    <textarea
                      value={value}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm resize-vertical whitespace-pre-wrap"
                      style={{ minHeight: '150px' }}
                      spellCheck="false"
                      wrap="soft"
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  )
                ) : typeof value === 'boolean' ? (
                  <select
                    value={value.toString()}
                    onChange={(e) => handleParamChange(key, e.target.value === 'true')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : typeof value === 'number' ? (
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => handleParamChange(key, Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Complex value (object/array) - edit in JSON viewer
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Response Data */}
        {responseData && (
          <div>
            <div 
              className="flex items-center justify-between cursor-pointer mb-2"
              onClick={() => setShowJsonViewer(!showJsonViewer)}
            >
              <h3 className="text-md font-medium text-gray-800 dark:text-gray-200">
                Error Response Data
              </h3>
              <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                {showJsonViewer ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
            
            {showJsonViewer && (
              <div className="relative">
                <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto text-sm text-gray-800 dark:text-gray-200 max-h-60">
                  {formatJson(responseData)}
                </pre>
                <button 
                  onClick={copyErrorDetails}
                  className="absolute top-2 right-2 p-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  title="Copy error details"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleRetry}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Retry Request
              </>
            )}
          </button>
          
          {/* Documentation Link */}
          <a
            href="https://resumebuilder-arfb.onrender.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ExternalLink size={16} />
            API Docs
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApiErrorHandler;