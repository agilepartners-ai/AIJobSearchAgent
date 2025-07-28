import React from 'react';
import Interactive3DVisualization from './Interactive3DVisualization';
import Mobile3DFallback from './Mobile3DFallback';

interface Homepage3DBackgroundProps {
  children: React.ReactNode;
}

const Homepage3DBackground: React.FC<Homepage3DBackgroundProps> = ({ children }) => {
  return (
    <div className="relative min-h-screen">
      {/* Full-screen 3D Background */}
      <div className="fixed inset-0 z-0">
        {/* Desktop 3D Visualization - Full Screen */}
        <div className="hidden lg:block w-full h-full">
          <Interactive3DVisualization className="absolute inset-0" />
          {/* Subtle overlay to ensure content readability */}
          <div className="absolute inset-0 bg-gray-900/60 dark:bg-gray-950/70 backdrop-blur-[1px]"></div>
        </div>

        {/* Mobile - Gradient Background with Subtle 3D Elements */}
        <div className="block lg:hidden w-full h-full bg-gradient-to-br from-gray-900 via-blue-900/30 to-gray-900 dark:from-gray-950 dark:via-blue-950/40 dark:to-gray-950">
          {/* Animated Particles for Mobile */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div 
                key={i}
                className="absolute rounded-full bg-blue-500/10 dark:bg-blue-400/10 animate-float"
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
          
          {/* Mobile 3D Fallback - Positioned for background effect */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-30">
            <Mobile3DFallback className="scale-150" />
          </div>
        </div>
      </div>

      {/* Content Layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default Homepage3DBackground;
