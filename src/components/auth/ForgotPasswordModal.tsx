"use client";

import React, { useState } from 'react';
import { PasswordResetService } from '../../services/passwordResetService';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
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
        identifier: identifier.trim().toLowerCase(),
        method
      });
      
      if (result.success) {
        setSuccess(true);
        setIdentifier('');
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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl shadow-xl p-8 m-4 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">Reset Password</h2>
          <p className="text-gray-300 mt-2">Choose how you'd like to receive reset instructions.</p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="bg-green-500/20 text-green-200 p-4 rounded-xl border border-green-500/30">
              <p className="font-semibold">Request Sent!</p>
              <p className="text-sm mt-1">If an account with that email exists, a password reset link has been sent.</p>
            </div>
            <button
              onClick={onClose}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 text-red-200 p-3 rounded-xl text-sm border border-red-500/30">
                {error}
              </div>
            )}
            
            {/* Method Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-white">
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

            <div>
              <label htmlFor="modal-identifier" className="sr-only">
                {method === 'email' ? 'Email address' : 'Phone number'}
              </label>
              <input
                id="modal-identifier"
                type={method === 'email' ? 'email' : 'tel'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                placeholder={method === 'email' ? 'Enter your email address' : 'Enter your phone number'}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60"
            >
              {loading ? 'Sending...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
