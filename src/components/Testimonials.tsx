import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface TestimonialProps {
  content: string;
  name: string;
  role: string;
  company: string;
  image: string;
  previousRole?: string;
}

const Testimonial: React.FC<TestimonialProps> = ({ content, name, role, company, image, previousRole }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex gap-1 mb-6">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={18} className="text-yellow-400 fill-yellow-400" />
        ))}
      </div>
      <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-6">
        "{content}"
      </p>
      <div className="flex items-center">
        <img 
          src={image} 
          alt={name} 
          className="w-12 h-12 rounded-full object-cover mr-4"
        />
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">{name}</h4>
          <p className="text-blue-600 dark:text-blue-400 font-medium text-sm">{role} at {company}</p>
          {previousRole && (
            <p className="text-gray-500 dark:text-gray-400 text-xs">Previously: {previousRole}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const Testimonials: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const testimonials = [
    {
      content: "The resume optimization service completely transformed my job search. I went from getting zero responses to landing interviews at top tech companies. The AI-powered suggestions were spot-on!",
      name: "Sarah Johnson",
      role: "Senior Software Engineer",
      company: "Google",
      previousRole: "Junior Developer",
      image: "https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
    },
    {
      content: "The mock interview practice was a game-changer. I was terrified of interviews, but the AI coaching helped me build confidence and perfect my answers. I aced every interview after that!",
      name: "Michael Chen",
      role: "Product Manager",
      company: "Microsoft",
      previousRole: "Business Analyst",
      image: "https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
    },
    {
      content: "The job dashboard helped me discover opportunities I never would have found on my own. The personalized recommendations were incredibly accurate and saved me hours of searching.",
      name: "Dr. Emily Rodriguez",
      role: "Data Scientist",
      company: "Netflix",
      previousRole: "Research Analyst",
      image: "https://images.pexels.com/photos/5397723/pexels-photo-5397723.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <span className="text-blue-600 dark:text-blue-400 font-medium text-lg">Testimonials</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-gray-900 dark:text-white">
            Career Success Stories
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-xl leading-relaxed">
            Hear from professionals who transformed their careers with our AI-powered job search platform.
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Mobile View - Single Testimonial */}
          <div className="block md:hidden">
            <Testimonial 
              content={testimonials[currentSlide].content}
              name={testimonials[currentSlide].name}
              role={testimonials[currentSlide].role}
              company={testimonials[currentSlide].company}
              image={testimonials[currentSlide].image}
              previousRole={testimonials[currentSlide].previousRole}
            />
            <div className="flex justify-center mt-8 gap-4">
              <button 
                onClick={prevSlide}
                className="p-3 rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                aria-label="Previous testimonial"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={nextSlide}
                className="p-3 rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                aria-label="Next testimonial"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Desktop View - All Testimonials */}
          <div className="hidden md:grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Testimonial 
                key={index}
                content={testimonial.content}
                name={testimonial.name}
                role={testimonial.role}
                company={testimonial.company}
                image={testimonial.image}
                previousRole={testimonial.previousRole}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;