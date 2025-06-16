import React from 'react';
import { ArrowRight } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <div className="relative min-h-screen flex items-center bg-gray-900">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900/30 to-gray-900 z-0"></div>
      
      {/* Animated Particles */}
      <div className="absolute inset-0 overflow-hidden z-0">
        {[...Array(15)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-blue-500/10 animate-float"
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

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto md:mx-0">
          <span className="inline-block px-4 py-1.5 bg-blue-600/10 rounded-full text-blue-400 font-medium mb-6 backdrop-blur-sm animate-fadeIn">
            Next Generation AI Solutions
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight animate-slideUp">
            Unlocking the Power of AI <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              for Your Job Search
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed animate-slideUp animation-delay-100">
            Agile Partners leverages cutting-edge AI technology to empower your Job Search with actionable insights and a comprehensive understanding of your operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 animate-slideUp animation-delay-200">
            <a 
              href="#contact" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg font-medium text-center flex items-center justify-center gap-2 group transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              Start Your AI Journey
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </a>
            <a 
              href="#services" 
              className="bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 px-8 py-4 rounded-lg font-medium text-center transition-all hover:-translate-y-1"
            >
              Explore Our Services
            </a>
          </div>
        </div>
      </div>

      {/* Scrolldown Indicator */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center animate-bounce">
        <span className="block w-1 h-10 bg-gradient-to-b from-blue-500 to-transparent rounded-full"></span>
        <span className="text-gray-400 text-sm mt-2">Scroll Down</span>
      </div>
    </div>
  );
};

export default Hero;