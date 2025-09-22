import React, { Component, ErrorInfo, ReactNode } from 'react';
import ApiErrorHandler from './ApiErrorHandler';

interface ApiErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ApiErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ApiError extends Error {
  endpoint?: string;
  params?: Record<string, any>;
  statusCode?: number;
  responseData?: any;
}

class ApiErrorBoundary extends Component<ApiErrorBoundaryProps, ApiErrorBoundaryState> {
  constructor(props: ApiErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ApiErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    console.error('API Error caught by boundary:', error, errorInfo);
  }

  handleRetry = async (endpoint: string, params: Record<string, any>): Promise<void> => {
    try {
      // Make a new request with the modified parameters
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      // If successful, reset the error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
      
    } catch (error) {
      // Update the error state with the new error
      this.setState({
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  };

  render() {
    if (this.state.hasError) {
      // Check if it's an API error with additional metadata
      const apiError = this.state.error as ApiError;
      
      if (apiError.endpoint && apiError.params) {
        return (
          <ApiErrorHandler
            error={apiError}
            endpoint={apiError.endpoint}
            params={apiError.params}
            statusCode={apiError.statusCode}
            responseData={apiError.responseData}
            onRetry={this.handleRetry}
            onClose={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          />
        );
      }
      
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default error UI
      return (
        <div className="p-6 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-700">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
            Something went wrong
          </h2>
          <p className="text-red-600 dark:text-red-400 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ApiErrorBoundary;