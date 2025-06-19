import React from 'react';
import { Linkedin, Twitter, Mail } from 'lucide-react';

interface TeamMemberProps {
  image: string;
  name: string;
  role: string;
  bio: string;
}

const TeamMember: React.FC<TeamMemberProps> = ({ image, name, role, bio }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group p-6">
      <div className="flex flex-col items-center text-center">
        <div className="w-40 h-40 rounded-full overflow-hidden mb-4 ring-4 ring-gray-100 dark:ring-gray-700 group-hover:ring-blue-200 dark:group-hover:ring-blue-800 transition-all">
          <img 
            src={image} 
            alt={name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{name}</h3>
        <p className="text-blue-600 dark:text-blue-400 font-medium mb-3">{role}</p>
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">{bio}</p>
        <div className="flex gap-3">
          <a 
            href="#" 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            aria-label="LinkedIn profile"
          >
            <Linkedin size={16} />
          </a>
          <a 
            href="#" 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            aria-label="Twitter profile"
          >
            <Twitter size={16} />
          </a>
          <a 
            href="#" 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            aria-label="Email"
          >
            <Mail size={16} />
          </a>
        </div>
      </div>
    </div>
  );
};

const Team: React.FC = () => {
  const teamMembers = [
    {
      image: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
      name: "Dr. Robert Chen",
      role: "Chief Technology Officer",
      bio: "AI researcher with 15+ years experience in machine learning and natural language processing for career optimization."
    },
    {
      image: "https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
      name: "Alexandra Davis",
      role: "Head of Career Services",
      bio: "Former Fortune 500 recruiter turned career coach, helping thousands land their dream jobs through strategic guidance."
    },
    {
      image: "https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
      name: "Marcus Johnson",
      role: "Senior Product Manager",
      bio: "Product strategist specializing in user experience design for career development platforms and job search tools."
    },
    {
      image: "https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
      name: "Priya Sharma",
      role: "Data Science Director",
      bio: "Expert in predictive analytics and job market trends, developing algorithms that match candidates with opportunities."
    },
    {
      image: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
      name: "James Wilson",
      role: "Interview Coach Specialist",
      bio: "Former corporate trainer with expertise in behavioral interviewing and communication skills development."
    },
    {
      image: "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
      name: "Sarah Martinez",
      role: "Resume Writing Expert",
      bio: "Professional resume writer and career consultant with a track record of 95% interview success rate for clients."
    },
    {
      image: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
      name: "David Kim",
      role: "Software Engineering Lead",
      bio: "Full-stack developer building scalable career platforms with focus on user experience and performance optimization."
    },
    {
      image: "https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
      name: "Emily Rodriguez",
      role: "UX/UI Design Director",
      bio: "Design leader creating intuitive interfaces that simplify complex career decisions and job search processes."
    },
    {
      image: "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
      name: "Michael Thompson",
      role: "Business Development Manager",
      bio: "Strategic partnerships expert connecting job seekers with top employers across various industries and sectors."
    },
    {
      image: "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
      name: "Lisa Chang",
      role: "Customer Success Manager",
      bio: "Dedicated to ensuring every user achieves their career goals through personalized support and guidance."
    },
    {
      image: "https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
      name: "Ryan O'Connor",
      role: "Market Research Analyst",
      bio: "Labor market specialist analyzing industry trends and salary data to provide accurate career insights."
    },
    {
      image: "https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
      name: "Amanda Foster",
      role: "Content Strategy Lead",
      bio: "Career content expert creating resources and guides that empower job seekers with actionable insights."
    },
    {
      image: "https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
      name: "Carlos Mendez",
      role: "Quality Assurance Manager",
      bio: "Ensuring platform reliability and user experience excellence through comprehensive testing and optimization."
    },
    {
      image: "https://images.pexels.com/photos/1024311/pexels-photo-1024311.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
      name: "Jennifer Lee",
      role: "HR Technology Consultant",
      bio: "Former CHRO helping bridge the gap between job seekers and modern recruitment technologies and processes."
    }
  ];

  return (
    <section id="about" className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <span className="text-blue-600 dark:text-blue-400 font-medium text-lg">Our Team</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-gray-900 dark:text-white">
            Meet the Career Experts
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-xl leading-relaxed">
            Our diverse team of career coaches, AI specialists, and industry experts is dedicated to helping you achieve your professional goals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {teamMembers.map((member, index) => (
            <TeamMember 
              key={index}
              image={member.image}
              name={member.name}
              role={member.role}
              bio={member.bio}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Team;