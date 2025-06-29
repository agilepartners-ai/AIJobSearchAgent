import React, { useState, useEffect } from 'react';
import { ChevronRight, Zap, Target, Rocket, BarChart3, Users } from 'lucide-react';

interface WorkflowStepProps {
  imageSrc: string;
  title: string;
  description: string;
  index: number;
  isActive: boolean;
  icon: React.ReactNode;
}

const WorkflowStep: React.FC<WorkflowStepProps> = ({ 
  imageSrc, 
  title, 
  description, 
  index, 
  isActive,
  icon 
}) => {
  return (
    <div className={`workflow-step group relative ${isActive ? 'active' : ''}`}>
      {/* Animated Background Glow */}
      <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
      
      {/* Main Card */}
      <div className="relative bg-gradient-to-br from-gray-800/80 via-gray-900/90 to-black/95 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-cyan-400/50 transition-all duration-500 overflow-hidden group-hover:scale-105">
        
        {/* Animated Border Effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/0 via-cyan-400/20 to-cyan-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {/* Step Number with Icon */}
        <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/30 border-4 border-gray-900 group-hover:scale-110 transition-transform duration-300">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 animate-pulse opacity-50"></div>
          <span className="relative z-10">{index}</span>
        </div>

        {/* Icon Badge */}
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-500/30 group-hover:rotate-12 transition-transform duration-300">
          {icon}
        </div>

        {/* Image Container */}
        <div className="relative mb-6 overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10"></div>
          <img 
            src={imageSrc} 
            alt={title} 
            className="w-full h-32 object-contain transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
          />
          
          {/* Floating Particles */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i}
                className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-float"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 2) * 40}%`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '3s'
                }}
              ></div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-20">
          <h3 className="text-xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-blue-400 transition-all duration-300">
            {title}
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
            {description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
          <div className={`h-full bg-gradient-to-r from-cyan-400 to-blue-600 transition-all duration-1000 ${isActive ? 'w-full' : 'w-0'}`}></div>
        </div>
      </div>
    </div>
  );
};

const Workflow: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const workflowSteps = [
    {
      imageSrc: "/Step_1_JobSearch_AI.png",
      title: "AI Job Discovery",
      description: "Our intelligent algorithms scan thousands of opportunities across multiple platforms to find your perfect career matches.",
      icon: <Target size={14} />
    },
    {
      imageSrc: "/Step_2_EditeResume_AI.png",
      title: "Smart Resume Optimization",
      description: "AI-powered customization that adapts your resume and generates compelling cover letters for each specific role.",
      icon: <Zap size={14} />
    },
    {
      imageSrc: "/Step_3_FillApplication_AI.png",
      title: "Automated Applications",
      description: "Streamlined application process with intelligent form filling and submission across career platforms.",
      icon: <Rocket size={14} />
    },
    {
      imageSrc: "/Step_4_KeepTrack_AI.png",
      title: "Progress Analytics",
      description: "Comprehensive tracking dashboard with real-time insights and application status monitoring.",
      icon: <BarChart3 size={14} />
    },
    {
      imageSrc: "/Step_5_MockInterview_AI.png",
      title: "Interview Mastery",
      description: "AI-driven mock interviews with personalized feedback to boost your confidence and performance.",
      icon: <Users size={14} />
    }
  ];

  // Auto-advance steps
  useEffect(() => {
    if (!isHovered) {
      const interval = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % workflowSteps.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isHovered, workflowSteps.length]);

  return (
    <section id="workflow" className="relative py-20 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-black to-gray-900">
        {/* Floating Orbs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-20" style={{ 
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(34, 197, 254, 0.3) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
        
        {/* Animated Lines */}
        <div className="absolute inset-0">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i}
              className="absolute h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent animate-pulse"
              style={{
                top: `${20 + i * 15}%`,
                left: '0',
                right: '0',
                animationDelay: `${i * 0.8}s`,
                animationDuration: '4s'
              }}
            ></div>
          ))}
        </div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full border border-cyan-400/30 mb-6">
            <Zap className="w-5 h-5 text-cyan-400" />
            <span className="text-cyan-400 font-medium text-lg">AI-Powered Workflow</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-white">Career Success in </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 animate-pulse">
              5 Smart Steps
            </span>
          </h2>
          
          <p className="text-gray-300 text-xl leading-relaxed mb-4">
            Experience the future of job hunting with our revolutionary AI-powered platform
          </p>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border border-yellow-400/30">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-yellow-300 font-semibold">
              Transform weeks of work into 15 minutes of AI magic
            </span>
          </div>
        </div>

        {/* Workflow Steps */}
        <div 
          className="relative max-w-7xl mx-auto"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Connection Lines (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent transform -translate-y-1/2 z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/50 to-cyan-400/0 animate-pulse"></div>
          </div>
          
          {/* Animated Chevrons */}
          <div className="hidden lg:flex absolute top-1/2 left-0 right-0 justify-between items-center transform -translate-y-1/2 z-10 px-20">
            {[...Array(4)].map((_, i) => (
              <ChevronRight 
                key={i}
                className="w-6 h-6 text-cyan-400 animate-pulse opacity-60"
                style={{ animationDelay: `${i * 0.5}s` }}
              />
            ))}
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 relative z-20">
            {workflowSteps.map((step, index) => (
              <WorkflowStep
                key={index}
                imageSrc={step.imageSrc}
                title={step.title}
                description={step.description}
                index={index + 1}
                isActive={activeStep === index}
                icon={step.icon}
              />
            ))}
          </div>

          {/* Progress Indicators */}
          <div className="flex justify-center mt-12 space-x-3">
            {workflowSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  activeStep === index
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-600 scale-125 shadow-lg shadow-cyan-400/50'
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
        </div>

        {/* AI Job Search Agent */}
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <img 
              src="/AGENT_Logo.png" 
              alt="AI Job Search Agent" 
              className="h-16 sm:h-20 md:h-24 w-auto"
            />
          </div>
        </div>
        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full hover:from-purple-500 hover:to-blue-500 transition-all duration-300 group cursor-pointer shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105">
            <span className="text-white font-semibold text-lg">
              Start Your AI-Powered Journey
            </span>
            <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Workflow;