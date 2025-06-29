import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Interactive3DVisualization from './Interactive3DVisualization';
import Mobile3DFallback from './Mobile3DFallback';
import Typewriter from './Typewriter';

const Hero: React.FC = () => {
  return (
    <div className="relative min-h-screen flex items-center bg-gray-900 dark:bg-gray-950 overflow-hidden">      {/* Full-section 3D Background - Expanded Coverage */}
      <div className="absolute inset-0 z-0 overflow-hidden">        {/* Desktop 3D Visualization - Full Section Background with Extended Area */}
        <div className="hidden lg:block absolute -inset-10 w-[calc(100%+5rem)] h-[calc(100%+5rem)]">
          <Interactive3DVisualization className="absolute inset-0 w-full h-full scale-110" />
          {/* Stronger overlay for better text readability */}
          <div className="absolute inset-0 bg-gray-900/60 dark:bg-gray-950/70"></div>
        </div>{/* Mobile - Enhanced Gradient Background with Larger 3D Elements */}
        <div className="block lg:hidden w-full h-full bg-gradient-to-br from-gray-900 via-blue-900/40 to-gray-900 dark:from-gray-950 dark:via-blue-950/50 dark:to-gray-950">
          {/* Enhanced Animated Particles for Mobile */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(30)].map((_, i) => (
              <div 
                key={i}
                className="absolute rounded-full bg-blue-500/15 dark:bg-blue-400/15 animate-float"
                style={{
                  width: `${Math.random() * 400 + 80}px`,
                  height: `${Math.random() * 400 + 80}px`,
                  left: `${Math.random() * 120 - 10}%`,
                  top: `${Math.random() * 120 - 10}%`,
                  animationDuration: `${Math.random() * 25 + 20}s`,
                  animationDelay: `${Math.random() * 8}s`,
                  opacity: Math.random() * 0.6 + 0.1
                }}
              ></div>
            ))}
          </div>
          
          {/* Mobile 3D Fallback - Larger and More Prominent */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-50">
            <Mobile3DFallback className="scale-200" />
          </div>
          
          {/* Additional background 3D elements */}
          <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 opacity-25">
            <Mobile3DFallback className="scale-150" />
          </div>
          <div className="absolute bottom-1/4 right-1/4 transform translate-x-1/2 translate-y-1/2 opacity-25">
            <Mobile3DFallback className="scale-150" />
          </div>
        </div>
      </div>

      {/* Content Layer */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col-reverse lg:flex-row items-center justify-between min-h-screen py-20 pb-28 sm:pb-32 gap-4 sm:gap-6 lg:gap-12">
          {/* Left: Text */}
          <div className="text-center lg:text-left flex-1 max-w-2xl mx-auto lg:mx-0">
            <span className="inline-block px-6 py-2 bg-blue-600/40 dark:bg-blue-500/40 rounded-full text-blue-200 dark:text-blue-100 font-medium mb-3 backdrop-blur-md animate-fadeIn border border-blue-400/30 shadow-lg">
              AI-Powered Career Success
            </span>            <h1 className="text-3xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white mb-3 leading-tight drop-shadow-2xl">
              <Typewriter 
                text="Land Your Dream Job"
                speed={60}
                delay={500}
                className="block mb-0"
              />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-400 dark:from-blue-200 dark:to-purple-300 drop-shadow-lg">
                <Typewriter 
                  text="With Smart AI Tools"
                  speed={60}
                  delay={1800}
                />
              </span>
            </h1><p className="text-lg lg:text-xl text-gray-100 dark:text-gray-200 mb-6 leading-relaxed max-w-xl lg:max-w-none mx-auto lg:mx-0 drop-shadow-lg font-medium opacity-0 animate-fadeIn" style={{ animationDelay: '3s', animationFillMode: 'forwards' }}>
              Transform your job search with our intelligent platform. Get personalized resume optimization, practice with AI-powered mock interviews, and discover opportunities tailored to your skills and career goals.
            </p>            <div className="flex flex-col sm:flex-row gap-4 lg:justify-start justify-center items-center lg:items-start opacity-0 animate-fadeIn" style={{ animationDelay: '3.5s', animationFillMode: 'forwards' }}>
              <Link 
                to="/login" 
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-5 rounded-xl font-semibold text-center flex items-center justify-center gap-2 group transition-all hover:-translate-y-2 hover:shadow-2xl shadow-blue-500/40 backdrop-blur-sm border border-blue-400/20 text-lg"
              >
                Start Your Career Journey
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a 
                href="#workflow" 
                className="w-full sm:w-auto bg-white/20 dark:bg-white/15 backdrop-blur-md text-white hover:bg-white/30 dark:hover:bg-white/25 px-10 py-5 rounded-xl font-semibold text-center transition-all hover:-translate-y-2 border border-white/30 hover:border-white/50 shadow-lg text-lg"
              >
                Explore Our Services
              </a>
            </div>
          </div>
          {/* Right: Main Image */}
          <div className="flex-1 flex justify-center items-center animate-fadeIn" style={{ animationDelay: '1.5s', animationFillMode: 'forwards' }}>
            <img
              src="/Man_and_AI_2_Glow.png"
              alt="A man interacting with an AI-powered interface, symbolizing career success through technology"
              className="w-48 sm:w-64 md:w-[20rem] lg:w-[24rem] xl:w-[28rem] max-w-full h-auto animate-float-slow transition-all duration-300"
            />
          </div>
        </div>
      </div>
      {/* Enhanced Scrolldown Indicator */}
      <div className="absolute bottom-6 w-full flex justify-center z-20 pointer-events-none">
        <div className="flex flex-col items-center animate-bounce">
          <div className="w-1 h-10 bg-gradient-to-b from-blue-400 dark:from-blue-300 to-transparent rounded-full mb-2 shadow-lg shadow-blue-400/40"></div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-200 dark:text-gray-300 drop-shadow-md">
            Scroll Down
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
