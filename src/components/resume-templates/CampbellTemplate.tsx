import React from 'react';
import { ResumeTemplateProps } from './types';

export const CampbellTemplate: React.FC<ResumeTemplateProps> = ({ data, isPreview }) => {
  const {
    fullName,
    email,
    phone,
    location,
    detailedResumeSections,
    jobProfile,
    workExperience,
    education,
    skills,
    references
  } = data;

  const summary = detailedResumeSections?.professional_summary || jobProfile;
  const expList = detailedResumeSections?.experience || workExperience || [];
  const eduList = detailedResumeSections?.education || education || [];
  const skillList = detailedResumeSections?.technical_skills || skills || [];
  
  // Try to parse references or use as a string block
  const refs = references ? (typeof references === 'string' ? [references] : references) : [];

  const contactBarItems = [email, location, phone].filter(Boolean).join(' · ');

  return (
    <div
      className={`bg-white font-sans text-gray-900 relative ${
        isPreview
          ? 'w-[794px] h-[1123px] transform scale-[0.25] origin-top-left overflow-hidden'
          : 'w-[794px] min-h-[1123px]'
      }`}
      style={{ padding: '48px', paddingBottom: '80px' }}
    >
      {/* Name Top Left */}
      <div className="mb-10 border-b-4 border-black pb-4">
        <h1 className="text-5xl font-black tracking-tighter uppercase text-black">{fullName || 'Your Name'}</h1>
      </div>

      <div className="flex gap-8">
        {/* Left Sidebar (~35%) */}
        <div className="w-[35%] flex flex-col gap-8">
          {summary && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest mb-3 text-black">Objective</h2>
              <p className="text-xs leading-relaxed text-gray-700">{summary}</p>
            </div>
          )}

          {skillList.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest mb-3 text-black">Skills & Abilities</h2>
              <ul className="list-disc list-inside text-xs leading-relaxed text-gray-700">
                {skillList.map((skill: string, i: number) => (
                  <li key={i}>{skill}</li>
                ))}
              </ul>
            </div>
          )}

          {refs.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest mb-3 text-black">References</h2>
              <div className="text-xs text-gray-700 whitespace-pre-wrap">
                {refs.map((r: any, idx: number) => (
                  <div key={idx} className="mb-2">
                    {typeof r === 'string' ? r : `${r.name}\n${r.company}\n${r.phone}`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Content (~65%) */}
        <div className="w-[65%] flex flex-col gap-8">
          {expList.length > 0 && (
            <div>
              <div className="border-b-2 border-black mb-4">
                <h2 className="text-sm font-bold uppercase tracking-widest mb-1 text-black text-right">Experience</h2>
              </div>
              <div className="flex flex-col gap-6">
                {expList.map((exp: any, idx: number) => {
                  const company = exp.company;
                  const duration = exp.duration;
                  const jobTitle = exp.position || exp.jobTitle;
                  const bullets = exp.achievements || exp.responsibilities || [];
                  return (
                    <div key={idx}>
                      <div className="flex justify-between items-baseline mb-1">
                        <div className="text-sm font-bold text-black">{company}</div>
                        <div className="text-xs font-bold text-gray-500">{duration}</div>
                      </div>
                      <div className="text-xs italic mb-2 text-gray-800">{jobTitle}</div>
                      {bullets.length > 0 && (
                        <ul className="list-disc list-outside ml-4 text-xs text-gray-700 space-y-1">
                          {bullets.map((b: string, i: number) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {eduList.length > 0 && (
            <div>
              <div className="border-b-2 border-black mb-4">
                <h2 className="text-sm font-bold uppercase tracking-widest mb-1 text-black text-right">Education</h2>
              </div>
              <div className="flex flex-col gap-4">
                {eduList.map((edu: any, idx: number) => {
                  const institution = edu.institution;
                  const location = edu.location;
                  const fieldOfStudy = edu.degree;
                  const notes = edu.honors?.join(', ') || edu.gpa;
                  return (
                    <div key={idx}>
                      <div className="text-sm font-bold text-black">{institution} {location && <span className="font-normal text-gray-600">- {location}</span>}</div>
                      <div className="text-xs text-gray-800 mt-1">{fieldOfStudy}</div>
                      {notes && <div className="text-xs text-gray-600 mt-1">{notes}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Contact Bar */}
      <div className="absolute bottom-8 left-12 right-12 text-center text-xs text-gray-500 font-semibold tracking-widest border-t border-gray-300 pt-4">
        {contactBarItems}
      </div>
    </div>
  );
};
