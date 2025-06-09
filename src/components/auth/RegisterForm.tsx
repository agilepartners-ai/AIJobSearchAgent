import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
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
    try {
      // Add default country code if not provided
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber}`;
      return isValidPhoneNumber(formattedNumber);
    } catch (err) {
      return false;
    }
  };

  const formatPhoneNumber = (phoneNumber: string) => {
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

    if (!validatePhone(phone)) {
      setError('Please enter a valid phone number (e.g., 5869255600 or +15869255600)');
      return;
    }

    const formattedPhone = formatPhoneNumber(phone);
    setLoading(true);

    try {
      // Mock registration - replace with actual auth service later
      if (email && password && formattedPhone) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock successful registration
        const user = {
          id: Date.now().toString(),
          email,
          phone: formattedPhone,
          phone_verified: false,
          membership_status: 'free'
        };
        
        localStorage.setItem('user', JSON.stringify(user));
        navigate('/verify-phone');
      } else {
        throw new Error('Please fill in all required fields');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Start your journey with us"
      linkText="Already have an account? Sign in"
      linkHref="/login"
    >
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5869255600"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter your 10-digit phone number. US numbers only (+1 will be added automatically)
            </p>
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default RegisterForm;