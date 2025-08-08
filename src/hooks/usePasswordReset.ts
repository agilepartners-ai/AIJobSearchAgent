import { useState, useCallback } from 'react';
import FirebaseAuthService from '../services/firebaseAuthService';

interface UsePasswordResetReturn {
  sendResetEmail: (email: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  success: boolean;
  resetState: () => void;
}

export const usePasswordReset = (): UsePasswordResetReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const sendResetEmail = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate email format
      if (!email.trim()) {
        throw new Error('Please enter your email address');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      await FirebaseAuthService.sendPasswordResetEmail(email.trim().toLowerCase());
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  }, []);

  const resetState = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  return {
    sendResetEmail,
    loading,
    error,
    success,
    resetState
  };
};

export default usePasswordReset;