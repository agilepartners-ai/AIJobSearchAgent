import React, { useState, useMemo } from 'react';
import { ArrowLeft, Download, FileText, CheckCircle, Target, TrendingUp, Award, Brain, Copy, Check, ChevronDown, ChevronUp, AlertCircle, Eye } from 'lucide-react';
import { PDFViewer, PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

interface OptimizationResultsProps {
  results: {
    resume_html: string;
    cover_letter_html: string;
  };
  jobDetails: {
    title: string;
    company: string;
    description: string;
  };
  analysisData?: {
    matchScore: number;
    summary: string;
    strengths: string[];
    gaps: string[];
    suggestions: string[];
    keywordAnalysis: {
      coverageScore: number;
      coveredKeywords: string[];
      missingKeywords: string[];
    };
  };
  onBack: () => void;
}

// Enhanced PDF Styles with better spacing and structure
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 16,
    fontFamily: 'Helvetica',
    fontSize: 9,
    lineHeight: 1.3,
  },
  header: {
    marginBottom: 12,
    borderBottom: '1 solid #2563eb',
    paddingBottom: 6,
    textAlign: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 3,
    lineHeight: 1.1,
  },
  professionalTitle: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 1.1,
  },
  contactInfo: {
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.2,
    marginBottom: 1,
  },
  section: {
    marginBottom: 10,
  },
  compactSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
    borderLeft: '2 solid #2563eb',
    paddingLeft: 6,
    lineHeight: 1.1,
    textTransform: 'uppercase',
  },
  summaryText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#374151',
    marginBottom: 2,
    textAlign: 'justify',
  },
  experienceItem: {
    marginBottom: 8,
    pageBreakInside: false,
  },
  jobTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 1,
  },
  companyInfo: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 3,
    fontStyle: 'italic',
  },
  bulletPoint: {
    fontSize: 8,
    lineHeight: 1.3,
    color: '#374151',
    marginBottom: 1,
    marginLeft: 8,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 3,
  },
  skillItem: {
    fontSize: 8,
    backgroundColor: '#f3f4f6',
    padding: 2,
    margin: 1,
    borderRadius: 2,
    color: '#374151',
  },
  educationItem: {
    marginBottom: 6,
  },
  degreeInfo: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 1,
  },
  schoolInfo: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
  },
  projectItem: {
    marginBottom: 6,
  },
  projectTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 1,
  },
  projectDesc: {
    fontSize: 8,
    lineHeight: 1.3,
    color: '#374151',
    marginBottom: 2,
  },
  certificationItem: {
    fontSize: 8,
    lineHeight: 1.3,
    color: '#374151',
    marginBottom: 2,
  },
  smallText: {
    fontSize: 8,
    lineHeight: 1.2,
    color: '#6b7280',
    marginBottom: 1,
  }
});

// Enhanced Resume PDF Document Component with comprehensive parsing
const ResumePDFDocument: React.FC<{ content: string; jobDetails: any }> = ({ content, jobDetails }) => {
  // Enhanced parsing to extract ALL resume information
  const parseComprehensiveResumeData = (htmlContent: string) => {
    console.log('🔍 Parsing comprehensive resume data...');

    // Clean up HTML and get text content
    let text = htmlContent
      .replace(/<[^>]*>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    console.log('📄 Resume text length:', text.length);

    const data = {
      professionalTitle: extractProfessionalTitle(text, jobDetails),
      personalInfo: extractPersonalInfo(text),
      professionalSummary: extractSection(text, ['PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE', 'OBJECTIVE']),
      technicalSkills: extractSection(text, ['TECHNICAL SKILLS', 'SKILLS', 'TECHNOLOGIES']),
      coreCompetencies: extractSection(text, ['CORE COMPETENCIES', 'COMPETENCIES', 'SOFT SKILLS']),
      experience: extractAllExperience(text),
      education: extractAllEducation(text),
      projects: extractAllProjects(text),
      certifications: extractSection(text, ['CERTIFICATIONS', 'LICENSES', 'CREDENTIALS']),
      awards: extractSection(text, ['AWARDS', 'RECOGNITION', 'HONORS']),
      volunteer: extractSection(text, ['VOLUNTEER EXPERIENCE', 'VOLUNTEER', 'COMMUNITY SERVICE']),
      publications: extractSection(text, ['PUBLICATIONS', 'RESEARCH', 'PAPERS'])
    };

    console.log('📊 Parsed data summary:');
    console.log('- Experience entries:', data.experience.length);
    console.log('- Education entries:', data.education.length);
    console.log('- Projects:', data.projects.length);
    console.log('- Professional title:', data.professionalTitle);

    return data;
  };

  const extractProfessionalTitle = (text: string, jobDetails: any): string => {
    // Generate relevant title based on job details and resume content
    const jobTitle = jobDetails.title || '';

    // Look for existing title patterns in resume
    const titlePatterns = [
      /PROFESSIONAL TITLE[:\s]*([^\n]+)/i,
      /JOB TITLE[:\s]*([^\n]+)/i,
      // Look for title after name
      /^(?:[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*\n\s*([A-Z][a-zA-Z\s&,.-]*(?:Engineer|Developer|Manager|Analyst|Specialist|Coordinator|Director|Lead|Senior|Consultant|Executive))/m
    ];

    for (const pattern of titlePatterns) {
      const match = text.match(pattern);
      if (match && match[1]?.trim()) {
        return match[1].trim();
      }
    }

    // Generate title based on job posting and resume content
    const skillsText = extractSection(text, ['TECHNICAL SKILLS', 'SKILLS']).toLowerCase();
    const experienceText = extractSection(text, ['PROFESSIONAL EXPERIENCE', 'EXPERIENCE']).toLowerCase();

    let generatedTitle = jobTitle;

    // Enhance title based on seniority level found in resume
    if (experienceText.includes('senior') || experienceText.includes('lead') || experienceText.includes('principal')) {
      if (!jobTitle.toLowerCase().includes('senior') && !jobTitle.toLowerCase().includes('lead')) {
        generatedTitle = `Senior ${jobTitle}`;
      }
    }

    return generatedTitle || 'Professional Specialist';
  };

  const extractPersonalInfo = (text: string): any => {
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    const phoneMatch = text.match(/\b(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/);
    const nameMatch = text.match(/^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/m);
    const locationMatch = text.match(/([A-Z][a-z]+,\s*[A-Z]{2})|([A-Z][a-z]+\s+[A-Z][a-z]+,\s*[A-Z]{2})/);

    return {
      name: nameMatch ? nameMatch[1] : 'Professional Name',
      email: emailMatch ? emailMatch[0] : 'email@example.com',
      phone: phoneMatch ? phoneMatch[0] : '+1 (555) 123-4567',
      location: locationMatch ? locationMatch[0] : 'City, State'
    };
  };

  const extractSection = (text: string, sectionNames: string[]): string => {
    for (const sectionName of sectionNames) {
      const patterns = [
        new RegExp(`${sectionName}[:\\s]*([\\s\\S]*?)(?=(?:PROFESSIONAL TITLE|PROFESSIONAL SUMMARY|TECHNICAL SKILLS|CORE COMPETENCIES|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EDUCATION|KEY PROJECTS|PROJECTS|CERTIFICATIONS|AWARDS|VOLUNTEER EXPERIENCE|PUBLICATIONS)|$)`, 'i'),
        new RegExp(`${sectionName}[:\\s]*([\\s\\S]*?)(?=\\n\\s*[A-Z][A-Z\\s]{8,}|$)`, 'i')
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]?.trim() && match[1].trim().length > 10) {
          return match[1].trim();
        }
      }
    }
    return '';
  };

  const extractAllExperience = (text: string): any[] => {
    const experienceSection = extractSection(text, ['PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE', 'EXPERIENCE', 'EMPLOYMENT HISTORY']);
    console.log('📋 Experience section length:', experienceSection.length);

    if (!experienceSection || experienceSection.length < 20) return [];

    // Multiple parsing approaches to catch ALL experience entries
    let allExperiences: string[] = [];

    // Method 1: Split by job title patterns (most comprehensive)
    const jobPatterns = [
      /(?=\n\s*(?:[A-Z][a-zA-Z\s&,.-]*(?:Engineer|Developer|Manager|Analyst|Specialist|Coordinator|Director|Lead|Senior|Junior|Intern|Consultant|Associate|Executive|Administrator|Supervisor|Officer|Representative|Technician|Designer|Architect|Scientist|Researcher|Professor|Teacher|Sales|Marketing|Operations|Finance|HR|Legal|Product|Strategy|Business|Data|Software|Hardware|Network|Security|Quality|Project|Program|Technical|Creative|Digital|Web|Mobile|Cloud|DevOps|AI|ML|Machine Learning|Artificial Intelligence)))/gm,
      /(?=\n\s*[A-Z][a-zA-Z\s&,.-]+\s+(?:at|@|\|)\s+[A-Z])/gm,
      /(?=\n\s*[A-Z][a-zA-Z\s&,.-]+\s+[-–—]\s+[A-Z])/gm,
      /(?=\n\s*\d{1,2}\/\d{4}|\d{4}\s*[-–—]\s*(?:Present|Current|\d{4}))/gm,
      /(?=\n\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/gm
    ];

    for (const pattern of jobPatterns) {
      const entries = experienceSection.split(pattern).filter(entry => entry.trim().length > 30);
      if (entries.length > allExperiences.length) {
        allExperiences = entries;
        console.log(`✅ Found ${entries.length} experience entries using pattern`);
      }
    }

    // Method 2: Manual line-by-line parsing if patterns fail
    if (allExperiences.length < 2) {
      console.log('🔄 Using manual parsing approach...');
      const lines = experienceSection.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      let currentExp = '';
      const experiences = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Enhanced job title detection
        const isJobTitle = (
          /^[A-Z][a-zA-Z\s&,.-]*(?:Engineer|Developer|Manager|Analyst|Specialist|Coordinator|Director|Lead|Senior|Junior|Intern|Consultant|Associate|Executive|Administrator|Supervisor|Officer|Representative|Technician|Designer|Architect|Scientist|Researcher|Professor|Teacher|Sales|Marketing|Operations|Finance|HR|Legal|Product|Strategy|Business|Data|Software|Hardware|Network|Security|Quality|Project|Program|Technical|Creative|Digital|Web|Mobile|Cloud|DevOps|AI|ML)/i.test(line) ||
          /^[A-Z][a-zA-Z\s&,.-]+\s+(?:at|@|\|)\s+[A-Z]/i.test(line) ||
          /^\d{1,2}\/\d{4}|\d{4}\s*[-–—]\s*(?:Present|Current|\d{4})/i.test(line) ||
          /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i.test(line)
        );

        if (isJobTitle && currentExp.trim().length > 30) {
          experiences.push(currentExp.trim());
          currentExp = line;
        } else {
          currentExp += '\n' + line;
        }
      }

      if (currentExp.trim().length > 30) {
        experiences.push(currentExp.trim());
      }

      if (experiences.length > allExperiences.length) {
        allExperiences = experiences;
        console.log(`✅ Manual parsing found ${experiences.length} experience entries`);
      }
    }

    // Parse each experience entry
    const parsedExperiences = allExperiences
      .filter(entry => entry.trim().length > 20)
      .map((entry, index) => {
        console.log(`📝 Parsing experience ${index + 1}:`, entry.substring(0, 100) + '...');
        return parseExperienceEntry(entry);
      })
      .filter(exp => exp.title && exp.title.length > 0);

    console.log(`✅ Final parsed experiences: ${parsedExperiences.length}`);
    return parsedExperiences;
  };

  const parseExperienceEntry = (entry: string): any => {
    const lines = entry.split('\n').filter(line => line.trim()).map(line => line.trim());
    if (lines.length === 0) return {};

    let title = '';
    let company = '';
    let dates = '';
    let location = '';
    let responsibilities: string[] = [];

    // Enhanced parsing for various resume formats
    const firstLine = lines[0] || '';
    const secondLine = lines[1] || '';
    const thirdLine = lines[2] || '';

    // Multiple pattern matching approaches
    const titleCompanyPatterns = [
      /^(.+?)\s+(?:at|@)\s+(.+?)(?:\s+[•·|]\s+(.+?))?(?:\s+[•·|]\s+(.+?))?$/i,
      /^(.+?)\s+[-–—]\s+(.+?)(?:\s+[•·|(]\s*(.+?)[\)]*)?(?:\s+[•·|]\s+(.+?))?$/i,
      /^(.+?)\s*\|\s*(.+?)(?:\s*\|\s*(.+?))?(?:\s*\|\s*(.+?))?$/i,
      /^(.+?),\s+(.+?)(?:\s+[•·|]\s+(.+?))?(?:\s+[•·|]\s+(.+?))?$/i
    ];

    let parsed = false;

    // Try to parse the first line
    for (const pattern of titleCompanyPatterns) {
      const match = firstLine.match(pattern);
      if (match) {
        title = match[1]?.trim() || '';
        company = match[2]?.trim() || '';

        const part3 = match[3]?.trim() || '';
        const part4 = match[4]?.trim() || '';

        const datePattern = /\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|Current/i;

        if (datePattern.test(part3)) {
          dates = part3;
          location = part4 || '';
        } else {
          location = part3;
          dates = part4 || '';
        }

        parsed = true;
        break;
      }
    }

    // Alternative parsing if first line failed
    if (!parsed) {
      title = firstLine;

      if (secondLine) {
        const companyPatterns = [
          /^(.+?)(?:\s+[•·|]\s+(.+?))?(?:\s+[•·|]\s+(.+?))?$/,
          /^(.+?),\s+(.+?)(?:\s+[•·|]\s+(.+?))$/
        ];

        for (const pattern of companyPatterns) {
          const match = secondLine.match(pattern);
          if (match) {
            company = match[1]?.trim() || '';
            const part2 = match[2]?.trim() || '';
            const part3 = match[3]?.trim() || '';

            const datePattern = /\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|Current/i;

            if (datePattern.test(part2)) {
              dates = part2;
              location = part3 || '';
            } else {
              location = part2;
              dates = part3 || '';
            }
            break;
          }
        }
      }

      if (thirdLine && (!dates || !location)) {
        const datePattern = /\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|Current/i;
        if (datePattern.test(thirdLine)) {
          dates = dates || thirdLine;
        } else {
          location = location || thirdLine;
        }
      }
    }

    // Extract responsibilities with better filtering
    const startIndex = parsed ? 1 : (company ? 2 : 3);
    responsibilities = lines.slice(startIndex)
      .map(line => line.replace(/^[•·\-*→▪▫◦‣⁃]\s*/, '').trim())
      .filter(line => {
        return line.length > 10 &&
          !line.match(/^\d{4}/) &&
          !line.match(/^[A-Z][a-z]+\s+\d{4}/) &&
          !line.match(/^(?:at|@)\s+[A-Z]/) &&
          !line.match(/^[A-Z][a-zA-Z\s&,.-]*(?:Engineer|Developer|Manager|Analyst)/);
      })
      .slice(0, 6); // Keep up to 6 responsibilities per job

    return {
      title: title || 'Professional Role',
      company: company || 'Company Name',
      dates: dates || '',
      location: location || '',
      responsibilities: responsibilities.length > 0 ? responsibilities : [
        'Delivered key results and contributed to business objectives.',
        'Collaborated with cross-functional teams to achieve project goals.',
        'Applied technical expertise to solve complex challenges.'
      ]
    };
  };

  const extractAllEducation = (text: string): any[] => {
    const educationSection = extractSection(text, ['EDUCATION', 'ACADEMIC BACKGROUND', 'ACADEMIC QUALIFICATIONS']);
    if (!educationSection) return [];

    // Split by common education patterns
    const educationPatterns = [
      /(?=\n\s*(?:Bachelor|Master|PhD|Associate|Diploma|Certificate|B\.S\.|M\.S\.|B\.A\.|M\.A\.|B\.Sc\.|M\.Sc\.|Doctor|Doctorate))/gi,
      /(?=\n\s*[A-Z][a-zA-Z\s&,.-]+(?:University|College|Institute|School|Academy))/gi,
      /(?=\n\s*\d{4}\s*[-–—]\s*\d{4})/gm
    ];

    let allEducation: string[] = [];

    for (const pattern of educationPatterns) {
      const entries = educationSection.split(pattern).filter(entry => entry.trim().length > 10);
      if (entries.length > allEducation.length) {
        allEducation = entries;
      }
    }

    // Fallback parsing
    if (allEducation.length === 0) {
      allEducation = educationSection.split(/\n\s*\n/).filter(entry => entry.trim().length > 10);
    }

    return allEducation.map(entry => {
      const lines = entry.split('\n').filter(line => line.trim());

      let degree = '';
      let school = '';
      let year = '';
      let details = '';

      // Extract degree information
      const degreePattern = /(Bachelor|Master|PhD|Associate|Diploma|Certificate|B\.S\.|M\.S\.|B\.A\.|M\.A\.|B\.Sc\.|M\.Sc\.|Doctor|Doctorate)[^,\n]*/i;
      const degreeMatch = entry.match(degreePattern);
      if (degreeMatch) {
        degree = degreeMatch[0].trim();
      } else {
        degree = lines[0]?.trim() || 'Degree';
      }

      // Extract school/university
      const schoolPattern = /([A-Z][a-zA-Z\s&,.-]+(?:University|College|Institute|School|Academy))/i;
      const schoolMatch = entry.match(schoolPattern);
      if (schoolMatch) {
        school = schoolMatch[1].trim();
      } else {
        school = lines[1]?.trim() || 'Institution';
      }

      // Extract year
      const yearPattern = /\b(19|20)\d{2}\b/;
      const yearMatch = entry.match(yearPattern);
      if (yearMatch) {
        year = yearMatch[0];
      }

      // Extract additional details
      details = lines.slice(2).join(' • ').trim();

      return { degree, school, year, details };
    });
  };

  const extractAllProjects = (text: string): any[] => {
    const projectsSection = extractSection(text, ['KEY PROJECTS', 'PROJECTS', 'NOTABLE PROJECTS', 'SELECTED PROJECTS']);
    if (!projectsSection) return [];

    const projectPatterns = [
      /(?=\n\s*[A-Z][a-zA-Z\s&,.-]*(?:Project|System|Application|Platform|Tool|Solution|Website|App|Portal|Dashboard|Framework|Library|API|Service|Module|Component))/gi,
      /(?=\n\s*[A-Z][a-zA-Z\s&,.-]+\s+[-–—]\s+)/gm,
      /(?=\n\s*\d+\.\s*[A-Z])/gm,
      /(?=\n\s*•\s*[A-Z])/gm
    ];

    let allProjects: string[] = [];

    for (const pattern of projectPatterns) {
      const entries = projectsSection.split(pattern).filter(entry => entry.trim().length > 15);
      if (entries.length > allProjects.length) {
        allProjects = entries;
      }
    }

    if (allProjects.length === 0) {
      allProjects = projectsSection.split(/\n\s*\n/).filter(p => p.trim().length > 15);
    }

    return allProjects.map(project => {
      const lines = project.split('\n').filter(line => line.trim());
      const title = lines[0]?.replace(/^[•\d.\s-]+/, '').trim() || 'Project';
      const description = lines.slice(1).join(' ').trim() || 'Project description and key achievements.';

      // Extract technologies if mentioned
      const techMatch = description.match(/(?:Technologies?|Tech Stack|Built with|Using|Implemented with)[:\s]*([^.]+)/i);
      const technologies = techMatch ? techMatch[1].split(/[,;|]/).map(t => t.trim()) : [];

      return {
        title,
        description: description.replace(/(?:Technologies?|Tech Stack|Built with|Using|Implemented with)[:\s]*[^.]+/i, '').trim(),
        technologies
      };
    });
  };

  const resumeData = parseComprehensiveResumeData(content);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.name}>{resumeData.personalInfo.name}</Text>
          {resumeData.professionalTitle && (
            <Text style={styles.professionalTitle}>{resumeData.professionalTitle}</Text>
          )}
          <Text style={styles.contactInfo}>
            {resumeData.personalInfo.email} • {resumeData.personalInfo.phone}
          </Text>
          <Text style={styles.contactInfo}>
            {resumeData.personalInfo.location}
          </Text>
        </View>

        {/* Professional Summary */}
        {resumeData.professionalSummary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            {resumeData.professionalSummary.split(/\.\s+/).filter(sentence => sentence.trim().length > 10).map((sentence, index) => (
              <Text key={index} style={styles.summaryText}>
                {sentence.trim()}{sentence.trim().endsWith('.') ? '' : '.'}
              </Text>
            ))}
          </View>
        )}

        {/* Technical Skills */}
        {(resumeData.technicalSkills || resumeData.coreCompetencies) && (
          <View style={styles.compactSection}>
            <Text style={styles.sectionTitle}>Technical Skills & Core Competencies</Text>
            <View style={styles.skillsGrid}>
              {[
                ...(resumeData.technicalSkills?.split(/[,•\n|]/) || []),
                ...(resumeData.coreCompetencies?.split(/[,•\n|]/) || [])
              ]
                .filter(skill => skill.trim())
                .slice(0, 20)
                .map((skill, index) => (
                  <Text key={index} style={styles.skillItem}>
                    {skill.trim()}
                  </Text>
                ))}
            </View>
          </View>
        )}

        {/* Professional Experience - Show ALL experiences */}
        {resumeData.experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Experience</Text>
            {resumeData.experience.map((exp, index) => (
              <View key={index} style={styles.experienceItem}>
                <Text style={styles.jobTitle}>{exp.title}</Text>
                <Text style={styles.companyInfo}>
                  {[exp.company, exp.location, exp.dates].filter(Boolean).join(' • ')}
                </Text>
                {exp.responsibilities.slice(0, 5).map((responsibility: string, respIndex: number) => (
                  <Text key={respIndex} style={styles.bulletPoint}>
                    • {responsibility}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Education - Show ALL education entries */}
        {resumeData.education.length > 0 && (
          <View style={styles.compactSection}>
            <Text style={styles.sectionTitle}>Education</Text>
            {resumeData.education.map((edu, index) => (
              <View key={index} style={styles.educationItem}>
                <Text style={styles.degreeInfo}>{edu.degree}</Text>
                {edu.school && <Text style={styles.schoolInfo}>{edu.school} {edu.year && `• ${edu.year}`}</Text>}
                {edu.details && <Text style={styles.schoolInfo}>{edu.details}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {resumeData.projects.length > 0 && (
          <View style={styles.compactSection}>
            <Text style={styles.sectionTitle}>Key Projects</Text>
            {resumeData.projects.slice(0, 4).map((project, index) => (
              <View key={index} style={styles.projectItem}>
                <Text style={styles.projectTitle}>{project.title}</Text>
                <Text style={styles.projectDesc}>{project.description}</Text>
                {project.technologies && project.technologies.length > 0 && (
                  <Text style={styles.smallText}>Technologies: {project.technologies.join(', ')}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Additional sections */}
        {resumeData.certifications && (
          <View style={styles.compactSection}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {resumeData.certifications.split(/[,\n|]/).filter(cert => cert.trim()).slice(0, 5).map((cert, index) => (
              <Text key={index} style={styles.certificationItem}>
                • {cert.trim()}
              </Text>
            ))}
          </View>
        )}

        {resumeData.awards && (
          <View style={styles.compactSection}>
            <Text style={styles.sectionTitle}>Awards & Recognition</Text>
            {resumeData.awards.split(/[,\n|]/).filter(award => award.trim()).slice(0, 4).map((award, index) => (
              <Text key={index} style={styles.certificationItem}>
                • {award.trim()}
              </Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={{ marginTop: 'auto', paddingTop: 6, borderTop: '0.5 solid #e5e7eb' }}>
          <Text style={styles.smallText}>
            AI-Enhanced Resume • Optimized for {jobDetails.title} at {jobDetails.company}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

// Enhanced Cover Letter PDF Document Component
const CoverLetterPDFDocument: React.FC<{ content: string; jobDetails: any }> = ({ content, jobDetails }) => {
  const extractCoverLetterContent = (htmlContent: string) => {
    const text = htmlContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

    // Extract personal info for header
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    const phoneMatch = text.match(/\b(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/);
    const nameMatch = text.match(/^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/m);

    // Split into meaningful paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 30);

    return {
      fullText: text,
      personalInfo: {
        name: nameMatch ? nameMatch[1] : 'Your Name',
        email: emailMatch ? emailMatch[0] : 'email@example.com',
        phone: phoneMatch ? phoneMatch[0] : '+1 (555) 123-4567'
      },
      paragraphs: paragraphs.length > 0 ? paragraphs : [text]
    };
  };

  const parsedContent = extractCoverLetterContent(content);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{parsedContent.personalInfo.name}</Text>
          <Text style={styles.contactInfo}>
            {parsedContent.personalInfo.email} • {parsedContent.personalInfo.phone}
          </Text>
          <Text style={styles.contactInfo}>
            {new Date().toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.compactSection}>
          <Text style={styles.summaryText}>
            Hiring Manager{'\n'}
            {jobDetails.company}{'\n'}
            {'\n'}
            Re: Application for {jobDetails.title}
          </Text>
        </View>

        <View style={styles.compactSection}>
          <Text style={styles.summaryText}>Dear Hiring Manager,</Text>
        </View>

        {parsedContent.paragraphs.map((paragraph, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.summaryText}>{paragraph.trim()}</Text>
          </View>
        ))}

        <View style={styles.compactSection}>
          <Text style={styles.summaryText}>
            Sincerely,{'\n'}
            {parsedContent.personalInfo.name}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

const OptimizationResults: React.FC<OptimizationResultsProps> = ({ results, jobDetails, analysisData, onBack }) => {
  const [copiedResume, setCopiedResume] = useState(false);
  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);
  const [activeDocument, setActiveDocument] = useState<'resume' | 'cover-letter'>('resume');
  const [showPDFPreview, setShowPDFPreview] = useState(true);

  // Use real analysis data if provided, otherwise fall back to mock data
  const analysisResults = analysisData || {
    matchScore: 85,
    summary: `Excellent match! Your resume shows strong alignment with this position (85% match). The AI has identified key strengths and provided targeted recommendations for optimization.`,
    strengths: [
      "Strong technical background with relevant programming languages",
      "Comprehensive project experience demonstrates practical application",
      "Educational background aligns well with job requirements",
      "Clear progression in role responsibilities",
      "Good mix of technical and soft skills"
    ],
    gaps: [
      "Missing some specific technologies mentioned in job posting",
      "Could emphasize leadership experience more prominently",
      "Quantified achievements could be more specific"
    ],
    suggestions: [
      "Add specific metrics to quantify your achievements (e.g., improved performance by X%)",
      "Include more keywords from the job description in your experience bullets",
      "Highlight any experience with the specific tools mentioned in the posting",
      "Consider adding a brief summary that directly addresses the role requirements"
    ],
    keywordAnalysis: {
      coverageScore: 75,
      coveredKeywords: ["React", "JavaScript", "Node.js", "API", "Database", "Git", "Agile"],
      missingKeywords: ["Docker", "AWS", "TypeScript", "CI/CD", "Microservices"]
    }
  };

  const copyToClipboard = async (text: string, type: 'resume' | 'cover') => {
    try {
      const plainText = text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      await navigator.clipboard.writeText(plainText);

      if (type === 'resume') {
        setCopiedResume(true);
        setTimeout(() => setCopiedResume(false), 2000);
      } else {
        setCopiedCoverLetter(true);
        setTimeout(() => setCopiedCoverLetter(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const downloadAsText = (content: string, filename: string) => {
    const plainText = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsDocx = (content: string, filename: string) => {
    // Simple DOCX generation - create RTF format which can be opened by Word
    const plainText = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}} \\f0\\fs24 ${plainText.replace(/\n/g, '\\par ')}}`;

    const blob = new Blob([rtfContent], { type: 'application/rtf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace('.docx', '.rtf');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) {
      return {
        className: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200',
        icon: <Target className="text-green-600" size={24} />,
        label: 'Excellent Match',
        color: 'text-green-600',
      };
    } else if (score >= 70) {
      return {
        className: 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200',
        icon: <CheckCircle className="text-blue-600" size={24} />,
        label: 'Good Match',
        color: 'text-blue-600',
      };
    } else if (score >= 50) {
      return {
        className: 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-200',
        icon: <TrendingUp className="text-yellow-600" size={24} />,
        label: 'Fair Match',
        color: 'text-yellow-600',
      };
    } else {
      return {
        className: 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-200',
        icon: <AlertCircle className="text-red-600" size={24} />,
        label: 'Needs Improvement',
        color: 'text-red-600',
      };
    }
  };

  const scoreBadge = getScoreBadge(analysisResults.matchScore);

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Brain className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    🎯 Resume Enhancement Results
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Optimized for {jobDetails.title} at {jobDetails.company}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Match Score Section */}
        <div className="text-center">
          <div className={`inline-flex items-center gap-4 px-8 py-6 rounded-2xl border-2 ${scoreBadge.className}`}>
            {scoreBadge.icon}
            <div>
              <div className="text-lg font-semibold">{scoreBadge.label}</div>
              <div className={`text-3xl font-bold ${scoreBadge.color}`}>{analysisResults.matchScore}%</div>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg mt-4 max-w-2xl mx-auto leading-relaxed">
            {analysisResults.summary}
          </p>
        </div>

        {/* Document Viewer Section with Fixed PDF */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Enhanced Documents</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPDFPreview(!showPDFPreview)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Eye size={16} />
                  {showPDFPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>
            </div>

            {/* Document Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setActiveDocument('resume')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeDocument === 'resume'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
                  }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                📝 AI-Enhanced Resume
              </button>
              <button
                onClick={() => setActiveDocument('cover-letter')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeDocument === 'cover-letter'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
                  }`}
              >
                <Award className="h-4 w-4 inline mr-2" />
                📄 AI-Enhanced Cover Letter
              </button>
            </div>
          </div>

          {/* Document Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left: Text Content */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {activeDocument === 'resume' ? 'Resume Content' : 'Cover Letter Content'}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(
                      activeDocument === 'resume' ? results.resume_html : results.cover_letter_html,
                      activeDocument === 'resume' ? 'resume' : 'cover'
                    )}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Copy content"
                  >
                    {(activeDocument === 'resume' ? copiedResume : copiedCoverLetter) ?
                      <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: activeDocument === 'resume' ? results.resume_html : results.cover_letter_html
                  }}
                />
              </div>

              {/* Download Options */}
              <div className="mt-4 space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => downloadAsText(
                      activeDocument === 'resume' ? results.resume_html : results.cover_letter_html,
                      activeDocument === 'resume' ? 'ai-enhanced-resume.txt' : 'ai-enhanced-cover-letter.txt'
                    )}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download size={16} />
                    Download TXT
                  </button>
                  <button
                    onClick={() => downloadAsDocx(
                      activeDocument === 'resume' ? results.resume_html : results.cover_letter_html,
                      activeDocument === 'resume' ? 'ai-enhanced-resume.docx' : 'ai-enhanced-cover-letter.docx'
                    )}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileText size={16} />
                    Download RTF/Word
                  </button>
                </div>

                {/* PDF Download Links */}
                <div className="flex gap-3">
                  <PDFDownloadLink
                    document={
                      activeDocument === 'resume' ?
                        <ResumePDFDocument content={results.resume_html} jobDetails={jobDetails} /> :
                        <CoverLetterPDFDocument content={results.cover_letter_html} jobDetails={jobDetails} />
                    }
                    fileName={activeDocument === 'resume' ?
                      `ai-enhanced-resume-${jobDetails.company.replace(/\s+/g, '-')}.pdf` :
                      `ai-enhanced-cover-letter-${jobDetails.company.replace(/\s+/g, '-')}.pdf`
                    }
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    {({ blob, url, loading, error }) => (
                      <>
                        <Download size={16} />
                        {loading ? 'Generating PDF...' : 'Download PDF'}
                      </>
                    )}
                  </PDFDownloadLink>
                </div>
              </div>
            </div>

            {/* Right: Fixed PDF Preview */}
            {showPDFPreview && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">PDF Preview</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="h-96 bg-white rounded border overflow-hidden">
                    <PDFViewer width="100%" height="100%" style={{ border: 'none' }} showToolbar={false}>
                      {activeDocument === 'resume' ?
                        <ResumePDFDocument content={results.resume_html} jobDetails={jobDetails} /> :
                        <CoverLetterPDFDocument content={results.cover_letter_html} jobDetails={jobDetails} />
                      }
                    </PDFViewer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Keyword Analysis */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            🔍 Keyword Analysis
          </h3>
          <div className="mb-6">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {analysisResults.keywordAnalysis.coverageScore}% Keyword Coverage
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {analysisResults.keywordAnalysis.coveredKeywords.length > 0 && (
              <div>
                <h4 className="font-medium text-green-700 dark:text-green-400 mb-3">✅ Covered Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResults.keywordAnalysis.coveredKeywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-sm font-medium"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysisResults.keywordAnalysis.missingKeywords.length > 0 && (
              <div>
                <h4 className="font-medium text-red-700 dark:text-red-400 mb-3">❌ Missing Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResults.keywordAnalysis.missingKeywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full text-sm font-medium"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Strengths */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border-l-4 border-green-500">
            <h4 className="text-lg font-semibold text-green-800 dark:text-green-400 mb-4 flex items-center gap-2">
              💪 Strengths
            </h4>
            <ul className="space-y-2">
              {analysisResults.strengths.map((item, index) => (
                <li key={index} className="text-green-700 dark:text-green-300 text-sm leading-relaxed">
                  • {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Gaps */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border-l-4 border-red-500">
            <h4 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-4 flex items-center gap-2">
              🔍 Gaps to Address
            </h4>
            <ul className="space-y-2">
              {analysisResults.gaps.map((item, index) => (
                <li key={index} className="text-red-700 dark:text-red-300 text-sm leading-relaxed">
                  • {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border-l-4 border-blue-500">
            <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-400 mb-4 flex items-center gap-2">
              💡 Improvement Tips
            </h4>
            <ul className="space-y-2">
              {analysisResults.suggestions.map((item, index) => (
                <li key={index} className="text-blue-700 dark:text-blue-300 text-sm leading-relaxed">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 text-center">
          <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">🚀 Next Steps</h4>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your AI-optimized documents are ready! Download them in your preferred format and use them for your job applications.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={onBack}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all hover:shadow-lg"
            >
              Back to Application
            </button>
            <button
              onClick={() => {
                downloadAsText(results.resume_html, 'ai-enhanced-resume.txt');
                downloadAsText(results.cover_letter_html, 'ai-enhanced-cover-letter.txt');
              }}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-all hover:shadow-lg flex items-center gap-2"
            >
              <Download size={16} />
              Download Both Documents
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationResults;