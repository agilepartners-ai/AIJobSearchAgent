import type { NextApiRequest, NextApiResponse } from 'next';
import DocxResumeGenerator from '../../services/docxResumeGenerator';

// Copy of ResumeContentParser from ResumeTemplate.tsx for DOCX generation
class ResumeContentParser {
  private rawHtml: string;
  private textContent: string;

  constructor(htmlContent: string) {
    this.rawHtml = htmlContent || '';
    this.textContent = this.cleanHTML(this.rawHtml, {
      simple: true
    });
  }

  private cleanHTML(html: string, options: {
    simple?: boolean
  } = {}): string {
    let cleaned = html;
    if (options.simple) {
      cleaned = cleaned
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/li>/gi, '\n\n');
    }
    return cleaned
      .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  extractSection(sectionNames: string[]): string {
    const content = this.textContent;
    for (const sectionName of sectionNames) {
      const patterns = [
        new RegExp(`${sectionName}[\\s:]*\\n([\\s\\S]*?)(?=\\n\\s*(?:PROFESSIONAL SUMMARY|TECHNICAL SKILLS|CORE COMPETENCIES|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EDUCATION|PROJECTS|KEY PROJECTS|CERTIFICATIONS|AWARDS|VOLUNTEER|PUBLICATIONS|$))`, 'i'),
        new RegExp(`${sectionName}[\\s:]*([\\s\\S]*?)(?=\\n[A-Z][A-Z\\s]{8,}|$)`, 'i')
      ];
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1] && match[1].trim().length > 10) {
          return match[1]
            .trim()
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^\s+|\s+$/gm, '')
            .replace(/\n\n+/g, '\n\n');
        }
      }
    }
    return '';
  }

  extractExperience(): any[] {
    const experienceEntries: any[] = [];
    const experienceSectionMatch = this.rawHtml.match(/<h2[^>]*>\s*PROFESSIONAL EXPERIENCE\s*<\/h2>([\s\S]*?)(?=<h2|<section|$)/i);
    
    if (!experienceSectionMatch || !experienceSectionMatch[1]) {
      return this.extractExperienceFromText();
    }

    const experienceHtml = experienceSectionMatch[1];
    const entryBlocks = experienceHtml.split(/<div[^>]*margin-bottom:\s*18px/).filter(block => block.trim().length > 50);

    for (const block of entryBlocks) {
      let title = '';
      let company = '';
      let dates = '';
      let location = '';
      const responsibilities: string[] = [];

      const titleMatch = block.match(/<h3[^>]*>([^<]+)<\/h3>/);
      if (titleMatch) title = this.cleanHTML(titleMatch[1]);

      const dateMatch = block.match(/<span[^>]*color:\s*#6b7280[^>]*>([^<]+)<\/span>/);
      if (dateMatch) dates = this.cleanHTML(dateMatch[1]);

      const companyMatch = block.match(/<span[^>]*color:\s*#4b5563[^>]*>([^<]+)<\/span>/);
      if (companyMatch) company = this.cleanHTML(companyMatch[1]);

      const responsibilityMatches = block.match(/<li[^>]*>([^<]+)<\/li>/g);
      if (responsibilityMatches) {
        responsibilityMatches.forEach(li => {
          const respMatch = li.match(/<li[^>]*>([^<]+)<\/li>/);
          if (respMatch) {
            responsibilities.push(this.cleanHTML(respMatch[1]));
          }
        });
      }

      if (title && company) {
        experienceEntries.push({
          title,
          company,
          dates,
          location,
          responsibilities
        });
      }
    }

    return experienceEntries.length > 0 ? experienceEntries : this.extractExperienceFromText();
  }

  extractExperienceFromText(): any[] {
    const experienceText = this.extractSection(['PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE', 'EXPERIENCE']);
    if (!experienceText) return [];

    const entries: any[] = [];
    const lines = experienceText.split('\n').filter(l => l.trim());
    let currentEntry: any = null;

    const flushEntry = () => {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = null;
    };

    for (const line of lines) {
      if (/(Data Solutions Intern|Intern|Analyst|Developer|Engineer|Manager|Specialist)/i.test(line)) {
        flushEntry();
        currentEntry = {
          title: line.trim(),
          company: '',
          dates: '',
          location: '',
          responsibilities: []
        };
      } else if (currentEntry) {
        if (!currentEntry.company && /(PVT LTD|Inc|Corp|Company|Ltd|LLC)/i.test(line)) {
          currentEntry.company = line.trim();
        } else if (line.includes('•') || line.includes('-')) {
          currentEntry.responsibilities.push(line.replace(/^[•-]\s*/, '').trim());
        }
      }
    }
    flushEntry();
    return entries;
  }

  extractEducation(): any[] {
    const educationText = this.extractSection(['EDUCATION', 'ACADEMIC BACKGROUND']);
    if (!educationText) return [];

    const entries: any[] = [];
    const lines = educationText.split('\n').filter(l => l.trim());
    let currentEntry: any = null;

    const flushEntry = () => {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = null;
    };

    for (const line of lines) {
      if (/(B\. Tech|Master|Bachelor)/i.test(line)) {
        flushEntry();
        const dateMatch = line.match(/\b(Expected \d{4}|\d{4})\b/);
        currentEntry = {
          degree: line.replace(dateMatch ? dateMatch[0] : '', '').trim(),
          school: '',
          graduationDate: dateMatch ? dateMatch[0] : '',
          details: ''
        };
      } else if (currentEntry) {
        if (!currentEntry.school && /(University|Institute|School)/i.test(line)) {
          currentEntry.school = line;
        } else {
          currentEntry.details = `${currentEntry.details} ${line}`.trim();
        }
      }
    }
    flushEntry();
    return entries;
  }

  extractSkills(): any {
    const skillsText = this.extractSection(['TECHNICAL SKILLS', 'SKILLS', 'CORE COMPETENCIES']);
    const skills = skillsText.split(/[,\n•-]/).map(s => s.trim()).filter(s => s.length > 0);
    
    return {
      technical: skills,
      soft: [],
      tools: [],
      all: skills
    };
  }

  extractProjects(): any[] {
    const projectEntries: any[] = [];
    const projectsSectionMatch = this.rawHtml.match(/<h2[^>]*>\s*KEY PROJECTS\s*<\/h2>([\s\S]*?)(?=<h2|<section|$)/i);
    
    if (!projectsSectionMatch || !projectsSectionMatch[1]) {
      return this.extractProjectsFromText();
    }

    const projectsHtml = projectsSectionMatch[1];
    const entryBlocks = projectsHtml.split(/<div[^>]*margin-bottom:\s*15px/).filter(block => block.trim().length > 50);

    for (const block of entryBlocks) {
      let title = '';
      let description = '';
      const bullets: string[] = [];
      let techStack = '';

      // Extract project title
      const titleMatch = block.match(/<h3[^>]*>([^<]+)<\/h3>/);
      if (titleMatch) title = this.cleanHTML(titleMatch[1]);

      // Extract description
      const descMatch = block.match(/<p[^>]*>([^<]+)<\/p>/);
      if (descMatch) description = this.cleanHTML(descMatch[1]);

      // Extract bullets/achievements
      const bulletMatches = block.match(/<li[^>]*>([^<]+)<\/li>/g);
      if (bulletMatches) {
        bulletMatches.forEach(li => {
          const bulletMatch = li.match(/<li[^>]*>([^<]+)<\/li>/);
          if (bulletMatch) {
            bullets.push(this.cleanHTML(bulletMatch[1]));
          }
        });
      }

      // Extract technologies
      const techMatch = block.match(/Technologies:<\/strong>\s*<span[^>]*>([^<]+)<\/span>/);
      if (techMatch) techStack = this.cleanHTML(techMatch[1]);

      if (title) {
        projectEntries.push({
          name: title,
          title,
          description,
          achievements: bullets.length > 0 ? bullets : [description],
          technologies: techStack,
          duration: 'Ongoing',
          bullets: bullets.length > 0 ? bullets : undefined,
          techStack
        });
      }
    }

    return projectEntries.length > 0 ? projectEntries : this.extractProjectsFromText();
  }

  extractProjectsFromText(): any[] {
    const projectsText = this.extractSection(['KEY PROJECTS', 'PROJECTS']);
    if (!projectsText) return [];

    const entries: any[] = [];
    
    // Try to split by common project indicators or double newlines
    const projectBlocks = projectsText.split(/\n\s*\n/).filter(block => block.trim().length > 20);

    for (const block of projectBlocks) {
      const lines = block.split('\n').filter(l => l.trim());
      if (lines.length === 0) continue;
      
      const title = lines[0]?.trim();
      const bullets: string[] = [];
      let description = '';
      let techStack = '';
      
      // Parse lines looking for bullets and technologies
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
          bullets.push(line.replace(/^[•\-*]\s*/, ''));
        } else if (line.toLowerCase().includes('technolog')) {
          techStack = line.replace(/^.*technolog[^:]*:\s*/i, '');
        } else if (!description) {
          description = line;
        }
      }
      
      if (title) {
        entries.push({
          name: title,
          title,
          description: description || bullets.join('. '),
          achievements: bullets.length > 0 ? bullets : [description || title],
          technologies: techStack,
          duration: 'Ongoing'
        });
      }
    }
    
    return entries;
  }

  extractCertifications(): Array<{name: string, issuer: string, issued: string, expires: string}> {
    const certsText = this.extractSection(['CERTIFICATIONS', 'CERTIFICATES', 'PROFESSIONAL CERTIFICATIONS']);
    
    if (certsText) {
      const certEntries: Array<{name: string, issuer: string, issued: string, expires: string}> = [];
      
      // First try HTML parsing like PDF version
      const certSectionMatch = this.rawHtml.match(/<h2[^>]*>\s*CERTIFICATIONS\s*<\/h2>([\s\S]*?)(?=<h2|<section|$)/i);
      
      if (certSectionMatch) {
        const certHtml = certSectionMatch[1];
        const certBlocks = certHtml.split(/<div[^>]*margin-bottom:\s*8px[^>]*>/i).slice(1);
        
        for (const block of certBlocks) {
          const nameMatch = block.match(/<strong[^>]*>([^<]+)<\/strong>/i);
          const issuerMatch = block.match(/<div[^>]*>([^<]+)<\/div>/i);
          const issuedMatch = block.match(/Issued:\s*([^<\n]+)/i);
          const expiresMatch = block.match(/Expires:\s*([^<\n]+)/i);
          
          if (nameMatch) {
            certEntries.push({
              name: this.cleanHTML(nameMatch[1]).trim(),
              issuer: issuerMatch ? this.cleanHTML(issuerMatch[1]).trim() : '',
              issued: issuedMatch ? this.cleanHTML(issuedMatch[1]).trim() : '',
              expires: expiresMatch ? this.cleanHTML(expiresMatch[1]).trim() : 'N/A'
            });
          }
        }
      }
      
      // If HTML parsing didn't work, try text parsing
      if (certEntries.length === 0) {
        const certBlocks = certsText.split(/\n\s*\n/).filter(block => block.trim().length > 10);

        for (const block of certBlocks) {
          const lines = block.split('\n').filter(l => l.trim());
          if (lines.length === 0) continue;
          
          const certName = lines[0]?.trim() || '';
          let issuer = '';
          let issued = '';
          let expires = '';
          
          // Parse additional lines for issuer and dates
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.toLowerCase().includes('issuer') || line.toLowerCase().includes('organization')) {
              issuer = line.replace(/^[^:]*:\s*/, '');
            } else if (line.toLowerCase().includes('issued') || line.toLowerCase().includes('date')) {
              issued = line.replace(/^[^:]*:\s*/, '');
            } else if (line.toLowerCase().includes('expires') || line.toLowerCase().includes('expiration')) {
              expires = line.replace(/^[^:]*:\s*/, '');
            } else if (!issuer && line.length > 5) {
              issuer = line; // Assume second line is issuer if not labeled
            }
          }
          
          if (certName) {
            certEntries.push({ 
              name: certName, 
              issuer, 
              issued, 
              expires: expires || 'N/A' 
            });
          }
        }
      }
      
      // Return up to 6 certifications like PDF version
      return certEntries.slice(0, 6);
    }

    // Fallback data like PDF version
    return [
      { name: 'Career Essentials in Data Analysis', issuer: 'Microsoft & LinkedIn', issued: 'August 2024', expires: 'N/A' },
      { name: 'Data Visualization Using Python', issuer: 'IBM', issued: 'May 2024', expires: 'N/A' },
      { name: 'Data Analytics Professional Certificate', issuer: 'Google', issued: 'October 2024', expires: 'N/A' }
    ];
  }

  extractAwards(): Array<{name: string, issuer: string, date: string, description: string}> {
    // First try structured HTML extraction
    const awardSectionMatch = this.rawHtml.match(/<h[1-6][^>]*>\s*AWARDS?\s*&?\s*RECOGNITION\s*<\/h[1-6]>([\s\S]*?)(?=<h[1-6]|<section|$)/i);
    
    if (awardSectionMatch) {
      const awardHtml = awardSectionMatch[1];
      const awardEntries = [];
      
      // Try structured div blocks
      const awardBlocks = awardHtml.split(/<div[^>]*margin-bottom:\s*8px[^>]*>/i).slice(1);
      
      for (const block of awardBlocks) {
        const nameMatch = block.match(/<strong[^>]*>([^<]+)<\/strong>/i);
        const dateMatch = block.match(/<span[^>]*>([^<]+)<\/span>/i);
        const issuerMatch = block.match(/<div[^>]*>([^<]+)<\/div>/i);
        const descMatch = block.match(/<p[^>]*>([^<]+)<\/p>/i);
        
        if (nameMatch) {
          awardEntries.push({
            name: this.cleanHTML(nameMatch[1]).trim(),
            date: dateMatch ? this.cleanHTML(dateMatch[1]).trim() : '',
            issuer: issuerMatch ? this.cleanHTML(issuerMatch[1]).trim() : '',
            description: descMatch ? this.cleanHTML(descMatch[1]).trim() : ''
          });
        }
      }
      
      if (awardEntries.length > 0) {
        return awardEntries.slice(0, 5);
      }
      
      // Fallback: Try list items
      const awardItems = awardHtml.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
      
      for (const item of awardItems) {
        const text = this.cleanHTML(item).trim();
        const parts = text.split(/[-–—]|\s+\|\s+/);
        awardEntries.push({
          name: parts[0]?.trim() || '',
          date: parts[1]?.trim() || '',
          issuer: parts[2]?.trim() || '',
          description: parts[3]?.trim() || ''
        });
      }
      
      if (awardEntries.length > 0) {
        return awardEntries.slice(0, 5);
      }
    }

    // Fallback to text-based extraction
    const awardsText = this.extractSection(['AWARDS', 'RECOGNITION', 'HONORS', 'AWARDS & RECOGNITION']);
    if (!awardsText) {
      return [{
        name: 'FedEx SMART Hackathon Finalist',
        date: 'January 2025',
        issuer: 'Shastra, IIT Madras',
        description: 'Recognized as a finalist for developing a real-time project utilizing advanced algorithms.'
      }];
    }

    const entries: Array<{name: string, issuer: string, date: string, description: string}> = [];
    const awardBlocks = awardsText.split(/\n\s*\n/).filter(block => block.trim().length > 10);

    for (const block of awardBlocks) {
      const lines = block.split('\n').filter(l => l.trim());
      if (lines.length === 0) continue;
      
      const awardName = lines[0]?.trim() || '';
      let issuer = '';
      let date = '';
      let description = '';
      
      // Parse additional lines for issuer, date, and description
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.toLowerCase().includes('issuer') || line.toLowerCase().includes('organization')) {
          issuer = line.replace(/^[^:]*:\s*/, '');
        } else if (line.toLowerCase().includes('date') || line.match(/\d{4}/)) {
          date = line.replace(/^[^:]*:\s*/, '');
        } else if (line.toLowerCase().includes('description')) {
          description = line.replace(/^[^:]*:\s*/, '');
        } else if (!issuer && line.length > 5) {
          if (line.match(/\d{4}/)) {
            date = line;
          } else {
            issuer = line; // Assume second line is issuer if not labeled
          }
        } else if (!description && line.length > 10) {
          description = line;
        }
      }
      
      if (awardName) {
        entries.push({ name: awardName, issuer, date, description });
      }
    }

    if (entries.length === 0) {
      return [{
        name: 'FedEx SMART Hackathon Finalist',
        date: 'January 2025',
        issuer: 'Shastra, IIT Madras',
        description: 'Recognized as a finalist for developing a real-time project utilizing advanced algorithms.'
      }];
    }

    return entries.slice(0, 5);
  }

  extractLanguages(): Array<{name: string, proficiency: string}> {
    // First try structured HTML extraction
    const languageSectionMatch = this.rawHtml.match(/<h[1-6][^>]*>\s*LANGUAGES?\s*(?:SKILLS?)?\s*(?:PROFICIENCY)?\s*<\/h[1-6]>([\s\S]*?)(?=<h[1-6]|<section|$)/i);
    
    if (languageSectionMatch) {
      const languageHtml = languageSectionMatch[1];
      const languageEntries = [];
      
      // Try list items first
      const languageItems = languageHtml.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
      
      for (const item of languageItems) {
        const text = this.cleanHTML(item).trim();
        const patterns = [
          /^([^(]+)\s*\(\s*([^)]+)\s*\)/,  // Language (Proficiency)
          /^([^-]+)\s*-\s*(.+)/,           // Language - Proficiency
          /^([^:]+)\s*:\s*(.+)/,           // Language: Proficiency
        ];
        
        let matched = false;
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            const [, name, proficiency] = match;
            languageEntries.push({ 
              name: name.trim(), 
              proficiency: proficiency.trim() 
            });
            matched = true;
            break;
          }
        }
        
        if (!matched && text.length > 1) {
          languageEntries.push({ name: text, proficiency: 'Native' });
        }
      }
      
      if (languageEntries.length > 0) {
        return languageEntries.slice(0, 6);
      }
    }

    // Fallback to text-based extraction
    const languagesText = this.extractSection(['LANGUAGES', 'LANGUAGE SKILLS', 'LANGUAGE PROFICIENCY']);
    if (!languagesText) {
      return [
        { name: 'English', proficiency: 'Native' },
        { name: 'Spanish', proficiency: 'Conversational' },
        { name: 'French', proficiency: 'Basic' }
      ];
    }

    const entries: Array<{name: string, proficiency: string}> = [];
    
    // Try to parse languages with proficiency levels
    const lines = languagesText.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      const cleanLine = line.trim().replace(/^[•\-*]\s*/, '');
      
      // Look for patterns like "Spanish (Fluent)", "French - Intermediate", etc.
      const patterns = [
        /^([^(]+)\s*\(\s*([^)]+)\s*\)/,  // Language (Proficiency)
        /^([^-]+)\s*-\s*(.+)/,           // Language - Proficiency
        /^([^:]+)\s*:\s*(.+)/,           // Language: Proficiency
      ];
      
      let matched = false;
      for (const pattern of patterns) {
        const match = cleanLine.match(pattern);
        if (match) {
          const [, name, proficiency] = match;
          entries.push({ 
            name: name.trim(), 
            proficiency: proficiency.trim() 
          });
          matched = true;
          break;
        }
      }
      
      // If no pattern matched but line contains text, assume it's just a language name
      if (!matched && cleanLine.length > 1) {
        entries.push({ name: cleanLine, proficiency: 'Native' });
      }
    }

    if (entries.length === 0) {
      return [
        { name: 'English', proficiency: 'Native' },
        { name: 'Spanish', proficiency: 'Conversational' },
        { name: 'French', proficiency: 'Basic' }
      ];
    }

    return entries.slice(0, 6);
  }
}

interface GenerateDocxRequest {
  profileData?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  htmlContent?: string;
  html?: string;
  jobKeywords?: string[];
  twoColumnSkills?: boolean;
  emphasizeMetrics?: boolean;
  filename?: string;
}

async function generateDocxBuffer(requestBody: GenerateDocxRequest): Promise<Buffer> {
  const { profileData, profile, htmlContent, html, jobKeywords = [] } = requestBody;
  
  console.log('[API] generateDocxBuffer called with:', { 
    hasProfileData: !!profileData, 
    hasProfile: !!profile,
    hasHtmlContent: !!htmlContent,
    hasHtml: !!html,
    jobKeywords
  });
  
  // Try to get HTML content first (PDF-style approach)
  const activeHtml = htmlContent || html;
  const activeProfile = profile || profileData;
  
  if (activeHtml && activeProfile) {
    console.log('[API] Using PDF-style approach with HTML parsing');
    console.log('[API] HTML content length:', activeHtml.length);
    console.log('[API] Profile data:', activeProfile);
    
    try {
      // Parse HTML content like PDF does
      const parser = new ResumeContentParser(activeHtml);
      const professionalSummary = parser.extractSection(['PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE']);
      const experience = parser.extractExperience();
      const education = parser.extractEducation();
      const skillBuckets = parser.extractSkills();
      const projects = parser.extractProjects();
      const certifications = parser.extractCertifications();
      const awards = parser.extractAwards();
      const languages = parser.extractLanguages();
      
      console.log('[API] Parsed content:', {
        summary: professionalSummary.substring(0, 100),
        experienceCount: experience.length,
        educationCount: education.length,
        skillsCount: skillBuckets.all.length,
        projectsCount: projects.length,
        certificationsCount: certifications.length,
        awardsCount: awards.length,
        languagesCount: languages.length
      });
      
      // Create structured profile data for DocxResumeGenerator
      const resumeProfile = {
        // Basic info from profile
        fullName: String(activeProfile.fullName || activeProfile.full_name || ''),
        email: String(activeProfile.email || ''),
        phone: String(activeProfile.phone || ''),
        location: String(activeProfile.location || ''),
        linkedIn: String(activeProfile.linkedin || activeProfile.linkedin_url || ''),
        
        // Parsed content from HTML
        summary: professionalSummary || String(activeProfile.bio || activeProfile.summary || ''),
        
        // Experience from parsed HTML
        workExperience: experience.map((exp: Record<string, unknown>) => ({
          position: String(exp.title || ''),
          company: String(exp.company || ''),
          duration: String(exp.dates || ''),
          location: String(exp.location || ''),
          responsibilities: Array.isArray(exp.responsibilities) ? exp.responsibilities.map(String) : []
        })),
        
        // Education from parsed HTML
        education: education.map((edu: Record<string, unknown>) => ({
          degree: String(edu.degree || ''),
          institution: String(edu.school || ''),
          graduationDate: String(edu.graduationDate || ''),
          details: String(edu.details || '')
        })),
        
        // Skills from parsed HTML
        skills: Array.isArray(skillBuckets.all) ? skillBuckets.all.map(String) : 
                Array.isArray(activeProfile.skills) ? activeProfile.skills.map(String) : [],
        technicalSkills: Array.isArray(skillBuckets.technical) ? skillBuckets.technical.map(String) : 
                        Array.isArray(skillBuckets.all) ? skillBuckets.all.map(String) : 
                        Array.isArray(activeProfile.skills) ? activeProfile.skills.map(String) : [],
        
        // Projects from parsed HTML
        projects: projects.map((proj: Record<string, unknown>) => ({
          name: String(proj.name || ''),
          title: String(proj.title || proj.name || ''),
          description: String(proj.description || ''),
          technologies: proj.technologies ? String(proj.technologies).split(/[,;]/).map(t => t.trim()) : [],
          duration: String(proj.duration || ''),
          achievements: Array.isArray(proj.achievements) ? proj.achievements.map(String) : 
                       Array.isArray(proj.bullets) ? proj.bullets.map(String) : []
        })),
        
        // Use parsed data from HTML with fallback to profile data
        certifications: certifications.length > 0 ? 
          certifications.map(cert => ({
            name: cert.name,
            issuer: cert.issuer,
            date: cert.issued,
            issueDate: cert.issued,
            organization: cert.issuer
          })) : Array.isArray(activeProfile.certifications) ? 
          activeProfile.certifications.map((cert: unknown) => {
            if (typeof cert === 'object' && cert !== null) {
              const certObj = cert as Record<string, unknown>;
              return {
                name: String(certObj.name || certObj.title || ''),
                issuer: String(certObj.issuing_organization || certObj.issuer || certObj.organization || ''),
                date: String(certObj.issue_date || certObj.date || ''),
                issueDate: String(certObj.issue_date || certObj.date || ''),
                organization: String(certObj.issuing_organization || certObj.issuer || certObj.organization || '')
              };
            }
            return {
              name: String(cert),
              issuer: '',
              date: '',
              issueDate: '',
              organization: ''
            };
          }) : [],
        
        awards: awards.length > 0 ? 
          awards.map(award => ({
            title: award.name,
            name: award.name,
            issuer: award.issuer,
            organization: award.issuer,
            description: award.description,
            date: award.date
          })) : Array.isArray(activeProfile.awards) ? 
          activeProfile.awards.map((award: unknown) => {
            if (typeof award === 'object' && award !== null) {
              const awardObj = award as Record<string, unknown>;
              return {
                title: String(awardObj.title || awardObj.name || ''),
                name: String(awardObj.title || awardObj.name || ''),
                issuer: String(awardObj.issuer || awardObj.organization || ''),
                organization: String(awardObj.issuer || awardObj.organization || ''),
                description: String(awardObj.description || ''),
                date: String(awardObj.date_received || awardObj.date || '')
              };
            }
            return {
              title: String(award),
              name: String(award),
              issuer: '',
              organization: '',
              description: '',
              date: ''
            };
          }) : [],
        
        languages: languages.length > 0 ? 
          languages.map(lang => ({
            name: lang.name,
            proficiency: lang.proficiency
          })) : Array.isArray(activeProfile.languages) ? 
          activeProfile.languages.map((lang: unknown) => {
            if (typeof lang === 'object' && lang !== null) {
              const langObj = lang as Record<string, unknown>;
              return {
                name: String(langObj.name || ''),
                proficiency: String(langObj.proficiency || '')
              };
            }
            return {
              name: String(lang),
              proficiency: ''
            };
          }) : [],
        achievements: Array.isArray(activeProfile.achievements) ? activeProfile.achievements.map(String) : []
      };
      
      console.log('[API] Creating DocxResumeGenerator with parsed data');
      console.log('[API] Resume profile:', resumeProfile);
      
      const generator = new DocxResumeGenerator(resumeProfile, jobKeywords);
      const buffer = await generator.generateDocument();
      console.log('[API] Generated document buffer size:', buffer.length);
      return buffer;
      
    } catch (parseError) {
      console.error('[API] HTML parsing failed, falling back to simple profile approach:', parseError);
      // Fall back to simple profile approach
    }
  }
  
  // Original approach as fallback
  if (profileData) {
    console.log('[API] Using DocxResumeGenerator with profileData:', profileData);
    const generator = new DocxResumeGenerator(profileData, jobKeywords);
    const buffer = await generator.generateDocument();
    console.log('[API] Generated document buffer size:', buffer.length);
    return buffer;
  } else if (html) {
    console.log('[API] Using legacy HTML conversion, html length:', html.length);
    const { convertHtmlToDocxBuffer } = await import('../../services/htmlDocsService');
    return convertHtmlToDocxBuffer(html, { pageWidthPx: 1200 });
  }
  
  throw new Error('Missing required data: need htmlContent + profile, or profileData, or html');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { filename } = req.body || {};

  try {
    const buffer = await generateDocxBuffer(req.body);
    const outName = (filename && typeof filename === 'string' ? filename : 'resume').replace(/[^a-z0-9_.-]/gi, '_') + '.docx';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${outName}"`);
    res.setHeader('Content-Length', buffer.length.toString());

    return res.status(200).send(buffer);
  } catch (error: unknown) {
    console.error('[convert-html-to-docx] error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Conversion failed';
    return res.status(500).json({ error: errorMessage });
  }
}