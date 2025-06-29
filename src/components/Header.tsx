import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header 
      className={`fixed w-full z-[60] z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-gray-900/95 backdrop-blur-sm shadow-lg py-4' 
          : 'bg-transparent py-6'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Left side - Main Logo and Powered By Logo */}
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 lg:space-x-5">
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="/AGENT_Logo.png" 
                alt="AIJobSearchAgent" 
                className="h-6 sm:h-7 md:h-10 lg:h-11 w-auto transition-all duration-300"
              />
            </Link>
            
            {/* Powered By Logo - Moved closer with responsive spacing */}
            <a 
              href="https://bolt.new/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 items-center justify-center"
            >
              <img 
                src="/logotext_poweredby_360w.png" 
                alt="Powered By" 
                className="h-6 sm:h-7 md:h-10 lg:h-11 w-auto opacity-90 hover:opacity-100 transition-all duration-300"
              />
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {['Workflow', 'About', 'Contact'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase().replace(' ', '-')}`}
                className={`font-medium transition-colors ${
                  scrolled 
                    ? 'text-white/90 hover:text-white' 
                    : 'text-white/90 hover:text-white'
                }`}
              >
                {item}
              </a>
            ))}
            <Link 
              to="/login" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg font-medium hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              Sign In
            </Link>
          </nav>

          {/* Mobile Navigation Toggle */}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg focus:outline-none"
            aria-label="Toggle Menu"
          >
            {isOpen ? (
              <X className={`transition-colors ${scrolled ? 'text-white' : 'text-white'}`} size={24} />
            ) : (
              <Menu className={`transition-colors ${scrolled ? 'text-white' : 'text-white'}`} size={24} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 transition-all duration-300 ease-in-out ${
          isOpen ? 'block opacity-100' : 'hidden opacity-0'
        }`}
      >
        <div className="container mx-auto px-4 py-4 space-y-4 min-h-[50vh]">
          {['Workflow', 'About', 'Contact'].map((item) => (
            <a 
              key={item} 
              href={`#${item.toLowerCase().replace(' ', '-')}`}
              className="block py-2 text-white/90 hover:text-white font-medium transition-colors"
              onClick={() => setIsOpen(false)}
            >
              {item}
            </a>
          ))}
          <Link 
            to="/login" 
            className="block w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium text-center transition-all"
            onClick={() => setIsOpen(false)}
          >
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;