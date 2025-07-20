import React, { useState, useEffect } from 'react';
import { Linkedin, Mail, ChevronLeft, ChevronRight } from 'lucide-react';

interface TeamMemberProps {
  image: string;
  name: string;
  role: string;
  linkedin: string;
  mail: string;
}

const TeamMember: React.FC<TeamMemberProps> = ({ image, name, role, linkedin, mail }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group px-4 py-6 sm:p-6">
      <div className="flex flex-col items-center text-center">
        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden mb-4 ring-4 ring-gray-100 dark:ring-gray-700 group-hover:ring-blue-200 dark:group-hover:ring-blue-800 transition-all">
          <img 
            src={image} 
            alt={name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1">{name}</h3>
        <p className="text-sm sm:text-base text-blue-600 dark:text-blue-400 font-medium mb-3">{role}</p>
        <div className="flex gap-3">
          <a 
            href={linkedin}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            aria-label="LinkedIn profile"
          >
            <Linkedin size={16} />
          </a>
          <a 
            href={mail} 
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  const teamMembers = [
    {
      image: "https://drive.google.com/thumbnail?id=1vu-VaTML_UREGBrcNaLNVC6MW3PbkNwV",
      name: "Alex Aggarwal",
      role: "CEO & Co-Founder",
      linkedin: "https://www.linkedin.com/in/alexaggarwal/",
      mail: "mailto: alex@agilepartnersinc.com"
    },
    {
      image: "https://drive.google.com/thumbnail?id=18EP-eQovSW7pduE7mSaERO213hobW63U",
      name: "Rahul Chandai",
      role: "AI Strategist & Co-Founder",
      linkedin: "https://www.linkedin.com/in/rchandai/",
      mail: "#"
    },
    {
      image: "https://drive.google.com/thumbnail?id=1FwU4tdaQKljzIjkeFKZnlMouqiTcinJx",
      name: "Mona Aggarwal",
      role: "AI Product Manager & Co-Founder",
      linkedin: "https://www.linkedin.com/in/mona-aggarwal-a81b25a/",
      mail : "mailto: monaaggarwal@gmail.com"
    },
    {
      image: "https://drive.google.com/thumbnail?id=1vDtI7L9KvUsEHgcdFyz8miFQrPB3LNPk",
      name: "Vandana Pawar",
      role: "AI Process and Cyber Security Manager",
      linkedin: "https://www.linkedin.com/in/vandana-pawar",
      mail: "mailto: vandana.pawar16@yahoo.ca"
    },
    {
      image: "https://drive.google.com/thumbnail?id=1tq4tc35fh_gUxIS9O1--2k06uE_8mBTq",
      name: "Dawood Wasif",
      role: "AI SME & Development Manager",
      linkedin: "https://www.linkedin.com/in/dwasif/",
      mail: "#"
    },
    {
      image: "https://drive.google.com/thumbnail?id=1oda0llnHkikvQAF7nKY7Xnk3sNTecV2t",
      name: "Tejas Bachhav",
      role: "DevOps & Infrastructure Manager",
      linkedin: "https://www.linkedin.com/in/tejasbachhav/",
      mail: "mailto: tejasbachhav98@gmail.com"
    },
    {
      image: "https://drive.google.com/thumbnail?id=1aW8o1PupeEgLEYDqJr-wmyktT4WCyhew",
      name: "Darcy Liu",
      role: "AI SME & Lead Developer",
      linkedin: "https://www.linkedin.com/in/codejediatuw/",
      mail: "mailto: darcy.ldx@gmail.com"
    },
    {
      image: "https://drive.google.com/thumbnail?id=1j3x3M5xMwVpQZ5KXrXHD2awdAGBRAYU2",
      name: "Yatharath Chopra",
      role: "AI Lead Developer",
      linkedin: "https://www.linkedin.com/in/yatharth-chopra--/",
      mail: "mailto: yc9891966@gmail.com"
    },
    {
      image: "https://drive.google.com/thumbnail?id=1HOZ6jypOi_9ORPqM0LHZNOePPRgN7IJL",
      name: "Vernessa Oraegbu",
      role: "Digital Marketing Manager",
      linkedin: "https://www.linkedin.com/in/vernessa-oraegbu/",
      mail: "mailto: v.oraegbu01@gmail.com"
    },
    {
      image: "https://drive.google.com/thumbnail?id=1Nh11K1mpTnYTU7yVLemomEcomx-5Mufd",
      name: "Medhat Mikhail",
      role: "UX/UI Lead Designer",
      linkedin: "https://www.linkedin.com/in/medhat-mikhail-7886391a4/",
      mail: "mailto: medhat.mikhail10@gmail.com"
    },
    {
      image: "https://drive.google.com/thumbnail?id=1ScTXmo95xMRJn-8FJsiNWalxAoFNSviW",
      name: "Harkeerat Mauder",
      role: "AI Full Stack Developer",
      linkedin: "http://www.linkedin.com/in/harkeerat-mander",
      mail: "#"
    },
    {
      image: "https://drive.google.com/thumbnail?id=1Oh_uloq3B9DiUWLkxQ62_sxcymIRx-NL",
      name: "Nidhi Bajoria",
      role: "Co-op Student",
      linkedin: "#",
      mail: "#"
    }
  ];

  // Get number of cards to show based on screen size
  const getCardsToShow = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) return 4; // lg screens
      if (window.innerWidth >= 768) return 3; // md screens
      if (window.innerWidth >= 640) return 2; // sm screens
      return 1; // mobile
    }
    return 4; // default
  };

  const [cardsToShow, setCardsToShow] = useState(getCardsToShow());

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setCardsToShow(getCardsToShow());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  // Auto-scroll functionality - Continuous rotation
 useEffect(() => {
  if (isHovered) return;

  const interval = setInterval(() => {
    setCurrentIndex((prevIndex) => {
      const maxIndex = teamMembers.length - cardsToShow;
      return prevIndex >= maxIndex ? 0 : prevIndex + 1;
    });
  }, 2000);

  return () => clearInterval(interval);
}, [isHovered, teamMembers.length, cardsToShow]);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => {
      const maxIndex = teamMembers.length - cardsToShow;
      return prevIndex >= maxIndex ? 0 : prevIndex + 1;
    });
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => {
      const maxIndex = teamMembers.length - cardsToShow;
      return prevIndex <= 0 ? maxIndex : prevIndex - 1;
    });
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };
  return (
    <section id="about" className="py-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <span className="text-blue-600 dark:text-blue-400 font-medium text-lg">Our Team</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-gray-900 dark:text-white">
            Meet the Career Experts
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-xl leading-relaxed">
            Our diverse team of career coaches, AI specialists, and industry experts is dedicated to helping you achieve your professional goals.
          </p>        </div>

        {/* Navigation Arrows - Positioned outside carousel */}
        <div className="relative max-w-7xl mx-auto">
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 sm:-translate-x-8 md:-translate-x-12 lg:-translate-x-16 z-10 w-14 h-14 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-xl transition-all group border border-gray-200 dark:border-gray-700"
            aria-label="Previous slide"
          >
            <ChevronLeft size={28} className="group-hover:scale-110 transition-transform" />
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 sm:-translate-x-8 md:-translate-x-12 lg:-translate-x-16 z-10 w-14 h-14 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-xl transition-all group border border-gray-200 dark:border-gray-700"
            aria-label="Next slide"
          >
            <ChevronRight size={28} className="group-hover:scale-110 transition-transform" />
          </button>

          {/* Carousel Track */}
          <div className="overflow-hidden px-4 sm:px-8 md:px-16">
            <div
              className="overflow-hidden mx-16"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * (100 / cardsToShow)}%)` }}
              >
                {teamMembers.map((member, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 px-3"
                    style={{ width: `${100 / cardsToShow}%` }}
                  >
                    <TeamMember 
                      image={member.image}
                      name={member.name}
                      role={member.role}
                      linkedin={member.linkedin}
                      mail={member.mail}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pagination Dots */}
          <div className="flex justify-center mt-8 space-x-2">
            {Array.from({ length: Math.ceil((teamMembers.length - cardsToShow + 1)) }, (_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  currentIndex === index
                    ? 'bg-blue-600 dark:bg-blue-400 scale-125'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Team;