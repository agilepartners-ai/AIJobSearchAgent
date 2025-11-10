/**
 * Authentication Error Handler Utility
 * Provides centralized handling of authentication errors and session management
 */

export interface AuthErrorInfo {
  isAuthError: boolean;
  errorCode?: string;
  errorMessage?: string;
  shouldRedirect: boolean;
}

/**
 * Check if an error is authentication-related
 */
export function isAuthenticationError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code || '';

  // Check for common authentication error patterns
  const authErrorPatterns = [
    'auth',
    'token',
    'unauthorized',
    'permission-denied',
    'permission_denied',
    'unauthenticated',
    'session',
    'expired',
    'invalid token',
    'token expired',
    'not authenticated',
    'authentication required'
  ];

  // Check for Firebase-specific auth error codes
  const firebaseAuthErrors = [
    'auth/user-token-expired',
    'auth/user-not-found',
    'auth/requires-recent-login',
    'auth/invalid-user-token',
    'auth/network-request-failed',
    'auth/too-many-requests',
    'auth/user-disabled',
    'auth/id-token-expired',
    'auth/id-token-revoked'
  ];

  // Check message patterns
  const hasAuthPattern = authErrorPatterns.some(pattern => 
    errorMessage.includes(pattern)
  );

  // Check error codes
  const hasAuthCode = firebaseAuthErrors.includes(errorCode);

  // Check HTTP status codes
  const isUnauthorizedStatus = error?.status === 401 || error?.statusCode === 401;

  return hasAuthPattern || hasAuthCode || isUnauthorizedStatus;
}

/**
 * Analyze an error and return detailed information about it
 */
export function analyzeAuthError(error: any): AuthErrorInfo {
  const isAuth = isAuthenticationError(error);

  return {
    isAuthError: isAuth,
    errorCode: error?.code,
    errorMessage: error?.message,
    shouldRedirect: isAuth
  };
}

/**
 * Clear authentication data from storage
 */
export function clearAuthData(): void {
  if (typeof window === 'undefined') return;

  try {
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear any auth-related cookies
    document.cookie.split(';').forEach(cookie => {
      const cookieName = cookie.split('=')[0].trim();
      if (cookieName.toLowerCase().includes('auth') || 
          cookieName.toLowerCase().includes('token') ||
          cookieName.toLowerCase().includes('session')) {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });

    console.log('Auth data cleared');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
}

/**
 * Redirect to login page with optional query parameters
 */
export function redirectToLogin(reason: 'expired' | 'error' | 'unauthorized' = 'expired'): void {
  if (typeof window === 'undefined') return;

  clearAuthData();

  const loginUrl = reason === 'expired' 
    ? '/login?session=expired'
    : reason === 'unauthorized'
    ? '/login?error=unauthorized'
    : '/login?error=auth';

  // Use window.location for hard navigation to ensure clean state
  window.location.href = loginUrl;
}

/**
 * Handle an authentication error
 */
export function handleAuthError(error: any, options?: { redirect?: boolean }): void {
  const errorInfo = analyzeAuthError(error);

  if (!errorInfo.isAuthError) {
    // Not an auth error, let it propagate normally
    return;
  }

  console.error('Authentication error detected:', {
    code: errorInfo.errorCode,
    message: errorInfo.errorMessage
  });

  // Clear auth data
  clearAuthData();

  // Redirect if requested (default is true)
  if (options?.redirect !== false) {
    redirectToLogin('expired');
  }
}

/**
 * Setup global error listeners for authentication errors
 */
export function setupGlobalAuthErrorHandlers(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleError = (event: ErrorEvent) => {
    if (isAuthenticationError(event.error)) {
      console.log('Global error handler: Authentication error detected');
      handleAuthError(event.error);
      event.preventDefault();
    }
  };

  const handleRejection = (event: PromiseRejectionEvent) => {
    if (isAuthenticationError(event.reason)) {
      console.log('Global promise rejection handler: Authentication error detected');
      handleAuthError(event.reason);
      event.preventDefault();
    }
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);

  // Return cleanup function
  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
  };
}
