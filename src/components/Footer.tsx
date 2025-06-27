import React from 'react';
import { Facebook, Twitter, Linkedin, Instagram, ArrowUp } from 'lucide-react';

const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-wrap justify-between items-center gap-12 mb-8 w-full">
          {/* Branding & Description */}
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">AJ</span>
            </div>
            <span className="font-bold text-xl text-white whitespace-nowrap">
              AIJobSearchAgent
            </span>
          </div>
          
          {/* Mission Text */}
          <p className="text-gray-400 text-sm max-w-md text-center self-center">
            Empowering professionals to land their dream jobs through AI-powered career tools and expert guidance.
          </p>
          
          {/* Social Icons */}
          <div className="flex space-x-4">
            <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Facebook">
              <Facebook size={20} />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Twitter">
              <Twitter size={20} />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="LinkedIn">
              <Linkedin size={20} />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Instagram">
              <Instagram size={20} />
            </a>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} AIJobSearchAgent. All rights reserved.
          </p>
        </div>
      </div>
      
      <button 
        onClick={scrollToTop} 
        className="fixed bottom-6 right-6 p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all hover:-translate-y-1"
        aria-label="Scroll to top"
      >
        <ArrowUp size={20} />
      </button>
    </footer>
  );
};

export default Footer;