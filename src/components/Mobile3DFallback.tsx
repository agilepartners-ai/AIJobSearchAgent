import React from 'react';

interface Mobile3DFallbackProps {
  className?: string;
}

const Mobile3DFallback: React.FC<Mobile3DFallbackProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full h-64 md:h-80 overflow-hidden ${className}`}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-blue-800/20 rounded-lg"></div>      {/* Enhanced symmetrical animated shapes */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Central core with breathing effect */}
          <div className="w-28 h-28 bg-gradient-to-br from-blue-500/70 to-purple-500/70 rounded-lg transform rotate-45 animate-pulse-glow shadow-lg shadow-blue-500/30"></div>
          
          {/* Primary hexagonal ring (6 elements) */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '24s' }}>
            {[...Array(6)].map((_, i) => {
              const angle = (i * 60) - 90; // Starting from top
              const radius = 50;
              const x = Math.cos(angle * Math.PI / 180) * radius;
              const y = Math.sin(angle * Math.PI / 180) * radius;
              
              return (
                <div
                  key={`primary-${i}`}
                  className="absolute w-4 h-4 bg-blue-400/80 rounded transform -translate-x-2 -translate-y-2"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    animationDelay: `${i * 0.2}s`
                  }}
                ></div>
              );
            })}
          </div>
          
          {/* Secondary octagonal ring (8 elements) */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '36s', animationDirection: 'reverse' }}>
            {[...Array(8)].map((_, i) => {
              const angle = (i * 45) - 90;
              const radius = 75;
              const x = Math.cos(angle * Math.PI / 180) * radius;
              const y = Math.sin(angle * Math.PI / 180) * radius;
              
              return (
                <div
                  key={`secondary-${i}`}
                  className="absolute w-3 h-3 bg-purple-400/70 rounded-full transform -translate-x-1.5 -translate-y-1.5"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    animationDelay: `${i * 0.15}s`
                  }}
                ></div>
              );
            })}
          </div>

          {/* Tertiary outer ring (12 elements) */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '48s' }}>
            {[...Array(12)].map((_, i) => {
              const angle = (i * 30) - 90;
              const radius = 100;
              const x = Math.cos(angle * Math.PI / 180) * radius;
              const y = Math.sin(angle * Math.PI / 180) * radius;
              
              return (
                <div
                  key={`tertiary-${i}`}
                  className="absolute w-1.5 h-1.5 bg-blue-300/50 rounded-full transform -translate-x-0.75 -translate-y-0.75"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    animationDelay: `${i * 0.1}s`
                  }}
                ></div>
              );
            })}
          </div>

          {/* Inner micro satellites */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '18s', animationDirection: 'reverse' }}>
            {[...Array(4)].map((_, i) => {
              const angle = (i * 90) - 45;
              const radius = 25;
              const x = Math.cos(angle * Math.PI / 180) * radius;
              const y = Math.sin(angle * Math.PI / 180) * radius;
              
              return (
                <div
                  key={`micro-${i}`}
                  className="absolute w-2 h-2 bg-purple-300/60 rounded transform -translate-x-1 -translate-y-1"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    animationDelay: `${i * 0.25}s`
                  }}
                ></div>
              );
            })}
          </div>
        </div>      </div>
      
      {/* Floating particles - increased quantity */}
      {[...Array(15)].map((_, i) => (
        <div 
          key={i}
          className={`absolute rounded-full animate-float-slow ${
            i % 3 === 0 ? 'w-1 h-1 bg-blue-400/60' : 
            i % 3 === 1 ? 'w-0.5 h-0.5 bg-purple-400/50' : 
            'w-1.5 h-1.5 bg-blue-300/40'
          }`}
          style={{
            left: `${10 + (i * 6)}%`,
            top: `${20 + (i * 4)}%`,
            animationDelay: `${i * 0.3}s`,
            animationDuration: `${3 + i * 0.5}s`
          }}
        ></div>
      ))}
    </div>
  );
};

export default Mobile3DFallback;
