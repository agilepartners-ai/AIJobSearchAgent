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
    console.log('[DOCX Parser] Extracting education...');
    const educationText = this.extractSection(['EDUCATION', 'ACADEMIC BACKGROUND']);
    console.log('[DOCX Parser] Education section text:', educationText ? educationText.substring(0, 200) : 'NOT FOUND');
    
    if (!educationText) {
      console.log('[DOCX Parser] No education section found in HTML');
      return [];
    }

    const entries: any[] = [];
    const lines = educationText.split('\n').filter(l => l.trim());
    let currentEntry: any = null;

    const flushEntry = () => {
      if (currentEntry && currentEntry.degree) {
        console.log('[DOCX Parser] Adding education entry:', currentEntry);
        entries.push(currentEntry);
      }
      currentEntry = null;
    };

    for (const line of lines) {
      // Match degree patterns (case insensitive, handle both "B. Tech" and "BTech")
      if (/(B\.?\s*Tech|B\.?Tech|Master|Bachelor|MBA|MS|PhD|Associate)/i.test(line)) {
        flushEntry();
        const dateMatch = line.match(/\b(Expected \d{2}\/\d{4}|Expected \d{4}|\d{4})\b/);
        currentEntry = {
          degree: line.replace(dateMatch ? dateMatch[0] : '', '').trim(),
          school: '',
          institution: '',
          graduationDate: dateMatch ? dateMatch[0] : '',
          details: ''
        };
      } else if (currentEntry) {
        if (!currentEntry.school && /(University|Institute|School|College)/i.test(line)) {
          currentEntry.school = line;
          currentEntry.institution = line;
        } else if (line.match(/GPA:\s*[\d.]+/i)) {
          currentEntry.gpa = line;
        } else {
          currentEntry.details = `${currentEntry.details} ${line}`.trim();
        }
      }
    }
    flushEntry();
    
    console.log('[DOCX Parser] Extracted education entries:', entries.length);
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
    console.log('[DOCX Parser] Extracting projects...');
    const projectEntries: any[] = [];
    
    // Try multiple variations of project headings
    const projectsSectionMatch = this.rawHtml.match(/<h2[^>]*>\s*(KEY PROJECTS|FEATURED PROJECTS|PROJECTS)\s*<\/h2>([\s\S]*?)(?=<h2|<section|$)/i);
    
    if (!projectsSectionMatch || !projectsSectionMatch[2]) {
      console.log('[DOCX Parser] No <h2> projects section found, trying text extraction');
      return this.extractProjectsFromText();
    }

    console.log('[DOCX Parser] Found projects section in HTML');
    const projectsHtml = projectsSectionMatch[2];
    const entryBlocks = projectsHtml.split(/<div[^>]*margin-bottom:\s*15px/).filter(block => block.trim().length > 50);
    console.log('[DOCX Parser] Found project blocks:', entryBlocks.length);

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
        console.log('[DOCX Parser] Adding project:', title);
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

    console.log('[DOCX Parser] Extracted project entries:', projectEntries.length);
    return projectEntries.length > 0 ? projectEntries : this.extractProjectsFromText();
  }

  extractProjectsFromText(): any[] {
    console.log('[DOCX Parser] Extracting projects from text...');
    const projectsText = this.extractSection(['KEY PROJECTS', 'FEATURED PROJECTS', 'PROJECTS']);
    if (!projectsText) {
      console.log('[DOCX Parser] No projects section found in text');
      return [];
    }

    console.log('[DOCX Parser] Projects section text:', projectsText.substring(0, 300));
    const entries: any[] = [];
    
    // Try to split by common project indicators or double newlines
    const projectBlocks = projectsText.split(/\n\s*\n/).filter(block => block.trim().length > 20);
    console.log('[DOCX Parser] Found project blocks from text:', projectBlocks.length);

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
        console.log('[DOCX Parser] Adding text-based project:', title);
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
    
    console.log('[DOCX Parser] Extracted text-based projects:', entries.length);
    return entries;
  }

  extractCertifications(): Array<{name: string, issuer: string}> {
    const certsText = this.extractSection(['CERTIFICATIONS', 'CERTIFICATES', 'PROFESSIONAL CERTIFICATIONS']);
    
    if (certsText) {
      const certEntries: Array<{name: string, issuer: string}> = [];
      
      // First try HTML parsing like PDF version
      const certSectionMatch = this.rawHtml.match(/<h2[^>]*>\s*CERTIFICATIONS\s*<\/h2>([\s\S]*?)(?=<h2|<section|$)/i);
      
      if (certSectionMatch) {
        const certHtml = certSectionMatch[1];
        const certBlocks = certHtml.split(/<div[^>]*margin-bottom:\s*8px[^>]*>/i).slice(1);
        
        for (const block of certBlocks) {
          const nameMatch = block.match(/<strong[^>]*>([^<]+)<\/strong>/i);
          const issuerMatch = block.match(/<div[^>]*>([^<]+)<\/div>/i);
          
          if (nameMatch) {
            certEntries.push({
              name: this.cleanHTML(nameMatch[1]).trim(),
              issuer: issuerMatch ? this.cleanHTML(issuerMatch[1]).trim() : ''
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
          
          // Parse additional lines for issuer
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.toLowerCase().includes('issuer') || line.toLowerCase().includes('organization')) {
              issuer = line.replace(/^[^:]*:\s*/, '');
            } else if (!issuer && line.length > 5 && !line.toLowerCase().includes('issued') && !line.toLowerCase().includes('expires')) {
              issuer = line; // Assume second line is issuer if not labeled and not a date line
            }
          }
          
          if (certName) {
            certEntries.push({ 
              name: certName, 
              issuer
            });
          }
        }
      }
      
      // Return up to 6 certifications like PDF version
      return certEntries.slice(0, 6);
    }

    // Fallback data like PDF version
    return [
      { name: 'Career Essentials in Data Analysis', issuer: 'Microsoft & LinkedIn' },
      { name: 'Data Visualization Using Python', issuer: 'IBM' },
      { name: 'Data Analytics Professional Certificate', issuer: 'Google' }
    ];
  }

  extractAwards(): Array<{name: string, issuer: string, date: string, description: string}> {
    // First try structured HTML extraction - match standard HTML structure
    const awardSectionMatch = this.rawHtml.match(/<h2[^>]*>\s*AWARDS?\s*(?:&\s*|AND\s+)?RECOGNITION\s*<\/h2>([\s\S]*?)(?=<h2|<\/section>|<\/div>\s*<\/div>\s*$|$)/i);
    
    if (awardSectionMatch) {
      const awardHtml = awardSectionMatch[1];
      const awardEntries = [];
      
      console.log('[DOCX Parser] Found AWARDS & RECOGNITION section, length:', awardHtml.length);
      
      // Try to extract structured award items - each in a div with specific classes
      const awardDivMatches = awardHtml.match(/<div[^>]*class="[^"]*award[^"]*"[^>]*>([\s\S]*?)<\/div>/gi);
      
      if (awardDivMatches && awardDivMatches.length > 0) {
        for (const awardDiv of awardDivMatches) {
          const nameMatch = awardDiv.match(/<(?:strong|h3|div)[^>]*class="[^"]*(?:award-)?name[^"]*"[^>]*>([^<]+)</i);
          const dateMatch = awardDiv.match(/<(?:span|div)[^>]*class="[^"]*(?:award-)?date[^"]*"[^>]*>([^<]+)</i);
          const issuerMatch = awardDiv.match(/<(?:span|div)[^>]*class="[^"]*(?:award-)?issuer[^"]*"[^>]*>([^<]+)</i);
          const descMatch = awardDiv.match(/<(?:p|div)[^>]*class="[^"]*(?:award-)?desc[^"]*"[^>]*>([^<]+)</i);
          
          if (nameMatch) {
            awardEntries.push({
              name: this.cleanHTML(nameMatch[1]).trim(),
              date: dateMatch ? this.cleanHTML(dateMatch[1]).trim() : '',
              issuer: issuerMatch ? this.cleanHTML(issuerMatch[1]).trim() : '',
              description: descMatch ? this.cleanHTML(descMatch[1]).trim() : ''
            });
          }
        }
      }
      
      // If no structured divs found, try list items
      if (awardEntries.length === 0) {
        const listItems = awardHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
        if (listItems) {
          for (const item of listItems) {
            const text = this.cleanHTML(item).trim();
            if (text.length > 10) {
              // Try to parse award info from text
              const lines = text.split('\n').filter(l => l.trim());
              awardEntries.push({
                name: lines[0] || text,
                issuer: lines[1] || '',
                date: lines[2] || '',
                description: lines[3] || ''
              });
            }
          }
        }
      }
      
      if (awardEntries.length > 0) {
        console.log(`[DOCX Parser] Extracted ${awardEntries.length} awards from HTML structure`);
        return awardEntries.slice(0, 5);
      }
    }

    
    // Fallback to text-based extraction
    const awardsText = this.extractSection(['AWARDS & RECOGNITION', 'AWARDS', 'RECOGNITION', 'HONORS']);
    if (!awardsText || awardsText.trim().length < 10) {
      console.log('[DOCX Parser] No awards section found in text');
      return [];
    }

    console.log('[DOCX Parser] Using text parsing for awards');
    const entries: Array<{name: string, issuer: string, date: string, description: string}> = [];
    
    // Split by bullet points or lines that look like award titles (not by double newlines)
    // Award titles typically start with capital letter and don't have dates/years at the beginning
    const lines = awardsText.split('\n').filter(l => l.trim());
    let currentAward: {name: string, issuer: string, date: string, description: string} | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Check if this line is a new award title (starts with bullet or looks like a title)
      // Award titles are typically capitalized and don't start with lowercase or dates
      const isNewAward = (
        line.match(/^[•\-*]\s*[A-Z]/) || // Starts with bullet + capital letter
        (line.match(/^[A-Z][a-zA-Z\s&]+$/) && !line.match(/\d{4}/) && line.length > 10 && line.length < 80) || // Title-like (no year, reasonable length)
        (currentAward === null && line.match(/^[A-Z]/)) // First line should be a title
      );
      
      if (isNewAward) {
        // Save previous award if exists
        if (currentAward && currentAward.name) {
          entries.push(currentAward);
        }
        
        // Start new award
        currentAward = {
          name: line.replace(/^[•\-*]\s*/, '').trim(),
          issuer: '',
          date: '',
          description: ''
        };
      } else if (currentAward) {
        // Parse additional lines for current award
        
        // Check if line contains a date (month + year or just year)
        const datePattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\b\d{4}\b/i;
        const dateMatch = line.match(datePattern);
        
        if (dateMatch && !currentAward.date) {
          currentAward.date = line.trim();
        }
        // Check if line looks like an organization/issuer (often comes after date)
        else if (!currentAward.issuer && currentAward.date && !line.toLowerCase().includes('recognized') && !line.toLowerCase().includes('acknowledged') && line.length > 5 && line.length < 100) {
          currentAward.issuer = line.trim();
        }
        // Everything else is likely part of the description
        else if (line.length > 10) {
          if (currentAward.description) {
            currentAward.description += ' ' + line.trim();
          } else {
            currentAward.description = line.trim();
          }
        }
      }
    }
    
    // Don't forget the last award
    if (currentAward && currentAward.name) {
      entries.push(currentAward);
    }

    console.log(`[DOCX Parser] Extracted ${entries.length} awards from text parsing:`, entries);
    return entries.slice(0, 5);
  }

  extractLanguages(): Array<{name: string, proficiency: string}> {
    // NOTE: This extracts SPOKEN LANGUAGES (e.g., English, Hindi, Spanish), 
    // NOT programming languages (Python, Java, etc.)
    // Programming languages belong in TECHNICAL SKILLS section
    
    // First try structured HTML extraction - standard HTML with h2 tags
    // Only look for section titled exactly "LANGUAGES" (not appearing in TECHNICAL SKILLS)
    const languageSectionMatch = this.rawHtml.match(/<h2[^>]*>\s*LANGUAGES?\s*<\/h2>([\s\S]*?)(?=<h2|<\/section>|<\/div>\s*<\/div>\s*$|$)/i);
    
    if (languageSectionMatch) {
      const languageHtml = languageSectionMatch[1];
      const languageEntries = [];
      
      console.log('[DOCX Parser] Found LANGUAGES section, checking if it contains spoken languages...');
      
      // Check if this section contains programming languages (technical skills) instead of spoken languages
      // If it contains Python, Java, SQL, etc., skip it - it's mislabeled technical skills
      const technicalKeywords = /\b(Python|Java|JavaScript|SQL|C\+\+|Ruby|PHP|Swift|Kotlin|Go|Rust|TypeScript|Scala|Perl|MATLAB|Julia|Pandas|NumPy|TensorFlow|React|Angular|Vue|Django|Flask|Spring|Node\.js|\.NET|AWS|Azure|Docker|Kubernetes|Git|Linux|Windows|MacOS|Programming|Framework|Library|Database|Cloud|DevOps)\b/i;
      
      if (technicalKeywords.test(languageHtml)) {
        console.log('[DOCX Parser] LANGUAGES section contains technical skills, not spoken languages - skipping');
        return [];
      }
      
      // Try list items first
      const listItems = languageHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
      if (listItems && listItems.length > 0) {
        for (const item of listItems) {
          const text = this.cleanHTML(item).trim();
          
          // Skip if contains technical terms
          if (technicalKeywords.test(text)) continue;
          
          // Skip empty or very short text
          if (!text || text.length < 2) continue;
          
          // Try different patterns for spoken languages
          const patterns = [
            /^(English|Hindi|Spanish|French|German|Chinese|Japanese|Korean|Arabic|Portuguese|Russian|Italian|Dutch|Polish|Turkish|Swedish|Norwegian|Danish|Finnish|Greek|Hebrew|Thai|Vietnamese|Indonesian|Malay|Bengali|Tamil|Telugu|Marathi|Gujarati|Urdu|Punjabi|Swahili)\s*\(\s*([^)]+)\s*\)$/i,
            /^(English|Hindi|Spanish|French|German|Chinese|Japanese|Korean|Arabic|Portuguese|Russian|Italian|Dutch|Polish|Turkish|Swedish|Norwegian|Danish|Finnish|Greek|Hebrew|Thai|Vietnamese|Indonesian|Malay|Bengali|Tamil|Telugu|Marathi|Gujarati|Urdu|Punjabi|Swahili)\s*[-:]\s*(.+)$/i,
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
          
          // If no pattern matched but text looks like a spoken language name
          if (!matched && /^(English|Hindi|Spanish|French|German|Chinese|Japanese|Korean|Arabic|Portuguese|Russian|Italian|Dutch|Polish|Turkish|Swedish|Norwegian|Danish|Finnish|Greek|Hebrew|Thai|Vietnamese|Indonesian|Malay|Bengali|Tamil|Telugu|Marathi|Gujarati|Urdu|Punjabi|Swahili)$/i.test(text)) {
            languageEntries.push({ name: text, proficiency: 'Proficient' });
          }
        }
      }
      
      if (languageEntries.length > 0) {
        console.log(`[DOCX Parser] Extracted ${languageEntries.length} spoken languages from HTML structure`);
        return languageEntries.slice(0, 6);
      }
    }

    // Fallback to text-based extraction
    const languagesText = this.extractSection(['LANGUAGES', 'SPOKEN LANGUAGES', 'LANGUAGE PROFICIENCY']);
    if (!languagesText) {
      console.log('[DOCX Parser] No spoken languages section found');
      return [];
    }

    // Check if this is actually technical content
    const technicalKeywords = /\b(Python|Java|JavaScript|SQL|C\+\+|Ruby|PHP|Programming|Framework|Library|Database)\b/i;
    if (technicalKeywords.test(languagesText)) {
      console.log('[DOCX Parser] Text contains technical skills, not spoken languages - skipping');
      return [];
    }

    console.log('[DOCX Parser] Using text parsing for spoken languages');
    const entries: Array<{name: string, proficiency: string}> = [];
    const lines = languagesText.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      const cleanLine = line.trim().replace(/^[•\-*]\s*/, '');
      
      // Skip lines with technical keywords
      if (technicalKeywords.test(cleanLine)) continue;
      
      // Look for spoken language patterns
      const patterns = [
        /^(English|Hindi|Spanish|French|German|Chinese|Japanese|Korean|Arabic|Portuguese|Russian|Italian|Dutch|Polish|Turkish|Swedish|Norwegian|Danish|Finnish|Greek|Hebrew|Thai|Vietnamese|Indonesian|Malay|Bengali|Tamil|Telugu|Marathi|Gujarati|Urdu|Punjabi|Swahili)\s*\(\s*([^)]+)\s*\)$/i,
        /^(English|Hindi|Spanish|French|German|Chinese|Japanese|Korean|Arabic|Portuguese|Russian|Italian|Dutch|Polish|Turkish|Swedish|Norwegian|Danish|Finnish|Greek|Hebrew|Thai|Vietnamese|Indonesian|Malay|Bengali|Tamil|Telugu|Marathi|Gujarati|Urdu|Punjabi|Swahili)\s*[-:]\s*(.+)$/i,
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
      
      // If no pattern matched but line is a known spoken language
      if (!matched && /^(English|Hindi|Spanish|French|German|Chinese|Japanese|Korean|Arabic|Portuguese|Russian|Italian|Dutch|Polish|Turkish|Swedish|Norwegian|Danish|Finnish|Greek|Hebrew|Thai|Vietnamese|Indonesian|Malay|Bengali|Tamil|Telugu|Marathi|Gujarati|Urdu|Punjabi|Swahili)$/i.test(cleanLine)) {
        entries.push({ name: cleanLine, proficiency: 'Proficient' });
      }
    }

    console.log(`[DOCX Parser] Extracted ${entries.length} spoken languages from text parsing`);
    return entries.slice(0, 6);
  }

  extractCoreCompetencies(): string[] {
    // First try structured HTML extraction - standard HTML with h2 tags
    const competenciesSectionMatch = this.rawHtml.match(/<h2[^>]*>\s*CORE\s*COMPETENCIES\s*<\/h2>([\s\S]*?)(?=<h2|<\/section>|<\/div>\s*<\/div>\s*$|$)/i);
    
    if (competenciesSectionMatch) {
      const competenciesHtml = competenciesSectionMatch[1];
      const competencies: string[] = [];
      
      console.log('[DOCX Parser] Found CORE COMPETENCIES section, length:', competenciesHtml.length);
      
      // Try list items first
      const listItems = competenciesHtml.match(/<li[^>]*>([^<]+)<\/li>/gi);
      if (listItems && listItems.length > 0) {
        listItems.forEach(li => {
          const text = this.cleanHTML(li).trim();
          if (text && text.length > 2) {
            competencies.push(text);
          }
        });
      }
      
      // If no list items, try divs/spans with competency data
      if (competencies.length === 0) {
        const textMatches = competenciesHtml.match(/<(?:div|span|p)[^>]*class="[^"]*competenc[^"]*"[^>]*>([^<]+)<\/(?:div|span|p)>/gi);
        if (textMatches && textMatches.length > 0) {
          textMatches.forEach(textTag => {
            const text = this.cleanHTML(textTag).trim();
            // Filter out empty strings and the section title itself
            if (text && text.length > 2 && !text.match(/CORE\s*COMPETENCIES/i)) {
              competencies.push(text);
            }
          });
        }
      }
      
      // If still no matches, try any text content in the section
      if (competencies.length === 0) {
        const allTextMatches = competenciesHtml.match(/<(?:div|span|p)[^>]*>([^<]+)<\/(?:div|span|p)>/gi);
        if (allTextMatches && allTextMatches.length > 0) {
          allTextMatches.forEach(textTag => {
            const text = this.cleanHTML(textTag).trim();
            if (text && text.length > 2 && !text.match(/CORE\s*COMPETENCIES/i)) {
              // Split by common separators if text contains multiple competencies
              const items = text.split(/[•|]/);
              items.forEach(item => {
                const trimmed = item.trim();
                if (trimmed.length > 2) {
                  competencies.push(trimmed);
                }
              });
            }
          });
        }
      }
      
      if (competencies.length > 0) {
        console.log(`[DOCX Parser] Extracted ${competencies.length} core competencies from HTML structure:`, competencies);
        return competencies.slice(0, 12);
      }
    }
    
    // Fallback to text-based extraction
    const competenciesText = this.extractSection(['CORE COMPETENCIES', 'SOFT SKILLS', 'KEY COMPETENCIES', 'COMPETENCIES']);
    if (!competenciesText) {
      console.log('[DOCX Parser] No core competencies section found');
      return [];
    }

    const competencies: string[] = [];
    const lines = competenciesText.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      const cleanLine = line.trim().replace(/^[•\-*]\s*/, '');
      if (cleanLine.length > 2) {
        // Split by common separators
        const items = cleanLine.split(/[,;|]/);
        items.forEach(item => {
          const trimmed = item.trim();
          if (trimmed.length > 2) {
            competencies.push(trimmed);
          }
        });
      }
    }

    console.log(`[DOCX Parser] Extracted ${competencies.length} core competencies from text parsing:`, competencies);
    return competencies.slice(0, 12);
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
      const coreCompetencies = parser.extractCoreCompetencies();
      
      console.log('[API] ⭐ EXTRACTED PROJECTS FROM HTML:', projects.length);
      console.log('[API] Projects detail:', JSON.stringify(projects, null, 2));
      
      console.log('[API] Parsed content:', {
        summary: professionalSummary.substring(0, 100),
        experienceCount: experience.length,
        educationCount: education.length,
        skillsCount: skillBuckets.all.length,
        projectsCount: projects.length,
        certificationsCount: certifications.length,
        awardsCount: awards.length,
        languagesCount: languages.length,
        coreCompetenciesCount: coreCompetencies.length
      });
      
      // Create structured profile data for DocxResumeGenerator
      // 🔥 CRITICAL: Preserve detailedResumeSections from incoming profile if available (AI-enhanced data)
      console.log('[API] Checking for detailedResumeSections in activeProfile:', !!activeProfile.detailedResumeSections);
      if (activeProfile.detailedResumeSections) {
        console.log('[API] detailedResumeSections keys:', Object.keys(activeProfile.detailedResumeSections));
        console.log('[API] technical_skills:', activeProfile.detailedResumeSections.technical_skills);
      }
      
      const resumeProfile = {
        // Basic info from profile
        fullName: String(activeProfile.fullName || activeProfile.full_name || ''),
        email: String(activeProfile.email || ''),
        phone: String(activeProfile.phone || ''),
        location: String(activeProfile.location || ''),
        linkedIn: String(activeProfile.linkedin || activeProfile.linkedin_url || ''),
        
        // 🔥 PRESERVE AI-ENHANCED SECTIONS - Don't overwrite with HTML parsing!
        // If the incoming profile has detailedResumeSections, use it! It's the AI-enhanced data.
        detailedResumeSections: activeProfile.detailedResumeSections || undefined,
        
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
        
        // Skills from parsed HTML - ONLY use if detailedResumeSections NOT available
        skills: Array.isArray(skillBuckets.all) ? skillBuckets.all.map(String) : 
                Array.isArray(activeProfile.skills) ? activeProfile.skills.map(String) : [],
        technicalSkills: Array.isArray(skillBuckets.technical) ? skillBuckets.technical.map(String) : 
                        Array.isArray(skillBuckets.all) ? skillBuckets.all.map(String) : 
                        Array.isArray(activeProfile.skills) ? activeProfile.skills.map(String) : [],
        coreCompetencies: coreCompetencies.length > 0 ? coreCompetencies.map(String) :
                         Array.isArray(skillBuckets.soft) ? skillBuckets.soft.map(String) : [],
        
        // Projects from parsed HTML
        projects: projects.map((proj: Record<string, unknown>) => ({
          name: String(proj.name || ''),
          title: String(proj.title || proj.name || ''),
          description: String(proj.description || ''),
          technologies: proj.technologies ? String(proj.technologies).split(/[,;]/).map(t => t.trim()) : [],
          duration: String(proj.duration || ''),
          achievements: Array.isArray(proj.achievements) ? proj.achievements.map(String) : 
                       Array.isArray(proj.bullets) ? proj.bullets.map(String) : [],
          isProject: true
        })),
        
        // Use parsed data from HTML with fallback to profile data
        certifications: certifications.length > 0 ? 
          certifications.map(cert => ({
            name: cert.name,
            issuer: cert.issuer,
            organization: cert.issuer
          })) : Array.isArray(activeProfile.certifications) ? 
          activeProfile.certifications.map((cert: unknown) => {
            if (typeof cert === 'object' && cert !== null) {
              const certObj = cert as Record<string, unknown>;
              return {
                name: String(certObj.name || certObj.title || ''),
                issuer: String(certObj.issuing_organization || certObj.issuer || certObj.organization || ''),
                organization: String(certObj.issuing_organization || certObj.issuer || certObj.organization || '')
              };
            }
            return {
              name: String(cert),
              issuer: '',
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
      
      console.log('[API] 🎯 FINAL resumeProfile.projects before DOCX:', resumeProfile.projects?.length || 0);
      if (resumeProfile.projects?.length) {
        console.log('[API] Projects sample:', resumeProfile.projects[0]);
      }
      
      console.log('[API] Creating DocxResumeGenerator with parsed data');
      
      try {
        const generator = new DocxResumeGenerator(resumeProfile, jobKeywords);
        const buffer = await generator.generateDocument();
        console.log('[API] Generated document buffer size:', buffer.length);
        return buffer;
      } catch (docxError) {
        console.error('[API] DOCX generation failed with parsed profile:', docxError);
        console.error('[API] Profile workExperience count:', resumeProfile.workExperience?.length);
        console.error('[API] Profile workExperience:', JSON.stringify(resumeProfile.workExperience, null, 2));
        throw docxError;
      }
      
    } catch (parseError) {
      console.error('[API] HTML parsing failed, falling back to simple profile approach:', parseError);
      // Fall back to simple profile approach
    }
  }
  
  // Original approach as fallback
  if (profileData) {
    console.log('[API] Using DocxResumeGenerator with profileData:', profileData);
    try {
      const generator = new DocxResumeGenerator(profileData, jobKeywords);
      const buffer = await generator.generateDocument();
      console.log('[API] Generated document buffer size:', buffer.length);
      return buffer;
    } catch (docxError) {
      console.error('[API] DOCX generation failed with profileData:', docxError);
      console.error('[API] profileData keys:', Object.keys(profileData));
      throw docxError;
    }
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
    console.error('[convert-html-to-docx] CRITICAL ERROR:', error);
    console.error('[convert-html-to-docx] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[convert-html-to-docx] Request body keys:', Object.keys(req.body || {}));
    const errorMessage = error instanceof Error ? error.message : 'Conversion failed';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return res.status(500).json({ 
      error: errorMessage,
      stack: errorStack,
      details: 'Check server console for full error details'
    });
  }
}