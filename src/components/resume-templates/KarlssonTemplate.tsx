import React from 'react';
import { ResumeTemplateProps } from './types';

export const KarlssonTemplate: React.FC<ResumeTemplateProps> = ({ data, isPreview }) => {
  const {
    fullName,
    email,
    phone,
    website,
    portfolio,
    detailedResumeSections,
    jobProfile,
    currentJobTitle,
    workExperience,
    education,
    skills
  } = data;

  const title = currentJobTitle || jobProfile?.split('.')[0] || 'Professional';
  const summary = detailedResumeSections?.professional_summary || jobProfile;
  const expList = detailedResumeSections?.experience || workExperience || [];
  const eduList = detailedResumeSections?.education || education || [];
  const skillList = detailedResumeSections?.technical_skills || skills || [];

  return (
    <div
      className={`bg-white font-sans text-gray-900 flex flex-col ${
        isPreview
          ? 'w-[794px] h-[1123px] transform scale-[0.25] origin-top-left overflow-hidden'
          : 'w-[794px] min-h-[1123px]'
      }`}
    >
      {/* Header */}
      <div className="w-full text-center py-8">
        <h1 className="text-4xl font-extrabold uppercase tracking-widest text-gray-900">{fullName || 'Your Name'}</h1>
        <p className="text-sm mt-2 uppercase tracking-widest text-gray-500 font-semibold">{title}</p>
      </div>

      {/* Body */}
      <div className="flex flex-1 border-t-2 border-gray-900">
        {/* Left Column */}
        <div className="w-[30%] bg-gray-900 text-white p-8">
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 border-b border-gray-600 pb-2">Contact</h2>
            <div className="flex flex-col gap-3 text-xs text-gray-300 break-all">
              {phone && <div>{phone}</div>}
              {email && <div>{email}</div>}
              {(website || portfolio) && <div>{website || portfolio}</div>}
            </div>
          </div>

          {skillList.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest mb-4 border-b border-gray-600 pb-2">Skills</h2>
              <ul className="list-disc list-inside text-xs text-gray-300 flex flex-col gap-2">
                {skillList.map((skill: string, i: number) => (
                  <li key={i}>{skill}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="w-[70%] p-8 bg-white">
          {summary && (
            <div className="mb-8">
              <h2 className="text-sm font-bold uppercase tracking-widest mb-3 text-gray-900">Profile</h2>
              <p className="text-xs text-gray-700 leading-relaxed text-justify">{summary}</p>
            </div>
          )}

          {expList.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-bold uppercase tracking-widest mb-4 text-gray-900">Experience</h2>
              <div className="flex flex-col gap-6">
                {expList.map((exp: any, idx: number) => {
                  const jobTitle = exp.position || exp.jobTitle;
                  const company = exp.company;
                  const duration = exp.duration;
                  const bullets = exp.achievements || exp.responsibilities || [];
                  return (
                    <div key={idx}>
                      <div className="flex justify-between items-baseline mb-1">
                        <div className="text-sm font-bold text-gray-900">{jobTitle}</div>
                        <div className="text-xs font-bold text-gray-500 whitespace-nowrap">{duration}</div>
                      </div>
                      <div className="text-xs font-bold text-gray-700 mb-2">{company}</div>
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

          {eduList.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest mb-4 text-gray-900">Education</h2>
              <div className="flex flex-col gap-4">
                {eduList.map((edu: any, idx: number) => {
                  const degree = edu.degree;
                  const institution = edu.institution;
                  const date = edu.graduation_date || edu.graduationYear;
                  return (
                    <div key={idx}>
                      <div className="flex justify-between items-baseline">
                        <div className="text-sm font-bold text-gray-900">{degree}</div>
                        <div className="text-xs font-bold text-gray-500 whitespace-nowrap">{date}</div>
                      </div>
                      <div className="text-xs text-gray-700">{institution}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
