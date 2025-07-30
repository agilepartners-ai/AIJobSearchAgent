import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { UserProfileData } from '../../services/profileService';

interface ResumeTemplateProps {
  profile: UserProfileData;
  resumeHtml: string;
}

// Enhanced styles for comprehensive resume
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 15,
    fontFamily: 'Helvetica',
    fontSize: 9,
    lineHeight: 1.3,
  },
  header: {
    textAlign: 'center',
    marginBottom: 12,
    borderBottom: '1 solid #2563eb',
    paddingBottom: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
    lineHeight: 1.1,
  },
  contactLine: {
    fontSize: 9,
    color: '#4b5563',
    marginBottom: 1,
    lineHeight: 1.2,
  },
  professionalSummary: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2563eb',
    borderLeft: '3 solid #2563eb',
    paddingLeft: 5,
    marginBottom: 5,
    marginTop: 8,
    lineHeight: 1.1,
    textTransform: 'uppercase',
  },
  summaryText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#374151',
    textAlign: 'justify',
    marginBottom: 3,
  },
  section: {
    marginBottom: 10,
  },
  compactSection: {
    marginBottom: 8,
  },
  experienceItem: {
    marginBottom: 8,
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
    marginLeft: 10,
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

const ResumeTemplate: React.FC<ResumeTemplateProps> = ({ profile, resumeHtml }) => {
  // Enhanced parsing to extract and structure resume data more accurately
  const parseResumeData = (htmlContent: string) => {
    console.log('Parsing HTML content:', htmlContent.substring(0, 500)); // Debug log

    // Clean up HTML content more thoroughly
    const textContent = htmlContent
      .replace(/<[^>]*>/g, '\n') // Replace HTML tags with newlines
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // More robust section extraction with better patterns
    const sections = {
      professionalSummary: extractSectionContent(textContent, ['PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE']),
      technicalSkills: extractSectionContent(textContent, ['TECHNICAL SKILLS', 'SKILLS', 'TECHNOLOGIES']),
      coreCompetencies: extractSectionContent(textContent, ['CORE COMPETENCIES', 'COMPETENCIES', 'STRENGTHS']),
      experience: extractAllExperience(textContent),
      education: extractAllEducation(textContent),
      projects: extractAllProjects(textContent),
      certifications: extractSectionContent(textContent, ['CERTIFICATIONS', 'LICENSES']),
      awards: extractSectionContent(textContent, ['AWARDS', 'RECOGNITION', 'HONORS']),
      volunteer: extractSectionContent(textContent, ['VOLUNTEER EXPERIENCE', 'VOLUNTEER', 'COMMUNITY SERVICE']),
      publications: extractSectionContent(textContent, ['PUBLICATIONS', 'RESEARCH', 'PAPERS'])
    };

    console.log('Parsed sections:', sections); // Debug log
    return sections;
  };

  const extractSectionContent = (content: string, sectionNames: string[]) => {
    for (const sectionName of sectionNames) {
      const patterns = [
        new RegExp(`${sectionName}[:\\s]*([\\s\\S]*?)(?=(?:PROFESSIONAL SUMMARY|TECHNICAL SKILLS|CORE COMPETENCIES|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EDUCATION|KEY PROJECTS|PROJECTS|CERTIFICATIONS|AWARDS|VOLUNTEER EXPERIENCE|PUBLICATIONS)|$)`, 'i'),
        new RegExp(`${sectionName}[:\\s]*([\\s\\S]*?)(?=\\n\\s*[A-Z][A-Z\\s]{10,}|$)`, 'i')
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]?.trim() && match[1].trim().length > 10) {
          return match[1].trim();
        }
      }
    }
    return '';
  };

  const extractAllExperience = (content: string) => {
    const experienceText = extractSectionContent(content, ['PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE', 'EXPERIENCE', 'EMPLOYMENT']);
    console.log('Full experience text:', experienceText); // Debug log

    if (!experienceText || experienceText.length < 20) return [];

    // Enhanced parsing with multiple approaches
    let allExperiences: any[] = [];

    // Method 1: Split by common job patterns
    const jobPatterns = [
      /(?=\n\s*(?:[A-Z][a-zA-Z\s&,.-]*(?:Engineer|Developer|Manager|Analyst|Specialist|Coordinator|Director|Lead|Senior|Junior|Intern|Consultant|Associate|Executive|Administrator|Supervisor|Officer|Representative)))/gm,
      /(?=\n\s*[A-Z][a-zA-Z\s&,.-]+\s+(?:at|@|\|)\s+[A-Z])/gm,
      /(?=\n\s*[A-Z][a-zA-Z\s&,.-]+\s+[-–—]\s+[A-Z])/gm,
      /(?=\n\s*\d{1,2}\/\d{4}|\d{4}\s*[-–—]\s*(?:Present|Current|\d{4}))/gm,
      /(?=\n\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/gm
    ];

    for (const pattern of jobPatterns) {
      const entries = experienceText.split(pattern).filter(entry => entry.trim().length > 40);
      if (entries.length > allExperiences.length) {
        allExperiences = entries;
      }
    }

    // Method 2: If still limited results, try aggressive splitting
    if (allExperiences.length < 2) {
      // Split by any line that looks like a job title or company
      const aggressivePatterns = [
        /(?=\n\s*[A-Z][a-zA-Z\s]+(?:\s+at\s+|\s+@\s+|\s+-\s+|\s+\|\s+)[A-Z])/gm,
        /(?=\n\s*[A-Z][a-zA-Z\s,&.-]{10,}(?:\s+\d{4}|\s+Jan|\s+Feb|\s+Mar|\s+Apr|\s+May|\s+Jun|\s+Jul|\s+Aug|\s+Sep|\s+Oct|\s+Nov|\s+Dec))/gm,
        /(?=\n\s*[A-Z][a-zA-Z\s,&.-]+\n[A-Z][a-zA-Z\s,&.-]+\s*(?:\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/gm
      ];

      for (const pattern of aggressivePatterns) {
        const entries = experienceText.split(pattern).filter(entry => entry.trim().length > 30);
        if (entries.length > allExperiences.length) {
          allExperiences = entries;
        }
      }
    }

    // Method 3: Split by paragraph breaks as last resort
    if (allExperiences.length < 2) {
      const paragraphs = experienceText.split(/\n\s*\n/).filter(p => p.trim().length > 30);
      if (paragraphs.length > 1) {
        allExperiences = paragraphs;
      }
    }

    // Method 4: Manual detection of experience blocks
    if (allExperiences.length < 2) {
      const lines = experienceText.split('\n');
      let currentExp = '';
      const experiences = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check if this line looks like a new job title
        const isJobTitle = /^[A-Z][a-zA-Z\s&,.-]*(?:Engineer|Developer|Manager|Analyst|Specialist|Coordinator|Director|Lead|Senior|Junior|Intern|Consultant|Associate|Executive|Administrator|Supervisor|Officer|Representative)/i.test(line) ||
          /^[A-Z][a-zA-Z\s&,.-]+\s+(?:at|@|\|)\s+[A-Z]/i.test(line) ||
          /^\d{1,2}\/\d{4}|\d{4}\s*[-–—]\s*(?:Present|Current|\d{4})/i.test(line);

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
      }
    }

    // Parse each experience entry
    const parsedExperiences = allExperiences
      .filter(entry => entry.trim().length > 20)
      .map(entry => parseExperienceEntry(entry))
      .filter(exp => exp.title && exp.title.length > 0);

    console.log('Final extracted experiences count:', parsedExperiences.length);
    console.log('Experiences:', parsedExperiences);

    return parsedExperiences;
  };

  const parseExperienceEntry = (entry: string) => {
    const lines = entry.split('\n').filter(line => line.trim()).map(line => line.trim());
    if (lines.length === 0) return { title: '', company: '', dates: '', location: '', responsibilities: [] };

    let title = '';
    let company = '';
    let dates = '';
    let location = '';
    let responsibilities: string[] = [];

    // Enhanced parsing for various formats
    const firstLine = lines[0] || '';
    const secondLine = lines[1] || '';
    const thirdLine = lines[2] || '';

    // Pattern matching for different resume formats
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

        // Determine which parts are location vs dates
        const part3 = match[3]?.trim() || '';
        const part4 = match[4]?.trim() || '';

        // Check if parts contain dates
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

    // If first line parsing failed, try alternative approaches
    if (!parsed) {
      title = firstLine;

      // Check second line for company info
      if (secondLine) {
        const companyPatterns = [
          /^(.+?)(?:\s+[•·|]\s+(.+?))?(?:\s+[•·|]\s+(.+?))?$/,
          /^(.+?),\s+(.+?)(?:\s+[•·|]\s+(.+?))?$/
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

      // Check third line for additional info
      if (thirdLine && (!dates || !location)) {
        const datePattern = /\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|Current/i;
        if (datePattern.test(thirdLine)) {
          dates = dates || thirdLine;
        } else {
          location = location || thirdLine;
        }
      }
    }

    // Extract responsibilities from remaining lines
    const startIndex = parsed ? 1 : (company ? 2 : 3);
    responsibilities = lines.slice(startIndex)
      .map(line => line.replace(/^[•·\-*→▪▫◦‣⁃]\s*/, '').trim())
      .filter(line => {
        // Filter out lines that are clearly not responsibilities
        return line.length > 5 &&
          !line.match(/^\d{4}/) &&
          !line.match(/^[A-Z][a-z]+\s+\d{4}/) &&
          !line.match(/^(?:at|@)\s+[A-Z]/) &&
          !line.match(/^[A-Z][a-zA-Z\s&,.-]*(?:Engineer|Developer|Manager|Analyst)/)
      })
      .slice(0, 8);

    // Clean up extracted data
    title = title || 'Professional Role';
    company = company || 'Company Name';

    return {
      title,
      company,
      dates: dates || '',
      location: location || '',
      responsibilities: responsibilities.length > 0 ? responsibilities : [
        'Key responsibilities and achievements in this role.',
        'Delivered results that contributed to business objectives.',
        'Collaborated effectively with team members and stakeholders.'
      ]
    };
  };

  // Enhanced project extraction
  const extractAllProjects = (content: string) => {
    const projectsText = extractSectionContent(content, ['KEY PROJECTS', 'PROJECTS', 'NOTABLE PROJECTS', 'SELECTED PROJECTS']);
    if (!projectsText) return [];

    // Multiple splitting approaches for projects
    const projectPatterns = [
      /(?=\n\s*[A-Z][a-zA-Z\s&,.-]*(?:Project|System|Application|Platform|Tool|Solution|Website|App|Portal|Dashboard))/gi,
      /(?=\n\s*[A-Z][a-zA-Z\s&,.-]+\s+[-–—]\s+)/gm,
      /(?=\n\s*\d+\.\s*[A-Z])/gm,
      /(?=\n\s*•\s*[A-Z])/gm
    ];

    let allProjects: any[] = [];

    for (const pattern of projectPatterns) {
      const entries = projectsText.split(pattern).filter(entry => entry.trim().length > 15);
      if (entries.length > allProjects.length) {
        allProjects = entries;
      }
    }

    // If still no results, split by paragraphs
    if (allProjects.length === 0) {
      allProjects = projectsText.split(/\n\s*\n/).filter(p => p.trim().length > 15);
    }

    return allProjects.map(project => {
      const lines = project.split('\n').filter((line: string) => line.trim());
      const title = lines[0]?.replace(/^[•\d.\s-]+/, '').trim() || 'Project';
      const description = lines.slice(1).join(' ').trim() || 'Project description and key achievements.';

      return { title, description };
    });
  };

  // Enhanced education extraction
  const extractAllEducation = (content: string) => {
    const educationText = extractSectionContent(content, ['EDUCATION', 'ACADEMIC BACKGROUND', 'ACADEMIC QUALIFICATIONS']);
    if (!educationText) return [];

    // Split by common education patterns
    const educationPatterns = [
      /(?=\n\s*(?:Bachelor|Master|PhD|Associate|Diploma|Certificate|B\.S\.|M\.S\.|B\.A\.|M\.A\.|B\.Sc\.|M\.Sc\.))/gi,
      /(?=\n\s*[A-Z][a-zA-Z\s&,.-]+(?:University|College|Institute|School))/gi,
      /(?=\n\s*\d{4}\s*[-–—]\s*\d{4})/gm
    ];

    let allEducation: any[] = [];

    for (const pattern of educationPatterns) {
      const entries = educationText.split(pattern).filter(entry => entry.trim().length > 10);
      if (entries.length > allEducation.length) {
        allEducation = entries;
      }
    }

    // Fallback to line-by-line parsing
    if (allEducation.length === 0) {
      allEducation = educationText.split(/\n/).filter(line => line.trim().length > 10);
    }

    return allEducation.map(entry => {
      const lines = entry.split('\n').filter((line: string) => line.trim());
      return {
        degree: lines[0]?.trim() || 'Degree',
        school: lines[1]?.trim() || '',
        details: lines.slice(2).join(' • ').trim()
      };
    });
  };

  const resumeData = parseResumeData(resumeHtml);

  // Ensure no section is completely empty by providing defaults
  const ensureContent = (data: any) => {
    return {
      ...data,
      experience: data.experience.length > 0 ? data.experience : [
        {
          title: 'Senior Professional Role',
          company: 'Technology Company',
          dates: '2020 - Present',
          location: 'City, State',
          responsibilities: [
            'Led cross-functional teams to deliver high-impact projects',
            'Implemented innovative solutions improving efficiency by 30%',
            'Collaborated with stakeholders to define strategic requirements',
            'Mentored team members and contributed to knowledge sharing'
          ]
        },
        {
          title: 'Professional Role',
          company: 'Previous Company',
          dates: '2018 - 2020',
          location: 'City, State',
          responsibilities: [
            'Developed and maintained complex applications',
            'Participated in code reviews and best practices',
            'Collaborated with design and product teams',
            'Achieved high customer satisfaction ratings'
          ]
        }
      ],
      education: data.education.length > 0 ? data.education : [
        {
          degree: 'Bachelor\'s/Master\'s Degree in Relevant Field',
          school: 'University Name',
          details: 'Relevant coursework • Academic achievements'
        }
      ],
      projects: data.projects.length > 0 ? data.projects : [
        {
          title: 'Key Professional Project',
          description: 'Comprehensive project showcasing technical skills and business impact.'
        }
      ]
    };
  };

  const finalResumeData = ensureContent(resumeData);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section - Cleaner formatting */}
        <View style={styles.header}>
          <Text style={styles.name}>{profile.fullName || 'Professional Name'}</Text>
          <Text style={styles.contactLine}>
            {profile.email || 'email@example.com'} • {profile.phone || '+1 (555) 123-4567'}
          </Text>
          <Text style={styles.contactLine}>
            {profile.location || 'City, State, ZIP'}
          </Text>
          {(profile.linkedin || profile.github || profile.portfolio) && (
            <Text style={styles.contactLine}>
              {profile.linkedin && `LinkedIn: ${profile.linkedin}`}
              {profile.linkedin && (profile.github || profile.portfolio) && ' • '}
              {profile.github && `GitHub: ${profile.github}`}
              {profile.github && profile.portfolio && ' • '}
              {profile.portfolio && `Portfolio: ${profile.portfolio}`}
            </Text>
          )}
        </View>

        {/* Professional Summary - Always present */}
        <View style={styles.professionalSummary}>
          <Text style={styles.sectionTitle}>Professional Summary</Text>
          {finalResumeData.professionalSummary ? (
            finalResumeData.professionalSummary.split(/\.\s+/).filter((sentence: string) => sentence.trim().length > 10).map((sentence: string, index: number) => (
              <Text key={index} style={styles.summaryText}>
                {sentence.trim()}{sentence.trim().endsWith('.') ? '' : '.'}
              </Text>
            ))
          ) : (
            <>
              <Text style={styles.summaryText}>
                Experienced professional with a proven track record of delivering exceptional results in dynamic environments.
                Demonstrated expertise in leveraging cutting-edge technologies and methodologies to drive business growth.
              </Text>
              <Text style={styles.summaryText}>
                Strong analytical and problem-solving skills with excellent communication and leadership capabilities.
                Proven ability to manage cross-functional teams and deliver high-quality solutions on time and within budget.
              </Text>
            </>
          )}
        </View>

        {/* Technical Skills - Always present */}
        <View style={styles.compactSection}>
          <Text style={styles.sectionTitle}>Technical Skills & Core Competencies</Text>
          <View style={styles.skillsGrid}>
            {{
              ...(finalResumeData.technicalSkills?.split(/[,•\n|]/) || []),
              ...(finalResumeData.coreCompetencies?.split(/[,•\n|]/) || []),
              // Default skills if none extracted
              ...(!finalResumeData.technicalSkills && !finalResumeData.coreCompetencies ? [
                'Project Management', 'Team Leadership', 'Strategic Planning', 'Problem Solving',
                'Communication', 'Analysis', 'Process Improvement', 'Stakeholder Management'
              ] : [])
            }
              .filter((skill: string) => skill.trim())
              .slice(0, 20)
              .map((skill: string, index: number) => (
                <Text key={index} style={styles.skillItem}>
                  {skill.trim()}
                </Text>
              ))}
          </View>
        </View>

        {/* Professional Experience - Enhanced to extract ALL experiences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Experience</Text>
          {finalResumeData.experience.map((exp: { title: string; company: string; location: string; dates: string; responsibilities: string[] }, index: number) => (
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

        {/* Education - Always present */}
        <View style={styles.compactSection}>
          <Text style={styles.sectionTitle}>Education</Text>
          {finalResumeData.education.map((edu: { degree: string; school: string; details: string }, index: number) => (
            <View key={index} style={styles.educationItem}>
              <Text style={styles.degreeInfo}>{edu.degree}</Text>
              {edu.school && <Text style={styles.schoolInfo}>{edu.school}</Text>}
              {edu.details && <Text style={styles.schoolInfo}>{edu.details}</Text>}
            </View>
          ))}
        </View>

        {/* Projects - Always present */}
        <View style={styles.compactSection}>
          <Text style={styles.sectionTitle}>Key Projects</Text>
          {finalResumeData.projects.slice(0, 3).map((project: { title: string; description: string }, index: number) => (
            <View key={index} style={styles.projectItem}>
              <Text style={styles.projectTitle}>{project.title}</Text>
              <Text style={styles.projectDesc}>{project.description}</Text>
            </View>
          ))}
        </View>

        {/* Optional sections - Only if content exists */}
        {finalResumeData.certifications && (
          <View style={styles.compactSection}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {finalResumeData.certifications.split(/[,\n|]/).filter((cert: string) => cert.trim()).slice(0, 5).map((cert: string, index: number) => (
              <Text key={index} style={styles.certificationItem}>
                • {cert.trim()}
              </Text>
            ))}
          </View>
        )}

        {finalResumeData.awards && (
          <View style={styles.compactSection}>
            <Text style={styles.sectionTitle}>Awards & Recognition</Text>
            {finalResumeData.awards.split(/[,\n|]/).filter((award: string) => award.trim()).slice(0, 4).map((award: string, index: number) => (
              <Text key={index} style={styles.certificationItem}>
                • {award.trim()}
              </Text>
            ))}
          </View>
        )}

        {finalResumeData.volunteer && (
          <View style={styles.compactSection}>
            <Text style={styles.sectionTitle}>Volunteer Experience</Text>
            {finalResumeData.volunteer.split(/\n/).filter((vol: string) => vol.trim()).slice(0, 3).map((vol: string, index: number) => (
              <Text key={index} style={styles.certificationItem}>
                • {vol.trim()}
              </Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={{ marginTop: 'auto', paddingTop: 6, borderTop: '0.5 solid #e5e7eb' }}>
          <Text style={styles.smallText}>
            AI-Enhanced Resume • ATS Optimized • Job-Specific Tailoring
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ResumeTemplate;
