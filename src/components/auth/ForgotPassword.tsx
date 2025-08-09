"use client";

import React, { useState } from 'react';
import { PasswordResetService } from '../../services/passwordResetService';
import Link from 'next/link';

const ForgotPassword: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [method, setMethod] = useState<'email' | 'sms'>('email');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Rate limiting - prevent spam
  React.useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before trying again`);
      return;
    }

    // Validate identifier format
    const validation = PasswordResetService.validateIdentifier(identifier, method);
    if (!validation.valid) {
      setError(validation.error || 'Invalid format');
      return;
    }

    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const result = await PasswordResetService.requestPasswordReset({
        identifier,
        method
      });
      
      if (result.success) {
        setSuccess(true);
        setCooldown(60); // 60 second cooldown
      } else {
        setError(result.message);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset instructions';
      setError(errorMessage);
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
          <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/20 dark:bg-red-900/30 backdrop-blur-sm text-red-100 dark:text-red-200 p-4 rounded-xl text-sm border border-red-500/30 dark:border-red-700/50">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/20 dark:bg-green-900/30 backdrop-blur-sm text-green-100 dark:text-green-200 p-4 rounded-xl text-sm border border-green-500/30 dark:border-green-700/50">
              Check your email for password reset instructions
            </div>
          )}

          {/* Method Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-white dark:text-blue-100">
              Reset method
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="email"
                  checked={method === 'email'}
                  onChange={(e) => setMethod(e.target.value as 'email')}
                  className="mr-2 text-blue-600"
                />
                <span className="text-white">Email</span>
              </label>
              <label className="flex items-center opacity-50">
                <input
                  type="radio"
                  value="sms"
                  checked={method === 'sms'}
                  onChange={(e) => setMethod(e.target.value as 'sms')}
                  className="mr-2 text-blue-600"
                  disabled
                />
                <span className="text-white">SMS (Coming Soon)</span>
              </label>
            </div>
          </div>

          {/* Identifier Input */}
          <div className="space-y-2">
            <label htmlFor="identifier" className="block text-sm font-medium text-white dark:text-blue-100">
              {method === 'email' ? 'Email address' : 'Phone number'}
            </label>
            <input
              id="identifier"
              type={method === 'email' ? 'email' : 'tel'}
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="mt-1 block w-full px-4 py-3 bg-white/10 dark:bg-gray-800/30 border border-white/20 dark:border-gray-600/30 rounded-xl backdrop-blur-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent text-white dark:text-blue-50 placeholder-blue-200/70 dark:placeholder-blue-300/50 transition-colors duration-300"
              placeholder={method === 'email' ? 'Enter your email address' : 'Enter your phone number'}
            />
          </div>

          <button
            type="submit"
            disabled={loading || cooldown > 0}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600/90 to-purple-600/90 hover:from-blue-600 hover:to-purple-600 dark:from-blue-700/90 dark:to-purple-700/90 dark:hover:from-blue-700 dark:hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 backdrop-blur-sm transition-all hover:shadow-blue-500/20 hover:shadow-xl"
          >
            {loading ? 'Sending...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Send reset instructions'}
          </button>
          
          <div className="mt-6 text-center">
            <Link href="/login" className="text-blue-200 dark:text-blue-300 hover:text-white dark:hover:text-white transition-colors">
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};

export default ForgotPassword;