import React from 'react';
import { ChevronRight, Zap, } from 'lucide-react';

interface WorkflowStepProps {
  imageSrc: string;
  title: string;
  description: string;
  index: number;
}

const WorkflowStep: React.FC<WorkflowStepProps> = ({ imageSrc, title, description, index }) => {
  return (
    <div className="relative bg-gradient-to-b from-purple-600/20 to-blue-600/20 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border-2 border-transparent hover:border-blue-500/30 transition-all hover:-translate-y-1 hover:shadow-blue-500/10 hover:shadow-xl">
      <div className="flex flex-col items-center text-center">
        <img 
          src={imageSrc} 
          alt={title} 
          className="w-24 h-24 sm:w-36 sm:h-36 object-contain mb-4"
        />
        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-sm sm:text-base text-gray-300">{description}</p>
        <div className="absolute -left-4 sm:-left-8 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30 border-2 border-gray-800">
          {index}
        </div>
      </div>
    </div>
  );
};

const Workflow: React.FC = () => {
  const workflowSteps = [
    {
      imageSrc: "/Step_1_JobSearch_AI.png",
      title: "Search Jobs",
      description: "Our AI scans thousands of job postings to find perfect matches for your skills and preferences."
    },
    {
      imageSrc: "/Step_2_EditeResume_AI.png",
      title: "Customize Resume",
      description: "With one click tailor your resume and generate a cover letter for each job description."
    },
    {
      imageSrc: "/Step_3_FillApplication_AI.png",
      title: "Apply Instantly",
      description: "Submit your applications effortlessly using autofill for each position on career websites."
    },
    {
      imageSrc: "/Step_4_KeepTrack_AI.png",
      title: "Track Progress",
      description: "Monitor and keep track of all your applications in one dashboard with real-time status updates."
    },
    {
      imageSrc: "/Step_5_MockInterview_AI.png",
      title: "Interview Prep",
      description: "Practice with AI-powered mock interviews tailored to the specific job and company."
    }
  ];

  return (
    <section id="workflow" className="py-20 bg-gradient-to-b from-gray-900 to-gray-800 relative overflow-hidden">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{ 
          backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.2) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.2) 2%, transparent 0%)',
          backgroundSize: '100px 100px'
        }}></div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <span className="text-blue-400 font-medium text-lg">What We Offer</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-white">
            Effortless Job Hunting!
          </h2>
          <p className="text-gray-300 text-xl leading-relaxed mb-4">
            Save your time and increase your chances of success with our AI-powered platform
          </p>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border border-yellow-400/30">
            <Zap className="text-yellow-400 animate-pulse" size={20} />
            <span className="text-yellow-300 font-semibold">15 minutes = Days of traditional job searching</span>
          </div>
        </div>

        {/* Workflow Section */}
        <div className="relative max-w-6xl mx-auto">
          {/* Workflow steps */}
          <div className="px-2 sm:px-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-6 lg:gap-8 mb-20">
              {workflowSteps.map((step, index) => (
                <WorkflowStep
                  key={index}
                  imageSrc={step.imageSrc}
                  title={step.title}
                  description={step.description}
                  index={index + 1}
                />
              ))}
            </div>
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