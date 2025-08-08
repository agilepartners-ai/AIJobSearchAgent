"use client";

import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import FirebaseAuthService from '../../services/firebaseAuthService';
import Link from 'next/link';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Start cooldown timer
  const startCooldown = () => {
    setResendCooldown(60); // 60 seconds cooldown
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate email
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await FirebaseAuthService.sendPasswordResetEmail(email.trim().toLowerCase());
      setSuccess(true);
      startCooldown();
    } catch (err: any) {
      console.error('Password reset error:', err);
      
      // Handle specific Firebase auth errors
      let errorMessage = 'Failed to send password reset email';
      
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setError('');
    setLoading(true);

    try {
      await FirebaseAuthService.sendPasswordResetEmail(email.trim().toLowerCase());
      setSuccess(true);
      startCooldown();
    } catch (err: any) {
      setError('Failed to resend email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 transition-colors duration-300">
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-blue-500/10 dark:bg-blue-400/5 animate-float"
            style={{
              width: `${Math.random() * 300 + 50}px`,
              height: `${Math.random() * 300 + 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 20 + 15}s`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: Math.random() * 0.5
            }}
          ></div>
        ))}
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <img src="/AGENT_Logo.png" alt="AIJobSearchAgent" className="h-20 w-auto mx-auto mb-6" />
          </Link>
          <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">Reset Your Password</h2>
          <p className="text-blue-100">We'll send you instructions to reset your password</p>
        </div>
        
        <div className="backdrop-blur-lg bg-white/20 dark:bg-gray-900/40 rounded-2xl shadow-xl border border-white/30 dark:border-gray-700/50 p-8 transition-all duration-300">
          {!success ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/20 dark:bg-red-900/30 backdrop-blur-sm text-red-100 dark:text-red-200 p-4 rounded-xl text-sm border border-red-500/30 dark:border-red-700/50 flex items-center gap-3">
                  <AlertCircle size={20} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-white dark:text-blue-100">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-blue-200/70 dark:text-blue-300/50" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-white/10 dark:bg-gray-800/30 border border-white/20 dark:border-gray-600/30 rounded-xl backdrop-blur-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent text-white dark:text-blue-50 placeholder-blue-200/70 dark:placeholder-blue-300/50 transition-colors duration-300"
                    placeholder="Enter your email address"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-blue-200/70 dark:text-blue-300/50">
                  We'll send you a link to reset your password
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim() || !isValidEmail(email)}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600/90 to-purple-600/90 hover:from-blue-600 hover:to-purple-600 dark:from-blue-700/90 dark:to-purple-700/90 dark:hover:from-blue-700 dark:hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm transition-all hover:shadow-blue-500/20 hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail size={16} />
                    Send reset instructions
                  </>
                )}
              </button>
              
              <div className="mt-6 text-center">
                <Link 
                  href="/login" 
                  className="inline-flex items-center gap-2 text-blue-200 dark:text-blue-300 hover:text-white dark:hover:text-white transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to sign in
                </Link>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="bg-green-500/20 dark:bg-green-900/30 backdrop-blur-sm text-green-100 dark:text-green-200 p-6 rounded-xl border border-green-500/30 dark:border-green-700/50">
                <CheckCircle className="mx-auto mb-4 text-green-300" size={48} />
                <h3 className="text-lg font-semibold mb-2">Email Sent!</h3>
                <p className="text-sm">
                  We've sent password reset instructions to <strong>{email}</strong>
                </p>
                <p className="text-xs mt-2 opacity-80">
                  Check your inbox and spam folder
                </p>
              </div>

              <div className="space-y-4">
                <div className="text-sm text-blue-200/70 dark:text-blue-300/50">
                  Didn't receive the email?
                </div>
                
                <button
                  onClick={handleResend}
                  disabled={loading || resendCooldown > 0}
                  className="w-full py-2 px-4 text-sm font-medium text-blue-200 dark:text-blue-300 hover:text-white dark:hover:text-white border border-blue-300/30 rounded-lg hover:border-blue-300/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? (
                    `Resend in ${resendCooldown}s`
                  ) : loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="animate-spin" size={14} />
                      Sending...
                    </span>
                  ) : (
                    'Resend email'
                  )}
                </button>

                <Link 
                  href="/login" 
                  className="inline-flex items-center justify-center gap-2 w-full py-2 px-4 text-sm font-medium text-blue-200 dark:text-blue-300 hover:text-white dark:hover:text-white transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back to sign in
                </Link>
              </div>
            </div>
          )}
      </div>
      </div>
    </div>
  );
};

export default ForgotPassword;