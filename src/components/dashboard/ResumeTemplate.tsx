import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { UserProfileData } from '../../services/profileService';

// Register fonts for better typography (optional - you can remove if fonts aren't available)
// Font.register({
//   family: 'Inter',
//   src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2'
// });

// Enhanced styles for maximum ATS compatibility and professional appearance
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40, // Standard resume margins
    fontFamily: 'Helvetica', // ATS-friendly font
    fontSize: 11,
    lineHeight: 1.4,
    color: '#000000',
  },

  // Header styles
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #2563EB',
    paddingBottom: 15,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  contactInfo: {
    fontSize: 11,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  contactLine: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },

  // Section styles
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 8,
    textTransform: 'uppercase',
    borderLeft: '3 solid #2563EB',
    paddingLeft: 8,
    letterSpacing: 0.5,
  },

  // Professional Summary
  summaryContainer: {
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 11,
    lineHeight: 1.5,
    color: '#374151',
    textAlign: 'justify',
    marginBottom: 6,
  },

  // Skills styles
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  skillItem: {
    backgroundColor: '#F3F4F6',
    border: '1 solid #E5E7EB',
    borderRadius: 4,
    padding: '4 8',
    margin: '2 4 2 0',
    fontSize: 10,
    color: '#374151',
  },
  skillItemHighlight: {
    backgroundColor: '#EBF8FF',
    border: '1 solid #3B82F6',
    borderRadius: 4,
    padding: '4 8',
    margin: '2 4 2 0',
    fontSize: 10,
    color: '#1E40AF',
    fontWeight: 'bold',
  },

  // Experience styles
  experienceItem: {
    marginBottom: 14,
    pageBreakInside: false,
  },
  jobTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  jobDates: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  companyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  companyName: {
    fontSize: 11,
    color: '#374151',
    fontWeight: 'bold',
  },
  jobLocation: {
    fontSize: 10,
    color: '#6B7280',
  },

  // Bullet points
  bulletContainer: {
    flexDirection: 'row',
    marginBottom: 3,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    fontSize: 8,
    color: '#2563EB',
    width: 12,
    marginTop: 1,
  },
  bulletText: {
    fontSize: 10,
    lineHeight: 1.4,
    color: '#374151',
    flex: 1,
  },

  // Education styles
  educationItem: {
    marginBottom: 10,
  },
  degreeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  degree: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  graduationDate: {
    fontSize: 10,
    color: '#6B7280',
  },
  school: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 2,
  },
  educationDetails: {
    fontSize: 9,
    color: '#6B7280',
    lineHeight: 1.3,
  },

  // Projects styles
  projectItem: {
    marginBottom: 10,
  },
  projectTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 3,
  },
  projectTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  projectDuration: {
    fontSize: 9,
    color: '#6B7280',
  },
  projectDescription: {
    fontSize: 10,
    lineHeight: 1.3,
    color: '#374151',
    marginBottom: 4,
    textAlign: 'justify',
  },
  projectTech: {
    fontSize: 9,
    color: '#6B7280',
    fontStyle: 'italic',
  },

  // Additional sections
  listItem: {
    flexDirection: 'row',
    marginBottom: 3,
    alignItems: 'flex-start',
  },
  listBullet: {
    fontSize: 10,
    color: '#2563EB',
    width: 10,
    marginTop: 1,
  },
  listText: {
    fontSize: 10,
    color: '#374151',
    flex: 1,
    lineHeight: 1.3,
  },

  // Certification styles
  certificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  certificationInfo: {
    flex: 1,
  },
  certificationName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 1,
  },
  certificationOrg: {
    fontSize: 9,
    color: '#6B7280',
  },
  certificationDates: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'right',
  },

  // Footer
  footer: {
    marginTop: 'auto',
    paddingTop: 10,
    borderTop: '1 solid #E5E7EB',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#9CA3AF',
  },
});

// Enhanced HTML content parser with better structure preservation
class ResumeContentParser {
  private content: string;

  constructor(htmlContent: string) {
    this.content = this.cleanHTML(htmlContent);
  }

  private cleanHTML(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  extractSection(sectionNames: string[]): string {
    const content = this.content;

    for (const sectionName of sectionNames) {
      const patterns = [
        new RegExp(`${sectionName}[:\\s]*\\n([\\s\\S]*?)(?=\\n\\s*(?:PROFESSIONAL SUMMARY|TECHNICAL SKILLS|CORE COMPETENCIES|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EDUCATION|PROJECTS|KEY PROJECTS|CERTIFICATIONS|AWARDS|VOLUNTEER|PUBLICATIONS|$))`, 'i'),
        new RegExp(`${sectionName}[:\\s]*([\\s\\S]*?)(?=\\n[A-Z][A-Z\\s]{8,}|$)`, 'i')
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]?.trim() && match[1].trim().length > 20) {
          return match[1].trim();
        }
      }
    }
    return '';
  }

  extractExperience(): any[] {
    const experienceText = this.extractSection(['PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE', 'EXPERIENCE']);
    if (!experienceText) return [];

    // Enhanced experience parsing with multiple strategies
    const experiences: any[] = [];
    const lines = experienceText.split('\n').map(l => l.trim()).filter(Boolean);

    let currentExperience: any = null;
    let collectingBullets = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1] || '';

      // Detect job titles (various patterns)
      const isJobTitle = this.isJobTitleLine(line);
      const isCompanyLine = this.isCompanyLine(line);
      const isBulletPoint = this.isBulletPoint(line);

      if (isJobTitle) {
        // Save previous experience
        if (currentExperience) {
          experiences.push(currentExperience);
        }

        // Start new experience
        currentExperience = {
          title: this.extractJobTitle(line),
          company: '',
          dates: '',
          location: '',
          responsibilities: []
        };

        // Try to extract additional info from the same line
        const titleParts = this.parseJobTitleLine(line);
        currentExperience = { ...currentExperience, ...titleParts };

        collectingBullets = true;
      } else if (currentExperience && isCompanyLine && !currentExperience.company) {
        // Parse company information
        const companyInfo = this.parseCompanyLine(line);
        currentExperience = { ...currentExperience, ...companyInfo };
      } else if (currentExperience && isBulletPoint) {
        // Add responsibility
        const responsibility = this.cleanBulletPoint(line);
        if (responsibility.length > 10) {
          currentExperience.responsibilities.push(responsibility);
        }
      } else if (currentExperience && collectingBullets && line.length > 20 && !this.isDateLine(line)) {
        // Potential responsibility without bullet
        currentExperience.responsibilities.push(line);
      }
    }

    // Add final experience
    if (currentExperience) {
      experiences.push(currentExperience);
    }

    // Ensure all experiences have required fields
    return experiences.map(exp => ({
      title: exp.title || 'Professional Role',
      company: exp.company || 'Company Name',
      dates: exp.dates || '',
      location: exp.location || '',
      responsibilities: exp.responsibilities.slice(0, 6) // Limit bullets for space
    }));
  }

  private isJobTitleLine(line: string): boolean {
    return /^[A-Z][a-zA-Z\s&,.-]*(?:Engineer|Developer|Manager|Analyst|Specialist|Coordinator|Director|Lead|Senior|Junior|Architect|Consultant|Associate|Executive|Administrator|Supervisor|Officer|Representative|Technician|Designer|Scientist|Researcher)/i.test(line) ||
           /^[A-Z][a-zA-Z\s&,.-]+\s+(?:at|@|\||–|—)\s+[A-Z]/i.test(line) ||
           (line.match(/[A-Z][a-z]/) !== null && line.length < 100 && !line.includes('•') && !line.includes('-') && !this.isDateLine(line));
  }

  private isCompanyLine(line: string): boolean {
    return /^[A-Z][a-zA-Z\s&,.-]+(?:Inc|LLC|Corp|Company|Ltd|Technologies|Solutions|Systems|Group|Enterprises|Associates)/i.test(line) ||
           /^\d{1,2}\/\d{4}|\d{4}\s*[-–—]\s*(?:Present|Current|\d{4})/i.test(line) ||
           /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i.test(line);
  }

  private isBulletPoint(line: string): boolean {
    return /^[•·\-*→▪▫◦‣⁃]\s/.test(line) || /^\d+\.\s/.test(line);
  }

  private isDateLine(line: string): boolean {
    return /\d{4}/.test(line) && /(?:Present|Current|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(line);
  }

  private parseJobTitleLine(line: string): any {
    const result: any = { title: line };

    // Extract company with various separators
    const companyMatch = line.match(/^(.+?)\s+(?:at|@|\||–|—)\s+([^•|–—]+?)(?:\s+[•|–—]\s+(.+))?$/i);
    if (companyMatch) {
      result.title = companyMatch[1].trim();
      result.company = companyMatch[2].trim();

      if (companyMatch[3]) {
        const remainder = companyMatch[3].trim();
        if (this.isDateLine(remainder)) {
          result.dates = remainder;
        } else {
          result.location = remainder;
        }
      }
    }

    return result;
  }

  private parseCompanyLine(line: string): any {
    const result: any = {};

    // Split by common separators
    const parts = line.split(/\s+[•|–—]\s+/).map(p => p.trim());

    if (parts.length >= 1) {
      result.company = parts[0];
    }
    if (parts.length >= 2) {
      if (this.isDateLine(parts[1])) {
        result.dates = parts[1];
        if (parts[2]) result.location = parts[2];
      } else {
        result.location = parts[1];
        if (parts[2]) result.dates = parts[2];
      }
    }

    return result;
  }

  private extractJobTitle(line: string): string {
    return line.replace(/\s+(?:at|@|\||–|—)\s+.*$/i, '').trim();
  }

  private cleanBulletPoint(line: string): string {
    return line.replace(/^[•·\-*→▪▫◦‣⁃]\s*/, '').replace(/^\d+\.\s*/, '').trim();
  }

  extractEducation(): any[] {
    const educationText = this.extractSection(['EDUCATION', 'ACADEMIC BACKGROUND']);
    if (!educationText) return [];

    const education: any[] = [];
    const lines = educationText.split('\n').map(l => l.trim()).filter(Boolean);

    let currentEdu: any = null;

    for (const line of lines) {
      if (this.isDegreeeLine(line)) {
        if (currentEdu) education.push(currentEdu);

        const degreeInfo = this.parseDegree(line);
        currentEdu = degreeInfo;
      } else if (currentEdu && this.isSchoolLine(line)) {
        currentEdu.school = line;
      } else if (currentEdu && line.length > 5) {
        currentEdu.details = (currentEdu.details || '') + ' ' + line;
      }
    }

    if (currentEdu) education.push(currentEdu);

    return education;
  }

  private isDegreeeLine(line: string): boolean {
    return /(?:Bachelor|Master|PhD|Associate|Diploma|Certificate|B\.S\.|M\.S\.|B\.A\.|M\.A\.|B\.Sc\.|M\.Sc\.|Doctorate)/i.test(line);
  }

  private isSchoolLine(line: string): boolean {
    return /(?:University|College|Institute|School|Academy)/i.test(line);
  }

  private parseDegree(line: string): any {
    const dateMatch = line.match(/(\d{4})/);
    const degree = line.replace(/\s*\d{4}\s*/, '').trim();

    return {
      degree,
      school: '',
      graduationDate: dateMatch ? dateMatch[1] : '',
      details: ''
    };
  }

  extractProjects(): any[] {
    const projectsText = this.extractSection(['KEY PROJECTS', 'PROJECTS', 'NOTABLE PROJECTS']);
    if (!projectsText) return [];

    const projects = projectsText
      .split(/\n\s*\n/)
      .filter(p => p.trim().length > 20)
      .map(project => {
        const lines = project.split('\n').map(l => l.trim()).filter(Boolean);
        const title = lines[0]?.replace(/^[•\d.\s-]+/, '').trim() || 'Project';
        const description = lines.slice(1).join(' ').trim() || 'Project description and achievements.';

        return { title, description };
      });

    return projects;
  }

  extractSkills(): string[] {
    const techSkills = this.extractSection(['TECHNICAL SKILLS', 'SKILLS', 'TECHNOLOGIES']);
    const coreComp = this.extractSection(['CORE COMPETENCIES', 'COMPETENCIES', 'SOFT SKILLS']);

    const allSkills = (techSkills + ' ' + coreComp)
      .split(/[,•\n|]/)
      .map(skill => skill.trim())
      .filter(skill => skill.length > 2 && skill.length < 30);

    return Array.from(new Set(allSkills)); // Remove duplicates
  }
}

// Enhanced PDF Resume Component
const PerfectHTMLToPDF: React.FC<{
  htmlContent: string;
  profile: UserProfileData;
  jobKeywords?: string[];
}> = ({ htmlContent, profile, jobKeywords = [] }) => {

  const parser = new ResumeContentParser(htmlContent);

  // Extract structured data
  const professionalSummary = parser.extractSection(['PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE']);
  const experience = parser.extractExperience();
  const education = parser.extractEducation();
  const projects = parser.extractProjects();
  const skills = parser.extractSkills();
  const certifications = parser.extractSection(['CERTIFICATIONS', 'LICENSES']);
  const awards = parser.extractSection(['AWARDS', 'RECOGNITION', 'HONORS']);

  // Prioritize skills based on job keywords
  const prioritizeSkills = (skillsList: string[]): { priority: string[], regular: string[] } => {
    const priority: string[] = [];
    const regular: string[] = [];

    skillsList.forEach(skill => {
      const isHighPriority = jobKeywords.some(keyword =>
        skill.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(skill.toLowerCase())
      );

      if (isHighPriority) {
        priority.push(skill);
      } else {
        regular.push(skill);
      }
    });

    return { priority, regular };
  };

  const { priority: prioritySkills, regular: regularSkills } = prioritizeSkills(skills);

  // Fallback content for empty sections
  const fallbackExperience = [
    {
      title: 'Senior Professional Role',
      company: 'Technology Company',
      dates: '2020 - Present',
      location: 'City, State',
      responsibilities: [
        'Led cross-functional teams to deliver high-impact projects ahead of schedule',
        'Implemented innovative solutions that improved operational efficiency by 35%',
        'Managed stakeholder relationships and facilitated strategic decision-making processes',
        'Mentored junior team members and established best practices for knowledge sharing'
      ]
    }
  ];

  const fallbackEducation = [
    {
      degree: 'Relevant Degree in Professional Field',
      school: 'Accredited University',
      graduationDate: '2018',
      details: 'Relevant coursework and academic achievements'
    }
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>
            {profile.fullName || 'Professional Name'}
          </Text>
          <Text style={styles.contactInfo}>
            {profile.email || 'email@example.com'}
            {profile.phone && ` • ${profile.phone}`}
          </Text>
          {profile.location && (
            <Text style={styles.contactInfo}>
              {profile.location}
            </Text>
          )}
          {(profile.linkedin || profile.github || profile.portfolio) && (
            <Text style={styles.contactInfo}>
              {profile.linkedin && `LinkedIn: ${profile.linkedin.replace('https://www.linkedin.com/in/', '')}`}
              {profile.linkedin && profile.github && ' • '}
              {profile.github && `GitHub: ${profile.github.replace('https://github.com/', '')}`}
              {(profile.linkedin || profile.github) && profile.portfolio && ' • '}
              {profile.portfolio && `Portfolio: ${profile.portfolio}`}
            </Text>
          )}
        </View>

        {/* Professional Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.sectionTitle}>Professional Summary</Text>
          {professionalSummary ? (
            professionalSummary.split(/\.\s+/)
              .filter(sentence => sentence.trim().length > 15)
              .slice(0, 3)
              .map((sentence, index) => (
                <Text key={index} style={styles.summaryText}>
                  {sentence.trim()}{!sentence.trim().endsWith('.') ? '.' : ''}
                </Text>
              ))
          ) : (
            <Text style={styles.summaryText}>
              Results-driven professional with proven expertise in delivering exceptional outcomes in dynamic, fast-paced environments.
              Demonstrated ability to leverage cutting-edge technologies and innovative methodologies to drive business growth and
              operational excellence while maintaining the highest standards of quality and efficiency.
            </Text>
          )}
        </View>

        {/* Technical Skills */}
        {(prioritySkills.length > 0 || regularSkills.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technical Skills & Core Competencies</Text>
            <View style={styles.skillsContainer}>
              {prioritySkills.slice(0, 8).map((skill, index) => (
                <Text key={`priority-${index}`} style={styles.skillItemHighlight}>
                  {skill}
                </Text>
              ))}
              {regularSkills.slice(0, 12).map((skill, index) => (
                <Text key={`regular-${index}`} style={styles.skillItem}>
                  {skill}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Professional Experience */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Experience</Text>
          {(experience.length > 0 ? experience : fallbackExperience).map((exp, index) => (
            <View key={index} style={styles.experienceItem}>
              <View style={styles.jobTitleRow}>
                <Text style={styles.jobTitle}>{exp.title}</Text>
                <Text style={styles.jobDates}>{exp.dates}</Text>
              </View>
              <View style={styles.companyRow}>
                <Text style={styles.companyName}>{exp.company}</Text>
                {exp.location && <Text style={styles.jobLocation}>{exp.location}</Text>}
              </View>
              {exp.responsibilities.slice(0, 5).map((resp: string, respIndex: number) => (
                <View key={respIndex} style={styles.bulletContainer}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.bulletText}>{resp}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Education */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          {(education.length > 0 ? education : fallbackEducation).map((edu, index) => (
            <View key={index} style={styles.educationItem}>
              <View style={styles.degreeRow}>
                <Text style={styles.degree}>{edu.degree}</Text>
                {edu.graduationDate && <Text style={styles.graduationDate}>{edu.graduationDate}</Text>}
              </View>
              {edu.school && <Text style={styles.school}>{edu.school}</Text>}
              {edu.details && <Text style={styles.educationDetails}>{edu.details}</Text>}
            </View>
          ))}
        </View>

        {/* Projects */}
        {projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Projects</Text>
            {projects.slice(0, 3).map((project, index) => (
              <View key={index} style={styles.projectItem}>
                <Text style={styles.projectTitle}>{project.title}</Text>
                <Text style={styles.projectDescription}>{project.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Certifications */}
        {certifications && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {certifications.split(/[,\n|]/)
              .filter(cert => cert.trim().length > 5)
              .slice(0, 5)
              .map((cert, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listBullet}>•</Text>
                  <Text style={styles.listText}>{cert.trim()}</Text>
                </View>
              ))}
          </View>
        )}

        {/* Awards */}
        {awards && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Awards & Recognition</Text>
            {awards.split(/[,\n|]/)
              .filter(award => award.trim().length > 5)
              .slice(0, 4)
              .map((award, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listBullet}>•</Text>
                  <Text style={styles.listText}>{award.trim()}</Text>
                </View>
              ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ATS-Optimized Resume • Tailored for Professional Excellence • {new Date().toLocaleDateString()}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

// Original ResumeTemplate component (keeping for backward compatibility)
const ResumeTemplate: React.FC<{
  profile: UserProfileData;
  resumeHtml: string;
  jobKeywords?: string[];
}> = ({ profile, resumeHtml, jobKeywords }) => {
  return (
    <PerfectHTMLToPDF
      htmlContent={resumeHtml}
      profile={profile}
      jobKeywords={jobKeywords}
    />
  );
};

export default ResumeTemplate;
export { PerfectHTMLToPDF };
