import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { useToastContext } from '../ui/ToastProvider';

const VerifyPhone: React.FC = () => {  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { showInfo } = useToastContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!user) throw new Error('No user found');

      // For demo purposes, accept any 6-digit code
      if (code.length !== 6) {
        throw new Error('Please enter a 6-digit verification code');
      }      // Phone verification not yet implemented with Supabase
      // For now, just simulate verification success
      console.log('Phone verification simulated for code:', code);

      // Route guard will handle redirect to /dashboard
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    try {
      // Simulate resend code
      showInfo('Code Resent', 'Verification code has been resent to your phone.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
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
          <Link to="/" className="inline-block">
            <img src="/AGENT_Logo.png" alt="AIJobSearchAgent" className="h-20 w-auto mx-auto mb-6" />
          </Link>
          <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">Verify Your Phone</h2>
          <p className="text-blue-100">Enter the verification code sent to your phone</p>
        </div>
        
        <div className="backdrop-blur-lg bg-white/20 dark:bg-gray-900/40 rounded-2xl shadow-xl border border-white/30 dark:border-gray-700/50 p-8 transition-all duration-300">
          <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/20 dark:bg-red-900/30 backdrop-blur-sm text-red-100 dark:text-red-200 p-4 rounded-xl text-sm border border-red-500/30 dark:border-red-700/50">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="code" className="block text-sm font-medium text-white dark:text-blue-100">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 block w-full px-4 py-3 bg-white/10 dark:bg-gray-800/30 border border-white/20 dark:border-gray-600/30 rounded-xl backdrop-blur-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent text-white dark:text-blue-50 placeholder-blue-200/70 dark:placeholder-blue-300/50 text-center text-lg tracking-widest transition-colors duration-300"
              placeholder="Enter 6-digit code"
              maxLength={6}
            />
            <p className="mt-1 text-sm text-blue-200/80 dark:text-blue-200/60 text-center">
              For demo purposes, enter any 6-digit code (e.g., 123456)
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600/90 to-purple-600/90 hover:from-blue-600 hover:to-purple-600 dark:from-blue-700/90 dark:to-purple-700/90 dark:hover:from-blue-700 dark:hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 backdrop-blur-sm transition-all hover:shadow-blue-500/20 hover:shadow-xl"
          >
            {loading ? 'Verifying...' : 'Verify Phone Number'}
          </button>

          <button
            type="button"
            onClick={resendCode}
            className="w-full text-center text-sm text-blue-200 dark:text-blue-300 hover:text-white dark:hover:text-white transition-colors mt-4"
          >
            Resend verification code
          </button>
          
          <div className="mt-6 text-center">
            <Link to="/login" className="text-blue-200 dark:text-blue-300 hover:text-white dark:hover:text-white transition-colors">
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};

export default VerifyPhone;