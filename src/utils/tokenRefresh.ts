/**
 * Token Refresh and Retry Utility for Firebase Authentication
 * Handles expired token errors and automatic refresh with retry logic
 */

import { auth } from '../lib/firebase';

interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  shouldRetry?: (error: Error) => boolean;
}

interface TokenRefreshResult {
  success: boolean;
  token?: string;
  error?: Error;
}

/**
 * Check if error is a token expiration error
 */
export function isTokenExpiredError(error: unknown): boolean {
  if (!error) return false;

  const err = error as { message?: string; code?: string; toString?: () => string };
  const errorMessage = err.message || err.toString?.() || String(error);
  const errorCode = err.code || '';

  const expiredTokenPatterns = [
    /token.*expired/i,
    /expired.*token/i,
    /signature expired/i,
    /ExpiredToken/i,
    /auth\/id-token-expired/i,
    /auth\/user-token-expired/i,
    /auth\/invalid-user-token/i,
    /Request signature expired/i,
  ];

  return expiredTokenPatterns.some(pattern => 
    pattern.test(errorMessage) || pattern.test(errorCode)
  );
}

/**
 * Refresh the current user's ID token
 */
export async function refreshUserToken(forceRefresh: boolean = true): Promise<TokenRefreshResult> {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return {
        success: false,
        error: new Error('No user is currently signed in'),
      };
    }

    console.log('[TokenRefresh] Refreshing user token...', { forceRefresh });
    
    // Dispatch start event for UI feedback
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tokenRefreshStart'));
    }
    
    // Force refresh the token
    const token = await currentUser.getIdToken(forceRefresh);
    
    console.log('[TokenRefresh] Token refreshed successfully');
    
    // Dispatch end event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tokenRefreshEnd'));
    }
    
    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error('[TokenRefresh] Failed to refresh token:', error);
    
    // Dispatch end event even on error
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tokenRefreshEnd'));
    }
    
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Get current user's ID token with automatic refresh on expiration
 */
export async function getCurrentUserToken(forceRefresh: boolean = false): Promise<string | null> {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.warn('[TokenRefresh] No user is currently signed in');
      return null;
    }

    const token = await currentUser.getIdToken(forceRefresh);
    return token;
  } catch (error) {
    console.error('[TokenRefresh] Failed to get current user token:', error);
    
    // If token is expired, try force refresh
    if (isTokenExpiredError(error)) {
      console.log('[TokenRefresh] Token expired, attempting force refresh...');
      const refreshResult = await refreshUserToken(true);
      return refreshResult.token || null;
    }
    
    return null;
  }
}

/**
 * Retry a function with token refresh on expiration
 * @param fn - Async function to retry
 * @param config - Retry configuration
 */
export async function retryWithTokenRefresh<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 2,
    retryDelay = 1000,
    shouldRetry = isTokenExpiredError,
  } = config;

  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // On retry attempts, refresh the token first
      if (attempt > 0) {
        console.log(`[TokenRefresh] Retry attempt ${attempt}/${maxRetries}`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // Refresh token
        const refreshResult = await refreshUserToken(true);
        if (!refreshResult.success) {
          console.error('[TokenRefresh] Token refresh failed:', refreshResult.error);
          throw refreshResult.error;
        }
        
        console.log('[TokenRefresh] Token refreshed, retrying operation...');
      }
      
      // Execute the function
      const result = await fn();
      return result;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[TokenRefresh] Attempt ${attempt + 1} failed:`, error);
      
      // Check if we should retry
      const errorObj = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries && shouldRetry(errorObj)) {
        console.log('[TokenRefresh] Error is retryable, will retry...');
        continue;
      }
      
      // If we shouldn't retry or max retries reached, throw the error
      throw error;
    }
  }
  
  throw lastError;
}

/**
 * Wrapper for API calls that automatically handles token refresh
 * @param apiCall - Function that makes the API call
 * @param config - Retry configuration
 */
export async function apiCallWithTokenRefresh<T>(
  apiCall: (token: string) => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  return retryWithTokenRefresh(async () => {
    // Get fresh token
    const token = await getCurrentUserToken(config.maxRetries ? true : false);
    
    if (!token) {
      throw new Error('Unable to get authentication token');
    }
    
    // Make API call with token
    return await apiCall(token);
  }, config);
}

/**
 * Hook-compatible function for React components
 * Use this to wrap your API calls in components
 */
export function createTokenRefreshWrapper<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: RetryConfig = {}
) {
  return async (...args: TArgs): Promise<TResult> => {
    return retryWithTokenRefresh(() => fn(...args), config);
  };
}

/**
 * Refresh token and reload component
 * Use this in error boundaries or when catching token errors
 */
export async function handleTokenExpiredError(
  error: unknown,
  onSuccess?: () => void,
  onError?: (error: Error) => void
): Promise<void> {
  if (!isTokenExpiredError(error)) {
    console.log('[TokenRefresh] Error is not a token expiration error');
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    return;
  }

  console.log('[TokenRefresh] Handling expired token error...');
  
  try {
    const refreshResult = await refreshUserToken(true);
    
    if (refreshResult.success) {
      console.log('[TokenRefresh] Token refreshed successfully, invoking success callback');
      onSuccess?.();
    } else {
      console.error('[TokenRefresh] Token refresh failed');
      const err = refreshResult.error || new Error('Token refresh failed');
      onError?.(err);
    }
  } catch (refreshError) {
    console.error('[TokenRefresh] Error during token refresh:', refreshError);
    const err = refreshError instanceof Error ? refreshError : new Error(String(refreshError));
    onError?.(err);
  }
}

/**
 * Monitor token expiration and proactively refresh
 * Call this when initializing your app
 */
export function setupTokenRefreshMonitor(refreshBeforeExpiry: number = 5 * 60 * 1000): () => void {
  let intervalId: NodeJS.Timeout | null = null;
  
  const checkAndRefreshToken = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      // Get token result with expiration time
      const tokenResult = await currentUser.getIdTokenResult();
      const expirationTime = new Date(tokenResult.expirationTime).getTime();
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;
      
      // If token expires in less than refreshBeforeExpiry milliseconds, refresh it
      if (timeUntilExpiry < refreshBeforeExpiry) {
        console.log('[TokenRefresh] Token expiring soon, refreshing proactively...');
        await refreshUserToken(true);
      }
    } catch (error) {
      console.error('[TokenRefresh] Error in token refresh monitor:', error);
    }
  };
  
  // Check every minute
  intervalId = setInterval(checkAndRefreshToken, 60 * 1000);
  
  // Initial check
  checkAndRefreshToken();
  
  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}

const tokenRefreshUtils = {
  isTokenExpiredError,
  refreshUserToken,
  getCurrentUserToken,
  retryWithTokenRefresh,
  apiCallWithTokenRefresh,
  createTokenRefreshWrapper,
  handleTokenExpiredError,
  setupTokenRefreshMonitor,
};

export default tokenRefreshUtils;
