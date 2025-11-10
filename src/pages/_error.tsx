import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

interface ErrorProps {
  statusCode?: number;
  err?: Error;
}

function Error({ statusCode, err }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // Check if it's an authentication error
    const isAuthError = 
      err?.message?.includes('auth') ||
      err?.message?.includes('authentication') ||
      err?.message?.includes('token') ||
      err?.message?.includes('session') ||
      err?.message?.includes('unauthorized') ||
      statusCode === 401;

    if (isAuthError) {
      // Clear any stored auth data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        sessionStorage.clear();
      }
      
      // Redirect to login page
      router.replace('/login');
    }
  }, [err, statusCode, router]);

  if (statusCode === 401 || err?.message?.includes('auth')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Session Expired
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Redirecting to login page...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Something went wrong
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {statusCode
            ? `An error ${statusCode} occurred on the server`
            : 'An error occurred on the client'}
        </p>
        {err && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-300 font-mono">
              {err.message}
            </p>
          </div>
        )}
        <div className="flex gap-4">
          <button
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode, err };
};

export default Error;
