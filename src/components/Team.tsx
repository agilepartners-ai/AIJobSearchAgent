"use client";

import React from 'react';
import { Linkedin, Mail } from 'lucide-react';

interface TeamMemberProps {
  image: string;
  name: string;
  role: string;
  linkedin: string;
  mail: string;
}

const TeamCard: React.FC<TeamMemberProps> = ({ image, name, role, linkedin, mail }) => (
  <div
    className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.07)';
      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.25)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
    }}
  >
    {/* Avatar */}
    <div className="relative flex-shrink-0">
      <img
        src={image}
        alt={name}
        className="rounded-full object-cover"
        style={{ width: '48px', height: '48px', border: '2px solid rgba(124,58,237,0.3)' }}
      />
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
      <p className="text-white font-semibold truncate" style={{ fontSize: '13px', lineHeight: '1.3' }}>{name}</p>
      <p className="truncate" style={{ fontSize: '11px', color: '#a78bfa', lineHeight: '1.4' }}>{role}</p>
    </div>

    {/* Actions — visible on hover */}
    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
      {linkedin !== '#' && (
        <a
          href={linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
          style={{ background: 'rgba(124,58,237,0.25)', color: '#a78bfa' }}
          aria-label={`${name} LinkedIn`}
          onClick={e => e.stopPropagation()}
        >
          <Linkedin size={13} />
        </a>
      )}
      {mail !== '#' && (
        <a
          href={mail}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}
          aria-label={`Email ${name}`}
          onClick={e => e.stopPropagation()}
        >
          <Mail size={13} />
        </a>
      )}
    </div>
  </div>
);

const Team: React.FC = () => {
  const teamMembers: TeamMemberProps[] = [
    {
      image: "https://drive.google.com/thumbnail?id=1vu-VaTML_UREGBrcNaLNVC6MW3PbkNwV",
      name: "Alex Aggarwal",
      role: "CEO & Co-Founder",
      linkedin: "https://www.linkedin.com/in/alexaggarwal/",
      mail: "mailto:alex@agilepartnersinc.com"
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
      mail: "mailto:monaaggarwal@gmail.com"
    },
    {
      image: "https://drive.google.com/thumbnail?id=1vDtI7L9KvUsEHgcdFyz8miFQrPB3LNPk",
      name: "Vandana Pawar",
      role: "AI Process & Cyber Security",
      linkedin: "https://www.linkedin.com/in/vandana-pawar",
      mail: "mailto:vandana.pawar16@yahoo.ca"
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
      role: "DevOps & Infrastructure",
      linkedin: "https://www.linkedin.com/in/tejasbachhav/",
      mail: "mailto:tejasbachhav98@gmail.com"
    },
    {
      image: "https://drive.google.com/thumbnail?id=1j3x3M5xMwVpQZ5KXrXHD2awdAGBRAYU2",
      name: "Yatharath Chopra",
      role: "AI Lead Developer",
      linkedin: "https://www.linkedin.com/in/yatharth-chopra--/",
      mail: "mailto:yc9891966@gmail.com"
    },
    {
      image: "https://drive.google.com/thumbnail?id=1HOZ6jypOi_9ORPqM0LHZNOePPRgN7IJL",
      name: "Vernessa Oraegbu",
      role: "Digital Marketing Manager",
      linkedin: "https://www.linkedin.com/in/vernessa-oraegbu/",
      mail: "mailto:v.oraegbu01@gmail.com"
    },
    {
      image: "https://drive.google.com/thumbnail?id=1Nh11K1mpTnYTU7yVLemomEcomx-5Mufd",
      name: "Medhat Mikhail",
      role: "UX/UI Lead Designer",
      linkedin: "https://www.linkedin.com/in/medhat-mikhail-7886391a4/",
      mail: "mailto:medhat.mikhail10@gmail.com"
    },
    {
      image: "https://drive.google.com/thumbnail?id=1ScTXmo95xMRJn-8FJsiNWalxAoFNSviW",
      name: "Harkeerat Mander",
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
    },
  ];

  return (
    <section id="about" className="py-14 relative" style={{ background: '#110E1F' }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-64 opacity-10 rounded-full"
          style={{ background: 'radial-gradient(ellipse, #7c3aed 0%, transparent 70%)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-0 relative z-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#a78bfa' }}>
              The Team
            </span>
            <h2 className="text-white mt-2">
              The experts behind{' '}
              <span style={{ background: 'linear-gradient(135deg, #818cf8, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                your next offer.
              </span>
            </h2>
          </div>
          <p className="text-gray-500 text-sm max-w-xs sm:text-right">
            {teamMembers.length} specialists in AI, career coaching & product.
          </p>
        </div>

        {/* Compact 3-column directory grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {teamMembers.map((member, index) => (
            <TeamCard key={index} {...member} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Team;
