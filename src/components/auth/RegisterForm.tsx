import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SupabaseAuthService from '../../services/supabaseAuthService';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

const RegisterForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validatePhone = (phoneNumber: string) => {
    if (!phoneNumber) return true; // Phone is optional
    try {
      // Add default country code if not provided
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber}`;
      return isValidPhoneNumber(formattedNumber);
    } catch (err) {
      return false;
    }
  };

  const formatPhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber) return '';
    try {
      // Add default country code if not provided
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber}`;
      const parsed = parsePhoneNumber(formattedNumber);
      return parsed?.format('E.164') || phoneNumber;
    } catch (err) {
      return phoneNumber;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (phone && !validatePhone(phone)) {
      setError('Please enter a valid phone number (e.g., 5869255600 or +15869255600)');
      return;
    }    const formattedPhone = phone ? formatPhoneNumber(phone) : '';
    setLoading(true);

    try {
      await SupabaseAuthService.signUp({ 
        email, 
        password, 
        phone: formattedPhone 
      });
      
      if (formattedPhone) {
        navigate('/verify-phone');
      } else {
        // Route guard will handle redirect to /dashboard
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
          <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">Create an Account</h2>
          <p className="text-blue-100">Start your journey with us</p>
        </div>
        
        <div className="backdrop-blur-lg bg-white/20 dark:bg-gray-900/40 rounded-2xl shadow-xl border border-white/30 dark:border-gray-700/50 p-8 transition-all duration-300">
          <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/20 dark:bg-red-900/30 backdrop-blur-sm text-red-100 dark:text-red-200 p-4 rounded-xl text-sm border border-red-500/30 dark:border-red-700/50">
              {error}
            </div>
          )}
          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-white dark:text-blue-100">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-white/10 dark:bg-gray-800/30 border border-white/20 dark:border-gray-600/30 rounded-xl backdrop-blur-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent text-white dark:text-blue-50 placeholder-blue-200/70 dark:placeholder-blue-300/50 transition-colors duration-300"
                placeholder="Enter your email"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-white dark:text-blue-100">
                Phone number (optional)
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="5869255600"
                className="mt-1 block w-full px-4 py-3 bg-white/10 dark:bg-gray-800/30 border border-white/20 dark:border-gray-600/30 rounded-xl backdrop-blur-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent text-white dark:text-blue-50 placeholder-blue-200/70 dark:placeholder-blue-300/50 transition-colors duration-300"
              />
              <p className="mt-1 text-sm text-blue-200/80 dark:text-blue-200/60">
                Enter your 10-digit phone number. US numbers only (+1 will be added automatically)
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-white dark:text-blue-100">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-white/10 dark:bg-gray-800/30 border border-white/20 dark:border-gray-600/30 rounded-xl backdrop-blur-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent text-white dark:text-blue-50 placeholder-blue-200/70 dark:placeholder-blue-300/50 transition-colors duration-300"
                placeholder="Create a password"
                minLength={6}
              />
              <p className="mt-1 text-sm text-blue-200/80 dark:text-blue-200/60">
                Password must be at least 6 characters long
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-white dark:text-blue-100">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-white/10 dark:bg-gray-800/30 border border-white/20 dark:border-gray-600/30 rounded-xl backdrop-blur-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent text-white dark:text-blue-50 placeholder-blue-200/70 dark:placeholder-blue-300/50 transition-colors duration-300"
                placeholder="Confirm your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600/90 to-purple-600/90 hover:from-blue-600 hover:to-purple-600 dark:from-blue-700/90 dark:to-purple-700/90 dark:hover:from-blue-700 dark:hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 backdrop-blur-sm transition-all hover:shadow-blue-500/20 hover:shadow-xl"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
          
          <div className="mt-6 text-center">
            <Link to="/login" className="text-blue-200 dark:text-blue-300 hover:text-white dark:hover:text-white transition-colors">
              Already have an account? <span className="font-medium">Sign in</span>
            </Link>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};

export default RegisterForm;