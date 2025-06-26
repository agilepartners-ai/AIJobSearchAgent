import React from 'react';
import { FileText, MessageCircle, Briefcase } from 'lucide-react';

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
}

const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, description, features }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm hover:shadow-lg transition-all hover:-translate-y-2 border border-gray-100 dark:border-gray-700 group">
      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">{description}</p>
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3"></div>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
};

const Services: React.FC = () => {
  const services = [
    {
      icon: <FileText size={32} />,
      title: "Resume & Cover Letter Customization",
      description: "Transform your resume and cover letters with AI-powered customization that matches job requirements and highlights your unique strengths for each application.",
      features: [
        "ATS-optimized formatting and keywords",
        "Industry-specific templates and layouts",
        "Personalized content suggestions",
        "Real-time optimization feedback",
        "Multiple format exports (PDF, Word, etc.)",
        "Cover letter auto-generation"
      ]
    },
    {
      icon: <MessageCircle size={32} />,
      title: "Mock Interview & Questions & Answers",
      description: "Practice with our AI interviewer that adapts to your industry and role, providing personalized feedback and comprehensive Q&A preparation to boost your confidence.",
      features: [
        "Role-specific interview questions database",
        "AI-powered mock interview sessions",
        "Real-time performance analysis",
        "Body language and speech coaching",
        "Behavioral interview preparation",
        "Technical interview practice"
      ]
    },
    {
      icon: <Briefcase size={32} />,
      title: "Job Dashboard with Job Description & Role",
      description: "Discover and track opportunities with our intelligent job matching system that provides detailed job descriptions, role insights, and company information.",
      features: [
        "Personalized job recommendations",
        "Detailed job descriptions and requirements",
        "Company culture and benefits insights",
        "Application tracking and status updates",
        "Salary benchmarking and negotiation tips",
        "Role compatibility scoring"
      ]
    }
  ];

  return (
    <section id="services" className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <span className="text-blue-600 dark:text-blue-400 font-medium text-lg">Our Services</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-gray-900 dark:text-white">
            Comprehensive Career Solutions
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-xl leading-relaxed">
            From resume optimization to interview preparation, we provide everything you need to accelerate your career and land your dream job.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {services.map((service, index) => (
            <ServiceCard 
              key={index}
              icon={service.icon}
              title={service.title}
              description={service.description}
              features={service.features}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;