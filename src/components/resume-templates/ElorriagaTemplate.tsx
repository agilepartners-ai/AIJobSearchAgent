import React from 'react';
import { ResumeTemplateProps } from './types';

export const ElorriagaTemplate: React.FC<ResumeTemplateProps> = ({ data, isPreview }) => {
  const {
    fullName,
    email,
    phone,
    location,
    linkedin,
    portfolio,
    detailedResumeSections,
    jobProfile,
    workExperience,
    education,
    skills
  } = data;

  const contactItems = [
    location,
    phone,
    email,
    linkedin,
    portfolio
  ].filter(Boolean);

  const summary = detailedResumeSections?.professional_summary || jobProfile;
  const expList = detailedResumeSections?.experience || workExperience || [];
  const eduList = detailedResumeSections?.education || education || [];
  const skillList = detailedResumeSections?.technical_skills || skills || [];
  const certList = detailedResumeSections?.certifications || [];

  return (
    <div
      className={`bg-white font-sans text-gray-900 ${
        isPreview
          ? 'w-[794px] h-[1123px] transform scale-[0.25] origin-top-left overflow-hidden'
          : 'w-[794px] min-h-[1123px]'
      }`}
      style={{ padding: '40px 48px' }}
    >
      {/* Header */}
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">{fullName || 'Your Name'}</h1>
        <div className="text-xs flex flex-wrap justify-center items-center gap-2 text-gray-700">
          {contactItems.map((item, idx) => (
            <React.Fragment key={idx}>
              <span>{item}</span>
              {idx < contactItems.length - 1 && <span>|</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-6">
          <p className="text-xs text-justify leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Experience */}
      {expList.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase mb-1 border-b-2 border-gray-900 pb-1">Experience</h2>
          <div className="flex flex-col gap-4 mt-3">
            {expList.map((exp: any, idx: number) => {
              const jobTitle = exp.position || exp.jobTitle;
              const company = exp.company;
              const duration = exp.duration;
              const bullets = exp.achievements || exp.responsibilities || [];
              return (
                <div key={idx}>
                  <div className="flex justify-between items-baseline mb-1">
                    <div className="font-bold text-sm">
                      {jobTitle} {company ? `| ${company}` : ''}
                    </div>
                    <div className="text-xs font-semibold whitespace-nowrap">{duration}</div>
                  </div>
                  {bullets.length > 0 && (
                    <ul className="list-disc list-outside ml-4 text-xs space-y-1">
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

      {/* Education */}
      {eduList.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase mb-1 border-b-2 border-gray-900 pb-1">Education</h2>
          <div className="flex flex-col gap-3 mt-3">
            {eduList.map((edu: any, idx: number) => {
              const degree = edu.degree;
              const institution = edu.institution;
              const date = edu.graduation_date || edu.graduationYear;
              return (
                <div key={idx} className="flex justify-between items-baseline">
                  <div className="text-xs">
                    <span className="font-bold">{degree}</span>
                    {institution && <span>, {institution}</span>}
                  </div>
                  <div className="text-xs whitespace-nowrap">{date}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Skills */}
      {skillList.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase mb-1 border-b-2 border-gray-900 pb-1">Skills</h2>
          <div className="mt-2 text-xs leading-relaxed">
            {skillList.join(', ')}
          </div>
        </div>
      )}

      {/* Certifications/Activities */}
      {certList.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase mb-1 border-b-2 border-gray-900 pb-1">Certifications</h2>
          <div className="flex flex-col gap-2 mt-2">
            {certList.map((cert: any, idx: number) => (
              <div key={idx} className="text-xs flex justify-between">
                <div>
                  <span className="font-bold">{cert.name}</span>
                  {cert.issuing_organization && <span> - {cert.issuing_organization}</span>}
                </div>
                <div className="whitespace-nowrap">{cert.issue_date}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
