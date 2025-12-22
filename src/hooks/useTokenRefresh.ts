/**
 * React Hook for Token Refresh
 * Provides easy-to-use hooks for handling token expiration in React components
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import {
  retryWithTokenRefresh,
  handleTokenExpiredError,
  setupTokenRefreshMonitor,
  isTokenExpiredError,
  refreshUserToken,
} from '../utils/tokenRefresh';

/**
 * Hook to automatically retry API calls on token expiration
 * @example
 * const { execute, loading, error } = useTokenRefresh();
 * const data = await execute(() => fetchData());
 */
export function useTokenRefresh<T = unknown>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);

    try {
      const result = await retryWithTokenRefresh(fn, {
        maxRetries: 2,
        retryDelay: 1000,
      });
      
      if (mountedRef.current) {
        setLoading(false);
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      if (mountedRef.current) {
        setError(error);
        setLoading(false);
      }
      
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  return {
    execute,
    loading,
    error,
    reset,
  };
}

/**
 * Hook to handle token expired errors with automatic refresh
 * @example
 * const handleError = useTokenExpiredHandler({
 *   onRefreshSuccess: () => console.log('Token refreshed'),
 *   onRefreshError: (err) => console.error(err),
 * });
 * 
 * try {
 *   await someApiCall();
 * } catch (error) {
 *   handleError(error);
 * }
 */
export function useTokenExpiredHandler(callbacks?: {
  onRefreshSuccess?: () => void;
  onRefreshError?: (error: Error) => void;
}) {
  const { onRefreshSuccess, onRefreshError } = callbacks || {};

  return useCallback(
    async (error: unknown) => {
      if (isTokenExpiredError(error)) {
        await handleTokenExpiredError(error, onRefreshSuccess, onRefreshError);
        return true; // Handled
      }
      return false; // Not handled
    },
    [onRefreshSuccess, onRefreshError]
  );
}

/**
 * Hook to setup automatic token refresh monitoring
 * @example
 * useTokenRefreshMonitor(); // In your root component
 */
export function useTokenRefreshMonitor(refreshBeforeExpiry: number = 5 * 60 * 1000) {
  useEffect(() => {
    console.log('[useTokenRefreshMonitor] Setting up token refresh monitor');
    const cleanup = setupTokenRefreshMonitor(refreshBeforeExpiry);
    
    return () => {
      console.log('[useTokenRefreshMonitor] Cleaning up token refresh monitor');
      cleanup();
    };
  }, [refreshBeforeExpiry]);
}

/**
 * Hook for manual token refresh
 * @example
 * const { refresh, refreshing } = useManualTokenRefresh();
 * await refresh();
 */
export function useManualTokenRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);

    try {
      const result = await refreshUserToken(true);
      
      if (result.success) {
        setLastRefreshTime(new Date());
        console.log('[useManualTokenRefresh] Token refreshed successfully');
      } else {
        throw result.error || new Error('Token refresh failed');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setRefreshError(err);
      console.error('[useManualTokenRefresh] Token refresh error:', err);
      throw err;
    } finally {
      setRefreshing(false);
    }
  }, []);

  return {
    refresh,
    refreshing,
    lastRefreshTime,
    error: refreshError,
  };
}



/**
 * Hook to wrap a callback with token refresh retry logic
 * @example
 * const handleSubmit = useCallbackWithTokenRefresh(async () => {
 *   await saveData();
 * }, []);
 */
export function useCallbackWithTokenRefresh<TArgs extends unknown[], TResult>(
  callback: (...args: TArgs) => Promise<TResult>,
  deps: React.DependencyList
) {
  return useCallback(
    async (...args: TArgs): Promise<TResult> => {
      return retryWithTokenRefresh(() => callback(...args), {
        maxRetries: 2,
        retryDelay: 1000,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );
}

const tokenRefreshHooks = {
  useTokenRefresh,
  useTokenExpiredHandler,
  useTokenRefreshMonitor,
  useManualTokenRefresh,
  useCallbackWithTokenRefresh,
};

export default tokenRefreshHooks;
