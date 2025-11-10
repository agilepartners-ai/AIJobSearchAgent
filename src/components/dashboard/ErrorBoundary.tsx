import React, { Component, ErrorInfo, ReactNode } from 'react';
import ApiErrorHandler from '../common/ApiErrorHandler';
import { isAuthenticationError, handleAuthError } from '../../utils/authErrorHandler';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isAuthError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isAuthError: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Check if it's an authentication error using the utility
    const isAuthError = isAuthenticationError(error);

    return {
      hasError: true,
      error,
      errorInfo: null,
      isAuthError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    console.error('Error caught by boundary:', error, errorInfo);

    // If it's an auth error, handle it with the utility
    if (this.state.isAuthError) {
      handleAuthError(error);
    }
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
        errorInfo: null,
        isAuthError: false
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
      // If it's an authentication error, show session expired message
      if (this.state.isAuthError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-yellow-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Session Expired
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your session has expired. Redirecting to login page...
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </div>
        );
      }

      // Check if it's an API error with additional metadata
      const apiError = this.state.error as any;
      
      if (apiError.endpoint && apiError.params) {
        return (
          <ApiErrorHandler
            error={apiError}
            endpoint={apiError.endpoint}
            params={apiError.params}
            statusCode={apiError.statusCode}
            responseData={apiError.responseData}
            onRetry={this.handleRetry}
            onClose={() => this.setState({ hasError: false, error: null, errorInfo: null, isAuthError: false })}
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
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null, isAuthError: false })}
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

export default ErrorBoundary;
