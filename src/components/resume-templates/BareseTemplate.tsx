import React from 'react';
import { ResumeTemplateProps } from './types';

export const BareseTemplate: React.FC<ResumeTemplateProps> = ({ data, isPreview }) => {
  const {
    fullName,
    email,
    phone,
    location,
    currentJobTitle,
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
  
  const title = currentJobTitle || (detailedResumeSections?.experience?.[0]?.position) || 'Professional';

  return (
    <div
      className={`bg-white font-sans text-gray-900 ${
        isPreview
          ? 'w-[794px] h-[1123px] transform scale-[0.25] origin-top-left overflow-hidden'
          : 'w-[794px] min-h-[1123px]'
      }`}
    >
      {/* Header Area */}
      <div className="p-10 pb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-1">{fullName || 'Your Name'}</h1>
        <p className="text-xl text-gray-600 mb-6 uppercase tracking-wider">{title}</p>
        
        <div className="grid grid-cols-3 gap-4 border-t border-b border-gray-200 py-3 text-xs text-gray-700">
          <div>{phone}</div>
          <div className="text-center">{email}</div>
          <div className="text-right">{location}</div>
        </div>
      </div>

      <div className="p-10 pt-4 flex flex-col gap-8">
        {/* Objective Section */}
        {summary && (
          <div className="flex">
            <div className="w-[20%] pr-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">Objective</h2>
            </div>
            <div className="w-[80%]">
              <p className="text-xs leading-relaxed text-gray-700">{summary}</p>
            </div>
          </div>
        )}

        {/* Education Section */}
        {eduList.length > 0 && (
          <div className="flex">
            <div className="w-[20%] pr-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">Education</h2>
            </div>
            <div className="w-[80%] flex flex-col gap-4">
              {eduList.map((edu: any, idx: number) => (
                <div key={idx}>
                  <div className="flex justify-between items-baseline">
                    <div className="text-sm font-bold text-gray-900">{edu.institution}</div>
                    <div className="text-xs text-gray-600">{edu.location}</div>
                  </div>
                  <div className="flex justify-between items-baseline mt-1">
                    <div className="text-xs text-gray-800">{edu.degree || edu.field_of_study}</div>
                    <div className="text-xs font-bold text-gray-700">{edu.graduation_date || edu.graduationYear}</div>
                  </div>
                  {edu.gpa && <div className="text-xs text-gray-600 mt-1">GPA: {edu.gpa}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills Section */}
        {skillList.length > 0 && (
          <div className="flex">
            <div className="w-[20%] pr-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">Key Skills</h2>
            </div>
            <div className="w-[80%] grid grid-cols-2 gap-x-4 gap-y-1">
              {skillList.map((skill: string, i: number) => (
                <div key={i} className="text-xs text-gray-700 flex items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                  {skill}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Experience Section */}
        {expList.length > 0 && (
          <div className="flex">
            <div className="w-[20%] pr-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">Experience</h2>
            </div>
            <div className="w-[80%] flex flex-col gap-6">
              {expList.map((exp: any, idx: number) => {
                const jobTitle = exp.position || exp.jobTitle;
                const company = exp.company;
                const duration = exp.duration;
                const bullets = exp.achievements || exp.responsibilities || [];
                return (
                  <div key={idx}>
                    <div className="flex justify-between items-baseline mb-1">
                      <div className="text-sm font-bold text-gray-900">{company}</div>
                      <div className="text-xs font-bold text-gray-700">{duration}</div>
                    </div>
                    <div className="text-xs italic text-gray-700 mb-2">{jobTitle}</div>
                    {bullets.length > 0 && (
                      <ul className="list-disc list-outside ml-4 text-xs text-gray-600 space-y-1">
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

        {/* References */}
        {references && (
          <div className="flex border-t border-gray-100 pt-6">
            <div className="w-[20%] pr-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">References</h2>
            </div>
            <div className="w-[80%]">
              <p className="text-xs text-gray-600 italic">Available upon request</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
