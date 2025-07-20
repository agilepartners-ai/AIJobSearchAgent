import React from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  linkText: string;
  linkHref: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle, linkText, linkHref }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center drop-shadow-lg">
          <Link to="/\" className="inline-block">
            <img src="/AGENT_Logo.png" alt="Agile Partners\" className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto" />
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>
        {children}
        <div className="text-center">
          <Link to={linkHref} className="text-blue-600 dark:text-blue-400 hover:underline">
            {linkText}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;