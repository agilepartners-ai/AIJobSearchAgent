/* eslint-disable complexity, max-lines, @typescript-eslint/no-explicit-any */
import React from 'react';
import { UserProfileData } from '../../services/profileService';

interface ParsedExperience {
  title: string;
  position?: string;
  company: string;
  dates: string;
  location: string;
  responsibilities: string[];
  achievements?: string[];
  technologies_used?: string[] | string;
}

interface ParsedEducation {
  degree: string;
  major?: string;
  school: string;
  graduationDate: string;
  dates?: string;
  details: string;
  gpa?: string;
  coursework?: string[] | string;
  honors?: string[];
}

interface HTMLResumeTemplateProps {
  htmlContent: string;
  profile: UserProfileData;
  jobKeywords?: string[];
  twoColumnSkills?: boolean;
  emphasizeMetrics?: boolean;
  simpleMode?: boolean;
  maxProjects?: number;
  maxProjectBullets?: number;
  locale?: string;
  projectKeywordHighlight?: boolean;
  allowSecondPage?: boolean;
  projectsFirst?: boolean;
  educationBulletize?: boolean;
}

class ResumeContentParser {
  private rawHtml: string;
  private textContent: string;

  constructor(htmlContent: string) {
    this.rawHtml = htmlContent;
    this.textContent = this.cleanHTML(htmlContent);
  }

  private cleanHTML(html: string): string {
    // Remove HTML tags and get clean text
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractSection(sectionNames: string[]): string {
    const lowerText = this.textContent.toLowerCase();
    for (const sectionName of sectionNames) {
      const regex = new RegExp(`${sectionName.toLowerCase()}[\\s\\S]*?(?=\\n[A-Z][a-z]+|$)`, 'i');
      const match = lowerText.match(regex);
      if (match) {
        return match[0];
      }
    }
    return '';
  }

  extractPersonalInfo(): any {
    const lines = this.textContent.split('\n').filter(line => line.trim());
    const info: any = {};
    
    // Try to extract name (usually first line)
    if (lines.length > 0) {
      info.name = lines[0].trim();
    }
    
    // Extract email
    const emailMatch = this.textContent.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      info.email = emailMatch[0];
    }
    
    // Extract phone
    const phoneMatch = this.textContent.match(/[\+]?[\d\s\(\)\-]{10,}/);
    if (phoneMatch) {
      info.phone = phoneMatch[0].trim();
    }
    
    return info;
  }

  extractExperience(): ParsedExperience[] {
    const experienceSection = this.extractSection(['experience', 'work experience', 'employment', 'professional experience']);
    if (!experienceSection) return [];

    // Simple parsing - this would need to be enhanced for production
    return [];
  }

  extractEducation(): ParsedEducation[] {
    const educationSection = this.extractSection(['education', 'academic background']);
    if (!educationSection) return [];

    // Simple parsing - this would need to be enhanced for production
    return [];
  }

  extractSkills(): { technical: string[], soft: string[], tools: string[], all: string[] } {
    const skillsSection = this.extractSection(['skills', 'technical skills', 'core competencies']);
    const skills = skillsSection.split(/[,\n\r]/).map(s => s.trim()).filter(s => s.length > 0);
    
    return {
      technical: skills,
      soft: [],
      tools: [],
      all: skills
    };
  }
}

const HTMLResumeTemplate: React.FC<HTMLResumeTemplateProps> = ({
  htmlContent,
  profile,
  jobKeywords = [],
}) => {
  const parser = new ResumeContentParser(htmlContent);
  
  // Extract data from HTML content
  const personalInfo = parser.extractPersonalInfo();
  const skillsData = parser.extractSkills();

  // Merge with profile data
  const finalProfile = {
    name: profile.fullName || personalInfo.name || 'Professional Name',
    email: profile.email || personalInfo.email || 'email@example.com',
    phone: profile.phone || personalInfo.phone || '',
    location: profile.location || '',
    linkedin: profile.linkedin || '',
    website: profile.portfolio || ''
  };

  // Generate clean, structured HTML
  const generateCleanHTML = (): string => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${finalProfile.name} - Resume</title>
    <style>
        body {
            font-family: 'Calibri', 'Arial', sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 40px;
            color: #333333;
            background-color: #ffffff;
            font-size: 11pt;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2563EB;
            padding-bottom: 20px;
        }
        
        .name {
            font-size: 28pt;
            font-weight: bold;
            color: #1F2937;
            margin-bottom: 12px;
            letter-spacing: 0.5pt;
        }
        
        .contact-info {
            font-size: 11pt;
            color: #374151;
            line-height: 1.4;
        }
        
        .contact-line {
            margin-bottom: 4px;
        }
        
        .section {
            margin-bottom: 24px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 14pt;
            font-weight: bold;
            color: #1F2937;
            text-transform: uppercase;
            border-bottom: 1px solid #E5E7EB;
            padding-bottom: 4px;
            margin-bottom: 12px;
            letter-spacing: 0.8pt;
        }
        
        .summary-text {
            font-size: 11pt;
            line-height: 1.5;
            margin-bottom: 8px;
            color: #374151;
            text-align: justify;
        }
        
        .skills-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 8px;
            margin-bottom: 16px;
        }
        
        .skill-group {
            margin-bottom: 8px;
        }
        
        .skill-group-label {
            font-weight: bold;
            color: #1F2937;
            margin-bottom: 4px;
            font-size: 10pt;
        }
        
        .skills-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }
        
        .skill-item {
            background-color: #F3F4F6;
            border: 1px solid #D1D5DB;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 9pt;
            color: #374151;
        }
        
        .skill-item.highlighted {
            background-color: #DBEAFE;
            border-color: #2563EB;
            color: #1E40AF;
            font-weight: bold;
        }
        
        .experience-item {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        
        .job-header {
            margin-bottom: 4px;
        }
        
        .job-title {
            font-size: 12pt;
            font-weight: bold;
            color: #111827;
            display: inline-block;
            margin-right: 12px;
        }
        
        .job-dates {
            font-size: 9pt;
            color: #6B7280;
            float: right;
        }
        
        .company-info {
            margin-bottom: 4px;
            clear: both;
        }
        
        .company-name {
            font-size: 10pt;
            font-weight: bold;
            color: #1F2937;
            display: inline-block;
            margin-right: 12px;
        }
        
        .job-location {
            font-size: 9pt;
            color: #6B7280;
        }
        
        .responsibilities {
            margin-top: 8px;
        }
        
        .responsibility-item {
            margin-bottom: 4px;
            padding-left: 16px;
            position: relative;
            font-size: 10pt;
            line-height: 1.4;
            color: #2C3E50;
        }
        
        .responsibility-item:before {
            content: "•";
            color: #2563EB;
            position: absolute;
            left: 0;
            font-weight: bold;
        }
        
        .education-item {
            margin-bottom: 16px;
            page-break-inside: avoid;
        }
        
        .degree-header {
            margin-bottom: 4px;
        }
        
        .degree {
            font-size: 11pt;
            font-weight: bold;
            color: #1F2937;
            display: inline-block;
            margin-right: 12px;
        }
        
        .graduation-date {
            font-size: 9pt;
            color: #6B7280;
            float: right;
        }
        
        .school-name {
            font-size: 10pt;
            color: #374151;
            margin-bottom: 4px;
            clear: both;
        }
        
        .education-details {
            font-size: 10pt;
            color: #2C3E50;
            line-height: 1.3;
        }
        
        .project-item {
            margin-bottom: 16px;
            page-break-inside: avoid;
        }
        
        .project-header {
            margin-bottom: 4px;
        }
        
        .project-title {
            font-size: 11pt;
            font-weight: bold;
            color: #1F2937;
            display: inline-block;
            margin-right: 12px;
        }
        
        .project-duration {
            font-size: 9pt;
            color: #6B7280;
            float: right;
        }
        
        .project-description {
            font-size: 10pt;
            color: #374151;
            margin-bottom: 4px;
            clear: both;
        }
        
        .project-technologies {
            font-size: 9pt;
            color: #6B7280;
            font-style: italic;
            margin-bottom: 6px;
        }
        
        .keyword-highlight {
            background-color: #FEF9C3;
            color: #92400E;
            font-weight: bold;
            padding: 1px 2px;
        }
        
        .metric-highlight {
            font-weight: bold;
            color: #059669;
        }
        
        @media print {
            body {
                padding: 20px;
            }
            
            .section {
                page-break-inside: avoid;
            }
            
            .experience-item,
            .education-item,
            .project-item {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="name">${finalProfile.name}</h1>
        <div class="contact-info">
            ${finalProfile.email ? `<div class="contact-line">${finalProfile.email}</div>` : ''}
            ${finalProfile.phone ? `<div class="contact-line">${finalProfile.phone}</div>` : ''}
            ${finalProfile.location ? `<div class="contact-line">${finalProfile.location}</div>` : ''}
            ${finalProfile.linkedin ? `<div class="contact-line">LinkedIn: ${finalProfile.linkedin}</div>` : ''}
            ${finalProfile.website ? `<div class="contact-line">Website: ${finalProfile.website}</div>` : ''}
        </div>
    </div>

    ${htmlContent.includes('SUMMARY') || htmlContent.includes('OBJECTIVE') ? `
    <div class="section">
        <h2 class="section-title">Professional Summary</h2>
        <div class="summary-text">
            ${htmlContent.match(/(?:SUMMARY|OBJECTIVE)[\\s\\S]*?(?=\\n[A-Z][a-z]+|$)/i)?.[0]?.replace(/(?:SUMMARY|OBJECTIVE)/i, '').trim() || 'Experienced professional with a proven track record of delivering results and driving organizational success.'}
        </div>
    </div>
    ` : ''}

    ${skillsData.all.length > 0 ? `
    <div class="section">
        <h2 class="section-title">Technical Skills</h2>
        <div class="skills-container">
            <div class="skill-group">
                <div class="skills-list">
                    ${skillsData.all.map(skill => {
                        const isHighlighted = jobKeywords.some(keyword => 
                            skill.toLowerCase().includes(keyword.toLowerCase())
                        );
                        return `<span class="skill-item ${isHighlighted ? 'highlighted' : ''}">${skill}</span>`;
                    }).join('')}
                </div>
            </div>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h2 class="section-title">Professional Experience</h2>
        ${htmlContent.includes('EXPERIENCE') || htmlContent.includes('EMPLOYMENT') ? 
            htmlContent.match(/(?:EXPERIENCE|EMPLOYMENT)[\\s\\S]*?(?=\\n[A-Z][a-z]+|$)/i)?.[0]?.replace(/(?:EXPERIENCE|EMPLOYMENT)/i, '').trim() || 'Please add your professional experience details.' 
            : 'Please add your professional experience details.'
        }
    </div>

    <div class="section">
        <h2 class="section-title">Education</h2>
        ${htmlContent.includes('EDUCATION') ? 
            htmlContent.match(/EDUCATION[\\s\\S]*?(?=\\n[A-Z][a-z]+|$)/i)?.[0]?.replace(/EDUCATION/i, '').trim() || 'Please add your education details.'
            : 'Please add your education details.'
        }
    </div>

    ${htmlContent.includes('PROJECT') ? `
    <div class="section">
        <h2 class="section-title">Key Projects</h2>
        ${htmlContent.match(/PROJECT[\\s\\S]*?(?=\\n[A-Z][a-z]+|$)/i)?.[0]?.replace(/PROJECT/i, '').trim() || ''}
    </div>
    ` : ''}

    ${htmlContent.includes('CERTIFICATION') ? `
    <div class="section">
        <h2 class="section-title">Certifications</h2>
        ${htmlContent.match(/CERTIFICATION[\\s\\S]*?(?=\\n[A-Z][a-z]+|$)/i)?.[0]?.replace(/CERTIFICATION/i, '').trim() || ''}
    </div>
    ` : ''}

</body>
</html>`;
  };

  return (
    <div 
      dangerouslySetInnerHTML={{ 
        __html: generateCleanHTML() 
      }} 
    />
  );
};

// Export a function to get the clean HTML string for docs generation
export const getCleanHTMLForDocs = (
  htmlContent: string,
  profile: UserProfileData,
  jobKeywords: string[] = []
): string => {
  const parser = new ResumeContentParser(htmlContent);
  const personalInfo = parser.extractPersonalInfo();
  const skillsData = parser.extractSkills();

  const finalProfile = {
    name: profile.fullName || personalInfo.name || 'Professional Name',
    email: profile.email || personalInfo.email || 'email@example.com',
    phone: profile.phone || personalInfo.phone || '',
    location: profile.location || '',
    linkedin: profile.linkedin || '',
    website: profile.portfolio || ''
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${finalProfile.name} - Resume</title>
    <style>
        body {
            font-family: 'Calibri', 'Arial', sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 40px;
            color: #333333;
            background-color: #ffffff;
            font-size: 11pt;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2563EB;
            padding-bottom: 20px;
        }
        
        .name {
            font-size: 28pt;
            font-weight: bold;
            color: #1F2937;
            margin-bottom: 12px;
            letter-spacing: 0.5pt;
        }
        
        .contact-info {
            font-size: 11pt;
            color: #374151;
            line-height: 1.4;
        }
        
        .contact-line {
            margin-bottom: 4px;
        }
        
        .section {
            margin-bottom: 24px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 14pt;
            font-weight: bold;
            color: #1F2937;
            text-transform: uppercase;
            border-bottom: 1px solid #E5E7EB;
            padding-bottom: 4px;
            margin-bottom: 12px;
            letter-spacing: 0.8pt;
        }
        
        .summary-text {
            font-size: 11pt;
            line-height: 1.5;
            margin-bottom: 8px;
            color: #374151;
            text-align: justify;
        }
        
        .skills-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 8px;
            margin-bottom: 16px;
        }
        
        .skill-group {
            margin-bottom: 8px;
        }
        
        .skill-group-label {
            font-weight: bold;
            color: #1F2937;
            margin-bottom: 4px;
            font-size: 10pt;
        }
        
        .skills-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }
        
        .skill-item {
            background-color: #F3F4F6;
            border: 1px solid #D1D5DB;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 9pt;
            color: #374151;
        }
        
        .skill-item.highlighted {
            background-color: #DBEAFE;
            border-color: #2563EB;
            color: #1E40AF;
            font-weight: bold;
        }
        
        .experience-item {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        
        .job-header {
            margin-bottom: 4px;
        }
        
        .job-title {
            font-size: 12pt;
            font-weight: bold;
            color: #111827;
            display: inline-block;
            margin-right: 12px;
        }
        
        .job-dates {
            font-size: 9pt;
            color: #6B7280;
            float: right;
        }
        
        .company-info {
            margin-bottom: 4px;
            clear: both;
        }
        
        .company-name {
            font-size: 10pt;
            font-weight: bold;
            color: #1F2937;
            display: inline-block;
            margin-right: 12px;
        }
        
        .job-location {
            font-size: 9pt;
            color: #6B7280;
        }
        
        .responsibilities {
            margin-top: 8px;
        }
        
        .responsibility-item {
            margin-bottom: 4px;
            padding-left: 16px;
            position: relative;
            font-size: 10pt;
            line-height: 1.4;
            color: #2C3E50;
        }
        
        .responsibility-item:before {
            content: "•";
            color: #2563EB;
            position: absolute;
            left: 0;
            font-weight: bold;
        }
        
        .education-item {
            margin-bottom: 16px;
            page-break-inside: avoid;
        }
        
        .degree-header {
            margin-bottom: 4px;
        }
        
        .degree {
            font-size: 11pt;
            font-weight: bold;
            color: #1F2937;
            display: inline-block;
            margin-right: 12px;
        }
        
        .graduation-date {
            font-size: 9pt;
            color: #6B7280;
            float: right;
        }
        
        .school-name {
            font-size: 10pt;
            color: #374151;
            margin-bottom: 4px;
            clear: both;
        }
        
        .education-details {
            font-size: 10pt;
            color: #2C3E50;
            line-height: 1.3;
        }
        
        .project-item {
            margin-bottom: 16px;
            page-break-inside: avoid;
        }
        
        .project-header {
            margin-bottom: 4px;
        }
        
        .project-title {
            font-size: 11pt;
            font-weight: bold;
            color: #1F2937;
            display: inline-block;
            margin-right: 12px;
        }
        
        .project-duration {
            font-size: 9pt;
            color: #6B7280;
            float: right;
        }
        
        .project-description {
            font-size: 10pt;
            color: #374151;
            margin-bottom: 4px;
            clear: both;
        }
        
        .project-technologies {
            font-size: 9pt;
            color: #6B7280;
            font-style: italic;
            margin-bottom: 6px;
        }
        
        .keyword-highlight {
            background-color: #FEF9C3;
            color: #92400E;
            font-weight: bold;
            padding: 1px 2px;
        }
        
        .metric-highlight {
            font-weight: bold;
            color: #059669;
        }
        
        @media print {
            body {
                padding: 20px;
            }
            
            .section {
                page-break-inside: avoid;
            }
            
            .experience-item,
            .education-item,
            .project-item {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="name">${finalProfile.name}</h1>
        <div class="contact-info">
            ${finalProfile.email ? `<div class="contact-line">${finalProfile.email}</div>` : ''}
            ${finalProfile.phone ? `<div class="contact-line">${finalProfile.phone}</div>` : ''}
            ${finalProfile.location ? `<div class="contact-line">${finalProfile.location}</div>` : ''}
            ${finalProfile.linkedin ? `<div class="contact-line">LinkedIn: ${finalProfile.linkedin}</div>` : ''}
            ${finalProfile.website ? `<div class="contact-line">Website: ${finalProfile.website}</div>` : ''}
        </div>
    </div>

    ${htmlContent.includes('SUMMARY') || htmlContent.includes('OBJECTIVE') ? `
    <div class="section">
        <h2 class="section-title">Professional Summary</h2>
        <div class="summary-text">
            ${htmlContent.match(/(?:SUMMARY|OBJECTIVE)[\\s\\S]*?(?=\\n[A-Z][a-z]+|$)/i)?.[0]?.replace(/(?:SUMMARY|OBJECTIVE)/i, '').trim() || 'Experienced professional with a proven track record of delivering results and driving organizational success.'}
        </div>
    </div>
    ` : ''}

    ${skillsData.all.length > 0 ? `
    <div class="section">
        <h2 class="section-title">Technical Skills</h2>
        <div class="skills-container">
            <div class="skill-group">
                <div class="skills-list">
                    ${skillsData.all.map(skill => {
                        const isHighlighted = jobKeywords.some(keyword => 
                            skill.toLowerCase().includes(keyword.toLowerCase())
                        );
                        return `<span class="skill-item ${isHighlighted ? 'highlighted' : ''}">${skill}</span>`;
                    }).join('')}
                </div>
            </div>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h2 class="section-title">Professional Experience</h2>
        <div class="experience-content">
            ${htmlContent.includes('EXPERIENCE') || htmlContent.includes('EMPLOYMENT') ? 
                htmlContent.match(/(?:EXPERIENCE|EMPLOYMENT)[\\s\\S]*?(?=\\n[A-Z][a-z]+|$)/i)?.[0]?.replace(/(?:EXPERIENCE|EMPLOYMENT)/i, '').trim().split('\n').map(line => 
                    line.trim() ? `<div class="responsibility-item">${line.trim()}</div>` : ''
                ).join('') || '<div class="responsibility-item">Please add your professional experience details.</div>'
                : '<div class="responsibility-item">Please add your professional experience details.</div>'
            }
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">Education</h2>
        <div class="education-content">
            ${htmlContent.includes('EDUCATION') ? 
                htmlContent.match(/EDUCATION[\\s\\S]*?(?=\\n[A-Z][a-z]+|$)/i)?.[0]?.replace(/EDUCATION/i, '').trim().split('\n').map(line => 
                    line.trim() ? `<div class="education-details">${line.trim()}</div>` : ''
                ).join('') || '<div class="education-details">Please add your education details.</div>'
                : '<div class="education-details">Please add your education details.</div>'
            }
        </div>
    </div>

    ${htmlContent.includes('PROJECT') ? `
    <div class="section">
        <h2 class="section-title">Key Projects</h2>
        <div class="projects-content">
            ${htmlContent.match(/PROJECT[\\s\\S]*?(?=\\n[A-Z][a-z]+|$)/i)?.[0]?.replace(/PROJECT/i, '').trim().split('\n').map(line => 
                line.trim() ? `<div class="responsibility-item">${line.trim()}</div>` : ''
            ).join('') || ''}
        </div>
    </div>
    ` : ''}

    ${htmlContent.includes('CERTIFICATION') ? `
    <div class="section">
        <h2 class="section-title">Certifications</h2>
        <div class="certifications-content">
            ${htmlContent.match(/CERTIFICATION[\\s\\S]*?(?=\\n[A-Z][a-z]+|$)/i)?.[0]?.replace(/CERTIFICATION/i, '').trim().split('\n').map(line => 
                line.trim() ? `<div class="responsibility-item">${line.trim()}</div>` : ''
            ).join('') || ''}
        </div>
    </div>
    ` : ''}

</body>
</html>`;
};

export default HTMLResumeTemplate;