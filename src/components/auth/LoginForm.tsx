import React, { useState } from 'react';
import SupabaseAuthService from '../../services/supabaseAuthService';
import { Link } from 'react-router-dom';

const LoginForm: React.FC = () => {  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await SupabaseAuthService.signIn({ email, password });
      // Route guard will handle redirect to /job-search
    } catch (err: any) {
      setError(err.message);
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
          <Link to="/" className="inline-block">
            <img src="/AGENT_Logo.png" alt="AIJobSearchAgent" className="h-20 w-auto mx-auto mb-6" />
          </Link>
          <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">Welcome Back</h2>
          <p className="text-blue-100">Sign in to your account</p>
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
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-white/30 dark:border-gray-600/50 rounded bg-white/20 dark:bg-gray-800/30"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-white dark:text-blue-100">
                Remember me
              </label>
            </div>
            <div className="text-sm">
              <a href="/forgot-password" className="text-blue-200 dark:text-blue-300 hover:text-white dark:hover:text-white transition-colors">
                Forgot your password?
              </a>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600/90 to-purple-600/90 hover:from-blue-600 hover:to-purple-600 dark:from-blue-700/90 dark:to-purple-700/90 dark:hover:from-blue-700 dark:hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 backdrop-blur-sm transition-all hover:shadow-blue-500/20 hover:shadow-xl"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          
          <div className="mt-6 text-center">
            <Link to="/register" className="text-blue-200 dark:text-blue-300 hover:text-white dark:hover:text-white transition-colors">
              Don't have an account? <span className="font-medium">Sign up</span>
            </Link>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};

export default LoginForm;