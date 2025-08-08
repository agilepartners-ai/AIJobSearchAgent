"use client";

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle, AlertCircle, Lock, Loader } from 'lucide-react';
import FirebaseAuthService from '../../services/firebaseAuthService';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import PasswordStrengthIndicator from '../ui/PasswordStrengthIndicator';

const ResetPasswordConfirm: React.FC = () => {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validCode, setValidCode] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const oobCode = router.query.oobCode as string;
  const mode = router.query.mode as string;

  useEffect(() => {
    const verifyCode = async () => {
      // Wait for router to be ready
      if (!router.isReady) return;

      if (!oobCode || mode !== 'resetPassword') {
        setError('Invalid or expired password reset link');
        setVerifying(false);
        return;
      }

      try {
        // Verify the password reset code and get the user's email
        const email = await verifyPasswordResetCode(auth, oobCode);
        setUserEmail(email);
        setValidCode(true);
      } catch (error: unknown) {
        console.error('Error verifying reset code:', error);
        setError('Invalid or expired password reset link');
      } finally {
        setVerifying(false);
      }
    };

    verifyCode();
  }, [router.isReady, oobCode, mode]);

  const passwordValidation = FirebaseAuthService.validatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      return;
    }

    if (!oobCode) {
      setError('Invalid reset code');
      return;
    }

    setLoading(true);

    try {
      // Confirm the password reset
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?message=password-reset-success');
      }, 3000);
    } catch (error: unknown) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Failed to reset password';
      
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string; message?: string };
        switch (firebaseError.code) {
          case 'auth/expired-action-code':
            errorMessage = 'Password reset link has expired. Please request a new one';
            break;
          case 'auth/invalid-action-code':
            errorMessage = 'Invalid password reset link. Please request a new one';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. Please choose a stronger password';
            break;
          default:
            errorMessage = firebaseError.message || 'Failed to reset password';
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-400" size={48} />
          <p className="text-white">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!validCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/AGENT_Logo.png" alt="AIJobSearchAgent" className="h-20 w-auto mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-2">Invalid Reset Link</h2>
          </div>
          
          <div className="backdrop-blur-lg bg-white/20 rounded-2xl shadow-xl border border-white/30 p-8">
            <div className="text-center space-y-4">
              <AlertCircle className="mx-auto text-red-400" size={48} />
              <p className="text-red-200">{error}</p>
              <div className="space-y-2">
                <Link 
                  href="/forgot-password"
                  className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Request New Reset Link
                </Link>
                <Link 
                  href="/login"
                  className="block w-full py-2 px-4 text-blue-200 hover:text-white transition-colors"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 transition-colors duration-300">
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-blue-500/10 animate-float"
            style={{
              width: `${Math.random() * 300 + 50}px`,
              height: `${Math.random() * 300 + 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 20 + 15}s`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: Math.random() * 0.5
            }}
          />
        ))}
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <img src="/AGENT_Logo.png" alt="AIJobSearchAgent" className="h-20 w-auto mx-auto mb-6" />
          </Link>
          <h2 className="text-3xl font-bold text-white mb-2">Set New Password</h2>
          <p className="text-blue-100">
            {userEmail && `For ${userEmail}`}
          </p>
        </div>
        
        <div className="backdrop-blur-lg bg-white/20 rounded-2xl shadow-xl border border-white/30 p-8">
          {!success ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/20 backdrop-blur-sm text-red-100 p-4 rounded-xl text-sm border border-red-500/30 flex items-center gap-3">
                  <AlertCircle size={20} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-white">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-blue-200/70" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-blue-200/70 transition-colors duration-300"
                    placeholder="Enter new password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-blue-200/70 hover:text-blue-200" />
                    ) : (
                      <Eye className="h-5 w-5 text-blue-200/70 hover:text-blue-200" />
                    )}
                  </button>
                </div>
                
                {/* Password strength indicator */}
                <PasswordStrengthIndicator 
                  password={password} 
                  showRequirements={password.length > 0}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-blue-200/70" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-blue-200/70 transition-colors duration-300"
                    placeholder="Confirm new password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-blue-200/70 hover:text-blue-200" />
                    ) : (
                      <Eye className="h-5 w-5 text-blue-200/70 hover:text-blue-200" />
                    )}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-300">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !passwordValidation.isValid || password !== confirmPassword}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600/90 to-purple-600/90 hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm transition-all hover:shadow-blue-500/20 hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Update Password
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="bg-green-500/20 backdrop-blur-sm text-green-100 p-6 rounded-xl border border-green-500/30">
                <CheckCircle className="mx-auto mb-4 text-green-300" size={48} />
                <h3 className="text-lg font-semibold mb-2">Password Updated!</h3>
                <p className="text-sm">
                  Your password has been successfully updated.
                </p>
                <p className="text-xs mt-2 opacity-80">
                  Redirecting to sign in...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordConfirm;