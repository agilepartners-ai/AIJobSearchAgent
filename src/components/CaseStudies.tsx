import React from 'react';
import { ArrowRight } from 'lucide-react';

interface CaseStudyProps {
  image: string;
  category: string;
  title: string;
  description: string;
  results: string;
}

const CaseStudy: React.FC<CaseStudyProps> = ({ image, category, title, description, results }) => {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
      <div className="h-64 overflow-hidden">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-6">
        <span className="inline-block px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-3">
          {category}
        </span>
        <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-3">{description}</p>
        <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg mb-4">
          <p className="text-green-700 dark:text-green-400 font-medium text-sm">{results}</p>
        </div>
        <a 
          href="#" 
          className="inline-flex items-center text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 group/link"
        >
          Read Success Story
          <ArrowRight size={16} className="ml-2 transition-transform group-hover/link:translate-x-1" />
        </a>
      </div>
    </div>
  );
};

const CaseStudies: React.FC = () => {
  const caseStudies = [
    {
      image: "https://images.pexels.com/photos/5668473/pexels-photo-5668473.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
      category: "Resume & Cover Letter Customization",
      title: "From Generic to Outstanding",
      description: "How Sarah transformed her one-size-fits-all resume into a customized, ATS-optimized masterpiece that landed her 5 interviews in 2 weeks.",
      results: "5x increase in interview callbacks, 40% salary increase"
    },
    {
      image: "https://images.pexels.com/photos/5439381/pexels-photo-5439381.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
      category: "Mock Interview & Q&A Practice",
      title: "Conquering Interview Anxiety",
      description: "Michael overcame his interview nerves through our AI-powered mock interview system and comprehensive Q&A preparation, landing his dream tech role.",
      results: "Went from 0% to 80% interview success rate"
    },
    {
      image: "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
      category: "Job Dashboard & Role Insights",
      title: "Smart Job Discovery Success",
      description: "Jennifer used our intelligent job dashboard to discover hidden opportunities and gain deep insights into roles, leading to her perfect career match.",
      results: "Found dream job in 3 weeks, 60% salary boost"
    }
  ];

  return (
    <section id="case-studies" className="py-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12">
          <div className="max-w-2xl mb-6 md:mb-0">
            <span className="text-blue-600 dark:text-blue-400 font-medium text-lg">Success Stories</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-gray-900 dark:text-white">
              Real Results, Real People
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-xl leading-relaxed">
              See how our career services have helped professionals like you achieve their goals and advance their careers.
            </p>
          </div>
          <a 
            href="#" 
            className="inline-flex items-center text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 text-lg"
          >
            View All Success Stories
            <ArrowRight size={20} className="ml-2" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {caseStudies.map((study, index) => (
            <CaseStudy 
              key={index}
              image={study.image}
              category={study.category}
              title={study.title}
              description={study.description}
              results={study.results}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CaseStudies;