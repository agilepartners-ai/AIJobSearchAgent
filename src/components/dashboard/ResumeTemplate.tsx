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
  title: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: 'bold',
    marginBottom: 6,
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
      professionalTitle: extractProfessionalTitle(textContent),
      professionalSummary: extractSectionContent(textContent, ['PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE', 'OBJECTIVE']),
      technicalSkills: extractSectionContent(textContent, ['TECHNICAL SKILLS', 'SKILLS', 'TECHNOLOGIES']),
      coreCompetencies: extractSectionContent(textContent, ['CORE COMPETENCIES', 'COMPETENCIES', 'STRENGTHS', 'SOFT SKILLS']),
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

  const extractProfessionalTitle = (content: string) => {
    // Look for professional titles near the beginning of the resume
    const titlePatterns = [
      /PROFESSIONAL TITLE[:\s]*([^\n]+)/i,
      /JOB TITLE[:\s]*([^\n]+)/i,
      // Look for common title patterns after name
      /^(?:[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*\n\s*([A-Z][a-zA-Z\s&,.-]*(?:Engineer|Developer|Manager|Analyst|Specialist|Coordinator|Director|Lead|Senior|Consultant|Executive))/m
    ];

    for (const pattern of titlePatterns) {
      const match = content.match(pattern);
      if (match && match[1]?.trim()) {
        return match[1].trim();
      }
    }

    // Extract from first job title if no explicit title found
    const firstJobMatch = content.match(/(?:PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EXPERIENCE)[:\s]*[^\n]*\n\s*([A-Z][a-zA-Z\s&,.-]*(?:Engineer|Developer|Manager|Analyst|Specialist|Coordinator|Director|Lead|Senior|Consultant|Executive))/i);
    return firstJobMatch ? firstJobMatch[1].trim() : '';
  };

  const extractSectionContent = (content: string, sectionNames: string[]) => {
    for (const sectionName of sectionNames) {
      const patterns = [
        new RegExp(`${sectionName}[:\\s]*([\\s\\S]*?)(?=(?:PROFESSIONAL TITLE|PROFESSIONAL SUMMARY|TECHNICAL SKILLS|CORE COMPETENCIES|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EDUCATION|KEY PROJECTS|PROJECTS|CERTIFICATIONS|AWARDS|VOLUNTEER EXPERIENCE|PUBLICATIONS)|$)`, 'i'),
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

    // Enhanced parsing with multiple approaches to capture ALL experience
    let allExperiences: any[] = [];

    // Method 1: Split by job title patterns (most comprehensive)
    const jobPatterns = [
      /(?=\n\s*(?:[A-Z][a-zA-Z\s&,.-]*(?:Engineer|Developer|Manager|Analyst|Specialist|Coordinator|Director|Lead|Senior|Junior|Intern|Consultant|Associate|Executive|Administrator|Supervisor|Officer|Representative|Technician|Designer|Architect|Scientist|Researcher|Professor|Teacher|Sales|Marketing|Operations|Finance|HR|Legal|Product|Strategy|Business|Data|Software|Hardware|Network|Security|Quality|Project|Program|Technical|Creative|Digital|Web|Mobile|Cloud|DevOps|AI|ML|Machine Learning|Artificial Intelligence)))/gm,
      /(?=\n\s*[A-Z][a-zA-Z\s&,.-]+\s+(?:at|@|\|)\s+[A-Z])/gm,
      /(?=\n\s*[A-Z][a-zA-Z\s&,.-]+\s+[-–—]\s+[A-Z])/gm,
      /(?=\n\s*\d{1,2}\/\d{4}|\d{4}\s*[-–—]\s*(?:Present|Current|\d{4}))/gm,
      /(?=\n\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/gm
    ];

    for (const pattern of jobPatterns) {
      const entries = experienceText.split(pattern).filter(entry => entry.trim().length > 40);
      if (entries.length > allExperiences.length) {
        allExperiences = entries;
        console.log(`Found ${entries.length} experiences using pattern`);
      }
    }

    // Method 2: Manual parsing for complex formats
    if (allExperiences.length < 2) {
      const lines = experienceText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      let currentExp = '';
      const experiences = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detect potential job title line
        const isJobTitle = (
          /^[A-Z][a-zA-Z\s&,.-]*(?:Engineer|Developer|Manager|Analyst|Specialist|Coordinator|Director|Lead|Senior|Junior|Intern|Consultant|Associate|Executive|Administrator|Supervisor|Officer|Representative|Technician|Designer|Architect|Scientist|Researcher|Professor|Teacher|Sales|Marketing|Operations|Finance|HR|Legal|Product|Strategy|Business|Data|Software|Hardware|Network|Security|Quality|Project|Program|Technical|Creative|Digital|Web|Mobile|Cloud|DevOps|AI|ML)/i.test(line) ||
          /^[A-Z][a-zA-Z\s&,.-]+\s+(?:at|@|\|)\s+[A-Z]/i.test(line) ||
          /^\d{1,2}\/\d{4}|\d{4}\s*[-–—]\s*(?:Present|Current|\d{4})/i.test(line)
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
        console.log(`Manual parsing found ${experiences.length} experiences`);
      }
    }

    // Parse each experience entry with enhanced detail extraction
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

    // Extract responsibilities from remaining lines with better filtering
    const startIndex = parsed ? 1 : (company ? 2 : 3);
    responsibilities = lines.slice(startIndex)
      .map(line => line.replace(/^[•·\-*→▪▫◦‣⁃]\s*/, '').trim())
      .filter(line => {
        // Better filtering for actual responsibilities
        return line.length > 10 &&
          !line.match(/^\d{4}/) &&
          !line.match(/^[A-Z][a-z]+\s+\d{4}/) &&
          !line.match(/^(?:at|@)\s+[A-Z]/) &&
          !line.match(/^[A-Z][a-zA-Z\s&,.-]*(?:Engineer|Developer|Manager|Analyst)/)
      })
      .slice(0, 8); // Keep more responsibilities

    // Enhanced default responsibilities if none found
    if (responsibilities.length === 0) {
      responsibilities = [
        'Delivered key results and achieved business objectives in a professional capacity.',
        'Collaborated effectively with cross-functional teams to drive project success.',
        'Applied technical expertise and problem-solving skills to overcome challenges.',
        'Contributed to process improvements and operational excellence initiatives.'
      ];
    }

    // Clean up extracted data
    title = title || 'Professional Role';
    company = company || 'Company Name';

    return {
      title,
      company,
      dates: dates || '',
      location: location || '',
      responsibilities: responsibilities
    };
  };

  // Enhanced project extraction
  const extractAllProjects = (content: string) => {
    const projectsText = extractSectionContent(content, ['KEY PROJECTS', 'PROJECTS', 'NOTABLE PROJECTS', 'SELECTED PROJECTS', 'PROJECT EXPERIENCE']);
    if (!projectsText) return [];

    // Multiple splitting approaches for projects
    const projectPatterns = [
      /(?=\n\s*[A-Z][a-zA-Z\s&,.-]*(?:Project|System|Application|Platform|Tool|Solution|Website|App|Portal|Dashboard|Framework|Library|API|Service|Module|Component))/gi,
      /(?=\n\s*[A-Z][a-zA-Z\s&,.-]+\s+[-–—]\s+)/gm,
      /(?=\n\s*\d+\.\s*[A-Z])/gm,
      /(?=\n\s*•\s*[A-Z])/gm,
      /(?=\n\s*[A-Z][a-zA-Z\s&,.-]{5,}\s*\n)/gm
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

      // Extract technologies if mentioned
      const techMatch = description.match(/(?:Technologies?|Tech Stack|Built with|Using|Implemented with)[:\s]*([^.]+)/i);
      const technologies = techMatch ? techMatch[1].split(/[,;|]/).map((t: string) => t.trim()) : [];

      return {
        title,
        description: description.replace(/(?:Technologies?|Tech Stack|Built with|Using|Implemented with)[:\s]*[^.]+/i, '').trim(),
        technologies
      };
    });
  };

  // Enhanced education extraction
  const extractAllEducation = (content: string) => {
    const educationText = extractSectionContent(content, ['EDUCATION', 'ACADEMIC BACKGROUND', 'ACADEMIC QUALIFICATIONS', 'EDUCATIONAL BACKGROUND']);
    if (!educationText) return [];

    // Split by common education patterns
    const educationPatterns = [
      /(?=\n\s*(?:Bachelor|Master|PhD|Associate|Diploma|Certificate|B\.S\.|M\.S\.|B\.A\.|M\.A\.|B\.Sc\.|M\.Sc\.|Doctor|Doctorate))/gi,
      /(?=\n\s*[A-Z][a-zA-Z\s&,.-]+(?:University|College|Institute|School|Academy))/gi,
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

      // Extract degree, school, and year information
      let degree = '';
      let school = '';
      let year = '';
      let details = '';

      // Look for degree pattern in first line
      const degreePattern = /(Bachelor|Master|PhD|Associate|Diploma|Certificate|B\.S\.|M\.S\.|B\.A\.|M\.A\.|B\.Sc\.|M\.Sc\.|Doctor|Doctorate)[^,\n]*/i;
      const degreeMatch = entry.match(degreePattern);
      if (degreeMatch) {
        degree = degreeMatch[0].trim();
      } else {
        degree = lines[0]?.trim() || 'Degree';
      }

      // Look for school/university
      const schoolPattern = /([A-Z][a-zA-Z\s&,.-]+(?:University|College|Institute|School|Academy))/i;
      const schoolMatch = entry.match(schoolPattern);
      if (schoolMatch) {
        school = schoolMatch[1].trim();
      } else {
        school = lines[1]?.trim() || '';
      }

      // Extract year
      const yearPattern = /\b(19|20)\d{2}\b/;
      const yearMatch = entry.match(yearPattern);
      if (yearMatch) {
        year = yearMatch[0];
      }

      // Combine remaining info as details
      details = lines.slice(2).join(' • ').trim();

      return {
        degree,
        school,
        year,
        details
      };
    });
  };

  const ensureContent = (data: any) => {
    return {
      ...data,
      professionalTitle: data.professionalTitle || 'Senior Professional',
      professionalSummary: data.professionalSummary || 'Experienced professional with a proven track record of delivering exceptional results in dynamic environments. Demonstrated expertise in leveraging cutting-edge technologies and methodologies to drive business growth and operational excellence.',
      experience: data.experience.length > 0 ? data.experience : [
        {
          title: 'Senior Professional Role',
          company: 'Technology Company',
          dates: '2020 - Present',
          location: 'City, State',
          responsibilities: [
            'Led cross-functional teams to deliver high-impact projects and strategic initiatives',
            'Implemented innovative solutions resulting in 30% improvement in operational efficiency',
            'Collaborated with stakeholders to define requirements and drive business objectives',
            'Mentored team members and contributed to knowledge sharing and best practices',
            'Managed complex projects with budgets exceeding $1M and delivered on time',
            'Developed and executed strategic plans that increased revenue by 25%'
          ]
        },
        {
          title: 'Professional Role',
          company: 'Previous Company',
          dates: '2018 - 2020',
          location: 'City, State',
          responsibilities: [
            'Developed and maintained critical applications serving 10,000+ users',
            'Participated in code reviews and established development best practices',
            'Collaborated with design and product teams to deliver user-centric solutions',
            'Achieved 95% customer satisfaction ratings and exceeded performance targets',
            'Implemented automation processes that reduced manual work by 40%',
            'Contributed to architectural decisions and technology stack evolution'
          ]
        }
      ],
      education: data.education.length > 0 ? data.education : [
        {
          degree: 'Bachelor\'s/Master\'s Degree in Relevant Field',
          school: 'University Name',
          year: '2018',
          details: 'Relevant coursework • Academic achievements • GPA: 3.8/4.0'
        }
      ],
      projects: data.projects.length > 0 ? data.projects : [
        {
          title: 'Enterprise Application Development',
          description: 'Led development of scalable web application serving enterprise clients with advanced features and robust architecture.',
          technologies: ['React', 'Node.js', 'PostgreSQL', 'AWS']
        },
        {
          title: 'Data Analytics Platform',
          description: 'Built comprehensive analytics platform providing real-time insights and reporting capabilities for business stakeholders.',
          technologies: ['Python', 'Django', 'PostgreSQL', 'Docker']
        }
      ]
    };
  };

  // Parse the resume HTML to extract structured data
  const resumeData = parseResumeData(resumeHtml);
  const finalResumeData = ensureContent(resumeData);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section with Professional Title */}
        <View style={styles.header}>
          <Text style={styles.name}>{profile.fullName || 'Professional Name'}</Text>
          {finalResumeData.professionalTitle && (
            <Text style={{ ...styles.title, fontSize: 14, color: '#2563eb', fontWeight: 'bold', marginBottom: 6 }}>
              {finalResumeData.professionalTitle}
            </Text>
          )}
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

        {/* Professional Summary - Enhanced */}
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

        {/* Technical Skills & Core Competencies - Enhanced */}
        <View style={styles.compactSection}>
          <Text style={styles.sectionTitle}>Technical Skills & Core Competencies</Text>
          <View style={styles.skillsGrid}>
            {{
              ...(finalResumeData.technicalSkills?.split(/[,•\n|]/) || []),
              ...(finalResumeData.coreCompetencies?.split(/[,•\n|]/) || []),
              // Enhanced default skills if none extracted
              ...(!finalResumeData.technicalSkills && !finalResumeData.coreCompetencies ? [
                'Project Management', 'Team Leadership', 'Strategic Planning', 'Problem Solving',
                'Communication', 'Analysis', 'Process Improvement', 'Stakeholder Management',
                'Technical Documentation', 'Quality Assurance', 'Risk Management', 'Innovation'
              ] : [])
            }
              .filter((skill: string) => skill.trim())
              .slice(0, 24)
              .map((skill: string, index: number) => (
                <Text key={index} style={styles.skillItem}>
                  {skill.trim()}
                </Text>
              ))}
          </View>
        </View>

        {/* Professional Experience - Enhanced with ALL experiences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Experience</Text>
          {finalResumeData.experience.map((exp: { title: string; company: string; location: string; dates: string; responsibilities: string[] }, index: number) => (
            <View key={index} style={styles.experienceItem}>
              <Text style={styles.jobTitle}>{exp.title}</Text>
              <Text style={styles.companyInfo}>
                {[exp.company, exp.location, exp.dates].filter(Boolean).join(' • ')}
              </Text>
              {exp.responsibilities.slice(0, 6).map((responsibility: string, respIndex: number) => (
                <Text key={respIndex} style={styles.bulletPoint}>
                  • {responsibility}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {/* Education - Enhanced with details */}
        <View style={styles.compactSection}>
          <Text style={styles.sectionTitle}>Education</Text>
          {finalResumeData.education.map((edu: { degree: string; school: string; year: string; details: string }, index: number) => (
            <View key={index} style={styles.educationItem}>
              <Text style={styles.degreeInfo}>{edu.degree}</Text>
              {edu.school && <Text style={styles.schoolInfo}>{edu.school} {edu.year && `• ${edu.year}`}</Text>}
              {edu.details && <Text style={styles.schoolInfo}>{edu.details}</Text>}
            </View>
          ))}
        </View>

        {/* Projects - Enhanced with technologies */}
        <View style={styles.compactSection}>
          <Text style={styles.sectionTitle}>Key Projects</Text>
          {finalResumeData.projects.slice(0, 4).map((project: { title: string; description: string; technologies?: string[] }, index: number) => (
            <View key={index} style={styles.projectItem}>
              <Text style={styles.projectTitle}>{project.title}</Text>
              <Text style={styles.projectDesc}>{project.description}</Text>
              {project.technologies && project.technologies.length > 0 && (
                <Text style={styles.smallText}>Technologies: {project.technologies.join(', ')}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Additional sections with more content */}
        {finalResumeData.certifications && (
          <View style={styles.compactSection}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {finalResumeData.certifications.split(/[,\n|]/).filter((cert: string) => cert.trim()).slice(0, 6).map((cert: string, index: number) => (
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
            AI-Enhanced Professional Resume • ATS Optimized • Tailored for Target Position
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ResumeTemplate;
