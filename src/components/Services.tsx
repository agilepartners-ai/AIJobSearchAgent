import React from 'react';
import { Brain, BarChart as ChartBar, Shield, Users, Zap, Code } from 'lucide-react';

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, description }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 border border-gray-100 dark:border-gray-700">
      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{description}</p>
    </div>
  );
};

const Services: React.FC = () => {
  const services = [
    {
      icon: <Brain size={24} />,
      title: "AI Solution Job Search Agent",
      description: "Agile Partners delivers end-to-end AI solutions designed to streamline your job search process with exceptional speed and reliability. Our AI-powered services are tailored to optimize your search operations and support sustainable growth, ensuring a seamless and efficient experience throughout your job search journey."
    },
    {
      icon: <ChartBar size={24} />,
      title: "AI-Powered Analytics",
      description: "Transform your raw data into actionable intelligence with our advanced analytics solutions powered by artificial intelligence."
    },
    {
      icon: <Shield size={24} />,
      title: "Secure AI Implementation",
      description: "Implement AI solutions with enterprise-grade security, ensuring your data and algorithms are protected at every level."
    },
    {
      icon: <Users size={24} />,
      title: "Machine learning application",
      description: "Strategic guidance on how to leverage AI technologies to solve complex business problems and drive innovation."
    },
    {
      icon: <Zap size={24} />,
      title: "Process Automation",
      description: "Streamline operations and reduce costs with intelligent automation solutions that learn and improve over time."
    },
    {
      icon: <Code size={24} />,
      title: "Custom AI Development",
      description: "End-to-end development of AI applications tailored to your unique business requirements and industry challenges."
    }
  ];

  return (
    <section id="services" className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-blue-600 dark:text-blue-400 font-medium">Our Services</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-4 text-gray-900 dark:text-white">
            Comprehensive AI Solutions
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            We offer a wide range of AI services designed to help your business thrive in the digital age.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <ServiceCard 
              key={index}
              icon={service.icon}
              title={service.title}
              description={service.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;