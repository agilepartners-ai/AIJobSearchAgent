import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip,
  BorderStyle,
  LevelFormat,
  Packer
} from 'docx';

// Detailed section interfaces matching AI enhancement service
interface DetailedExperience {
  company: string;
  position: string;
  duration: string;
  location: string;
  achievements: string[];
  key_responsibilities: string[];
  technologies_used: string[];
  quantified_results: string[];
}

interface DetailedEducation {
  institution: string;
  degree: string;
  field_of_study: string;
  graduation_date: string;
  gpa?: string;
  relevant_coursework: string[];
  honors: string[];
}

interface DetailedProject {
  name: string;
  description: string;
  technologies: string[];
  achievements: string[];
  duration: string;
  team_size?: string;
  role: string;
}

interface DetailedCertification {
  name: string;
  issuing_organization: string;
  issue_date: string;
  expiration_date?: string;
  credential_id?: string;
}

interface DetailedAward {
  title: string;
  issuing_organization: string;
  date: string;
  description: string;
}

interface DetailedVolunteerWork {
  organization: string;
  role: string;
  duration: string;
  description: string;
  achievements: string[];
}

interface DetailedPublication {
  title: string;
  publication: string;
  date: string;
  authors: string[];
  description: string;
}

// Profile data structure that accommodates various resume formats
interface ResumeProfileData {
  // Basic Information
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  city?: string;
  state?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;

  // Summary
  summary?: string;
  professionalSummary?: string;

  // Skills
  skills?: string[];
  technicalSkills?: string[];
  softSkills?: string[];
  coreCompetencies?: string[];

  // Experience - flexible structure to handle various formats
  experience?: Array<{
    jobTitle?: string;
    position?: string;
    title?: string;
    company?: string;
    location?: string;
    duration?: string;
    startDate?: string;
    endDate?: string;
    responsibilities?: string[];
    description?: string;
  }>;
  workExperience?: Array<{
    jobTitle?: string;
    position?: string;
    title?: string;
    company?: string;
    location?: string;
    duration?: string;
    startDate?: string;
    endDate?: string;
    responsibilities?: string[];
    description?: string;
  }>;

  // Education
  education?: Array<{
    degree?: string;
    institution?: string;
    school?: string;
    graduationYear?: string;
    graduationDate?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    gpa?: string;
    honors?: string;
    relevantCoursework?: string;
  }>;

  // Projects
  projects?: Array<{
    title?: string;
    name?: string;
    description?: string;
    technologies?: string[];
    duration?: string;
    startDate?: string;
    endDate?: string;
    achievements?: string[];
    bullets?: string[];
  }>;

  // Certifications
  certifications?: Array<{
    name?: string;
    title?: string;
    issuer?: string;
    organization?: string;
    date?: string;
    issueDate?: string;
  }>;

  // Awards
  awards?: Array<{
    title?: string;
    name?: string;
    issuer?: string;
    organization?: string;
    description?: string;
    date?: string;
  }>;

  // Languages
  languages?: Array<{
    name?: string;
    proficiency?: string;
  }>;

  // Detailed AI-enhanced sections
  detailedResumeSections?: {
    professional_summary?: string;
    technical_skills?: string[];
    soft_skills?: string[];
    experience?: DetailedExperience[];
    education?: DetailedEducation[];
    projects?: DetailedProject[];
    certifications?: DetailedCertification[];
    awards?: DetailedAward[];
    volunteer_work?: DetailedVolunteerWork[];
    publications?: DetailedPublication[];
  };

  // Detailed cover letter
  detailedCoverLetter?: {
    opening_paragraph?: string;
    body_paragraph?: string;
    closing_paragraph?: string;
  };
}

export class DocxResumeGenerator {
  private readonly profile: ResumeProfileData;
  private readonly jobKeywords: string[];

  // Placeholder text patterns that indicate malformed/template data
  private static readonly PLACEHOLDER_PATTERNS = [
    /and collaborate effectively with cross-functional teams/i,
    /collaborat(e|ing) (effectively |)with cross-functional teams/i,
    /reduce development timelines/i,
    /reducing development timelines/i,
    /significantly reducing development timelines/i,
    /efficient workflow implementation/i,
    /through efficient (workflow|processes|collaboration)/i,
    /streamlin(e|ed|ing) (processes|workflow|operations)/i,
    /drive\s+(innovation|efficiency|results)/i,
    /deliver\s+(high[- ]quality|exceptional)\s+(results|solutions)/i,
    /\$\{.*?\}/,  // Template literals like ${variable}
    /\[.*?\]/,    // Bracketed placeholders like [Project Name]
    /placeholder/i,
    /example\s+(project|text|data)/i,
    /TBD|TODO|N\/A|tbd|todo/i,
    /^\s*,\s*$/,   // Just commas or whitespace
    /^\s*-\s*$/,   // Just dashes or whitespace  
    /^\s*and\s+/i, // Starting with "and"
    /your (project|company|role|team)/i,
    /insert (details|description|information)/i,
    /lorem ipsum/i,
    /sample\s+(text|project|description)/i,
    /generic\s+(description|text)/i,
    /boilerplate/i
  ];

  constructor(profile: ResumeProfileData, jobKeywords: string[] = []) {
    console.log('[DocxResumeGenerator] Constructor called with profile:', profile);
    console.log('[DocxResumeGenerator] Profile keys:', Object.keys(profile || {}));
    console.log('[DocxResumeGenerator] Experience data:', profile?.experience || profile?.workExperience);
    console.log('[DocxResumeGenerator] Education data:', profile?.education);
    console.log('[DocxResumeGenerator] Skills data:', profile?.skills);
    console.log('[DocxResumeGenerator] Job keywords:', jobKeywords);
    
    this.profile = profile;
    this.jobKeywords = jobKeywords;
  }

  /**
   * Validate if a project has complete, non-placeholder data
   * @param project Project data to validate
   * @returns true if project is valid and complete
   */
  private static isValidProject(project: any): boolean {
    if (!project || typeof project !== 'object') {
      console.warn('[DocxResumeGenerator] ❌ Invalid project: not an object');
      return false;
    }

    // Extract project name from various possible fields
    const projectName = (project.name || project.title || '').trim();
    
    // Check 1: Must have a non-empty name
    if (!projectName || projectName.length < 2) {
      console.warn('[DocxResumeGenerator] ❌ Invalid project: missing or too short name');
      return false;
    }

    // Check 2: Name shouldn't be placeholder text
    if (this.PLACEHOLDER_PATTERNS.some(pattern => pattern.test(projectName))) {
      console.warn('[DocxResumeGenerator] ❌ Invalid project: name contains placeholder text:', projectName);
      return false;
    }

    // Extract description from various sources
    const description = project.description || 
                       (project.achievements?.length ? project.achievements[0] : '') || 
                       (project.bullets?.length ? project.bullets[0] : '') || 
                       '';
    const descriptionText = String(description).trim();

    // Check 3: Must have some description (or at least technologies)
    const hasTechnologies = (Array.isArray(project.technologies) && project.technologies.length > 0) ||
                           (typeof project.technologies === 'string' && project.technologies.trim().length > 0) ||
                           (Array.isArray(project.techStack) && project.techStack.length > 0) ||
                           (typeof project.techStack === 'string' && project.techStack.trim().length > 0);

    if (!descriptionText && !hasTechnologies) {
      console.warn('[DocxResumeGenerator] ❌ Invalid project: no description and no technologies');
      return false;
    }

    // Check 4: Description shouldn't be placeholder text
    if (descriptionText && this.PLACEHOLDER_PATTERNS.some(pattern => pattern.test(descriptionText))) {
      console.warn('[DocxResumeGenerator] ❌ Invalid project: description contains placeholder text:', descriptionText.substring(0, 100));
      return false;
    }

    // Check 5: Description should be substantial (at least 10 characters if present)
    if (descriptionText && descriptionText.length < 10) {
      console.warn('[DocxResumeGenerator] ❌ Invalid project: description too short:', descriptionText);
      return false;
    }

    console.log('[DocxResumeGenerator] ✅ Valid project:', projectName);
    return true;
  }

  /**
   * Sanitize project data by removing placeholder text and normalizing fields
   * @param project Project data to sanitize
   * @returns Sanitized project or null if unable to sanitize
   */
  private static sanitizeProject(project: any): any | null {
    if (!project) return null;

    const sanitized = { ...project };

    // Sanitize name
    const projectName = (project.name || project.title || '').trim();
    if (this.PLACEHOLDER_PATTERNS.some(pattern => pattern.test(projectName))) {
      console.warn('[DocxResumeGenerator] ⚠️ Removing placeholder name:', projectName);
      sanitized.name = '';
      sanitized.title = '';
    }

    // Sanitize description
    if (sanitized.description) {
      const desc = String(sanitized.description).trim();
      if (this.PLACEHOLDER_PATTERNS.some(pattern => pattern.test(desc))) {
        console.warn('[DocxResumeGenerator] ⚠️ Removing placeholder description');
        sanitized.description = '';
      }
    }

    // Sanitize achievements array
    if (Array.isArray(sanitized.achievements)) {
      sanitized.achievements = sanitized.achievements.filter((achievement: any) => {
        const achText = String(achievement).trim();
        const isPlaceholder = this.PLACEHOLDER_PATTERNS.some(pattern => pattern.test(achText));
        if (isPlaceholder) {
          console.warn('[DocxResumeGenerator] ⚠️ Filtering out placeholder achievement:', achText.substring(0, 100));
        }
        return !isPlaceholder && achText.length >= 10;
      });
    }

    // Sanitize bullets array
    if (Array.isArray(sanitized.bullets)) {
      sanitized.bullets = sanitized.bullets.filter((bullet: any) => {
        const bulletText = String(bullet).trim();
        const isPlaceholder = this.PLACEHOLDER_PATTERNS.some(pattern => pattern.test(bulletText));
        if (isPlaceholder) {
          console.warn('[DocxResumeGenerator] ⚠️ Filtering out placeholder bullet:', bulletText.substring(0, 100));
        }
        return !isPlaceholder && bulletText.length >= 10;
      });
    }

    return sanitized;
  }

  /**
   * Generate a professional DOCX resume document
   */
  public async generateDocument(): Promise<Buffer> {
    const doc = new Document({
      creator: "AI Job Search Agent",
      title: `${this.profile.fullName || this.profile.name || 'Professional'} - Resume`,
      description: "Professional resume generated by AI Job Search Agent",
      styles: {
        paragraphStyles: [
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: 28,
              bold: true,
              color: "1F2937",
              font: "Calibri", // Professional ATS-compatible font
            },
            paragraph: {
              spacing: {
                after: 160, // Reduced from 240 to 160 (8pt to ~5.3pt)
              },
              alignment: AlignmentType.CENTER,
            },
          },
          {
            id: "Heading2",
            name: "Heading 2", 
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: 24,
              bold: true,
              color: "1F2937",
              allCaps: true,
              font: "Calibri",
            },
            paragraph: {
              spacing: {
                before: 160, // Reduced from 240 to 160
                after: 80, // Reduced from 120 to 80
              },
              border: {
                bottom: {
                  color: "2563EB", // Changed to blue for premium look
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 8, // Slightly thicker from 6 to 8
                },
              },
            },
          },
          {
            id: "ContactInfo",
            name: "Contact Info",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 22,
              color: "374151",
              font: "Calibri",
            },
            paragraph: {
              spacing: {
                line: 230, // Tightened from 276 to 230 for 1.15 line-height
              },
              alignment: AlignmentType.CENTER,
            },
          },
          {
            id: "JobTitle",
            name: "Job Title",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 24,
              bold: true,
              color: "111827",
              font: "Calibri",
            },
            paragraph: {
              spacing: {
                after: 60, // Reduced from 80 to 60
              },
            },
          },
          {
            id: "CompanyName",
            name: "Company Name",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 20,
              bold: true,
              color: "1F2937",
              font: "Calibri",
            },
            paragraph: {
              spacing: {
                after: 60, // Reduced from 80 to 60
              },
            },
          },
          {
            id: "Bullet",
            name: "Bullet Point",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 20,
              color: "2C3E50",
              font: "Calibri",
            },
            paragraph: {
              spacing: {
                after: 60, // Reduced from 80 to 60
                line: 230, // Added tight line spacing (1.15 equivalent)
              },
              indent: {
                left: convertInchesToTwip(0.3),
                hanging: convertInchesToTwip(0.25),
              },
            },
          },
        ],
      },
      numbering: {
        config: [
          {
            reference: "bullet-points",
            levels: [
              {
                level: 0,
                format: LevelFormat.BULLET,
                text: "•",
                alignment: AlignmentType.LEFT,
                style: {
                  paragraph: {
                    indent: {
                      left: convertInchesToTwip(0.3),
                      hanging: convertInchesToTwip(0.25),
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(0.8), // Reduced from 1 to 0.8 inch for compact layout
                right: convertInchesToTwip(0.8),
                bottom: convertInchesToTwip(0.8),
                left: convertInchesToTwip(0.8),
              },
            },
          },
          children: [
            ...this.safeSectionCreate('Header', () => this.createHeader()),
            ...this.safeSectionCreate('Professional Summary', () => this.createProfessionalSummary()),
            ...this.safeSectionCreate('Skills', () => this.createSkillsSection()),
            ...this.safeSectionCreate('Core Competencies', () => this.createCoreCompetenciesSection()),
            ...this.safeSectionCreate('Experience', () => this.createExperienceSection()),
            ...this.safeSectionCreate('Education', () => this.createEducationSection()),
            // Projects section removed - projects now integrated in Professional Experience
            ...this.safeSectionCreate('Certifications', () => this.createCertificationsSection()),
            // Awards section removed - certifications section covers recognition
            ...this.safeSectionCreate('Volunteer', () => this.createVolunteerSection()),
            ...this.safeSectionCreate('Publications', () => this.createPublicationsSection()),
            ...this.safeSectionCreate('Languages', () => this.createLanguagesSection()),
          ],
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }

  private safeSectionCreate(sectionName: string, createFn: () => Paragraph[]): Paragraph[] {
    try {
      console.log(`[DOCX] ⏳ Creating section: ${sectionName}`);
      const result = createFn();
      console.log(`[DOCX] ✅ Section "${sectionName}" created successfully with ${result.length} paragraphs`);
      return result;
    } catch (error) {
      console.error(`[DOCX] ❌ CRITICAL ERROR in section "${sectionName}":`, error);
      console.error(`[DOCX] Error message:`, error instanceof Error ? error.message : String(error));
      console.error(`[DOCX] Error stack:`, error instanceof Error ? error.stack : 'No stack trace available');
      
      // For Experience and Education sections, log the data being processed
      if (sectionName === 'Experience') {
        console.error('[DOCX] Experience data sample:', JSON.stringify(this.profile.workExperience?.slice(0, 2), null, 2));
        console.error('[DOCX] Experience data count:', this.profile.workExperience?.length);
      } else if (sectionName === 'Education') {
        console.error('[DOCX] Education data:', JSON.stringify(this.profile.education, null, 2));
      }
      
      // Return empty array to allow other sections to render
      return [];
    }
  }

  private createHeader(): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // Name
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: this.profile.fullName || this.profile.name || "Professional Name",
            size: 56,
            bold: true,
            color: "1F2937",
            font: "Calibri",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 }, // Reduced from 120 to 80
      })
    );

    // Contact Information
    const contactInfo: string[] = [];
    if (this.profile.email) contactInfo.push(this.profile.email);
    if (this.profile.phone) contactInfo.push(this.profile.phone);
    if (this.profile.location || this.profile.city || this.profile.state) {
      const location = this.profile.location || `${this.profile.city || ''}, ${this.profile.state || ''}`.trim().replace(/^,|,$/, '');
      if (location) contactInfo.push(location);
    }
    if (this.profile.linkedin) contactInfo.push(this.profile.linkedin);
    if (this.profile.github) contactInfo.push(this.profile.github);
    if (this.profile.portfolio) contactInfo.push(this.profile.portfolio);

    if (contactInfo.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: contactInfo.join(" • "),
              size: 22,
              color: "374151",
              font: "Calibri",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }, // Reduced from 400 to 200
        })
      );
    }

    // Blue line separator
    paragraphs.push(
      new Paragraph({
        children: [new TextRun("")],
        border: {
          bottom: {
            color: "2563EB",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
        spacing: { after: 160 }, // Reduced from 300 to 160
      })
    );

    return paragraphs;
  }

  private createProfessionalSummary(): Paragraph[] {
    // Prioritize detailed AI-enhanced summary
    const summary = this.profile.detailedResumeSections?.professional_summary ||
                   this.profile.summary || 
                   this.profile.professionalSummary || "";
    
    if (!summary) return [];
    
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: "PROFESSIONAL SUMMARY",
            size: 28,
            bold: true,
            color: "1F2937",
            allCaps: true,
            font: "Calibri",
          }),
        ],
        spacing: { before: 160, after: 80 }, // Reduced from 240/120 to 160/80
        border: {
          bottom: {
            color: "2563EB",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: summary,
            size: 22,
            color: "374151",
            font: "Calibri",
          }),
        ],
        spacing: { after: 160, line: 230 }, // Reduced from 240 to 160, line from 300 to 230 for 1.15
        alignment: AlignmentType.JUSTIFIED,
      }),
    ];
  }

  private createSkillsSection(): Paragraph[] {
    console.log('🛠️ Creating skills section');
    console.log('📍 Profile object keys:', Object.keys(this.profile));
    console.log('📍 detailedResumeSections keys:', this.profile.detailedResumeSections ? Object.keys(this.profile.detailedResumeSections) : 'undefined');
    
    // MATCH PDF LOGIC EXACTLY - Use the same data source priority
    let skillsArray: string[] = [];
    
    // Priority 1: Use detailed technical_skills from AI enhancement (EXACTLY like PDF)
    if (this.profile.detailedResumeSections?.technical_skills) {
      const techSkills = this.profile.detailedResumeSections.technical_skills;
      console.log('✅ Using detailedResumeSections.technical_skills (AI enhanced)');
      console.log('💡 Raw value:', JSON.stringify(techSkills).substring(0, 200));
      console.log('💡 Type:', typeof techSkills, 'IsArray:', Array.isArray(techSkills));
      console.log('💡 Array length:', Array.isArray(techSkills) ? techSkills.length : 'N/A');
      
      if (Array.isArray(techSkills)) {
        // First normalize to strings
        let rawArray = techSkills.map(skill => 
          typeof skill === 'string' ? skill.trim() : String(skill).trim()
        ).filter(skill => skill.length > 0);
        
        console.log('✅ Raw array has', rawArray.length, 'elements');
        rawArray.slice(0, 3).forEach((skill, i) => {
          console.log(`  [${i}] (${skill.length} chars): "${skill.substring(0, 100)}"`);
        });
        
        // 🔥 CRITICAL FIX: If ANY element is > 50 chars, it's likely concatenated skills
        // Split ALL elements intelligently to handle the AI returning ["long string 1", "long string 2"]
        const hasLongElements = rawArray.some(s => s.length > 50);
        
        if (hasLongElements || rawArray.length < 10) {
          console.log('🔧 Detected concatenated skills (long elements or few items), splitting intelligently...');
          skillsArray = [];
          
          for (const item of rawArray) {
            // If item is short and reasonable, keep as-is
            if (item.length <= 30 && !item.includes(' ')) {
              skillsArray.push(item);
              continue;
            }
            
            // Otherwise, split it intelligently
            console.log(`  📦 Processing: "${item.substring(0, 100)}"`);
            const words = item.split(/\s+/);
            let currentSkill = '';
            
            for (let i = 0; i < words.length; i++) {
              const word = words[i];
              const nextWord = words[i + 1];
              
              currentSkill = currentSkill ? `${currentSkill} ${word}` : word;
              
              // Detect skill boundaries
              const hasDot = word.includes('.');
              const hasSlash = word.includes('/');
              const isUpperCase = word === word.toUpperCase() && word.length >= 2;
              const nextIsUpperCase = nextWord && nextWord[0] === nextWord[0].toUpperCase();
              const isLongEnough = currentSkill.length >= 15;
              const isLastWord = !nextWord;
              
              // Keep compound skills together
              const keepTogether = nextWord && (
                (word === 'Visual' && nextWord === 'Force') ||
                (word === 'Force.com') ||
                (word === 'MS' || word === 'Oracle' || word === 'SQL') ||
                (word.endsWith('.com')) ||
                (word === 'Business' && nextWord === 'Intelligence')
              );
              
              const shouldEnd = !keepTogether && (
                hasDot || hasSlash ||
                (isUpperCase && nextIsUpperCase && currentSkill.split(' ').length >= 2) ||
                (isLongEnough && nextIsUpperCase) ||
                isLastWord
              );
              
              if (shouldEnd) {
                skillsArray.push(currentSkill);
                currentSkill = '';
              }
            }
            
            if (currentSkill) skillsArray.push(currentSkill);
          }
          
          console.log('✅ Split into', skillsArray.length, 'skills');
        } else {
          // Array already looks good
          skillsArray = rawArray;
          console.log('✅ Array looks reasonable, using as-is');
        }
      } else if (typeof techSkills === 'string') {
        console.log('⚠️ technical_skills is a STRING, not an array!');
        // Split the string into individual skills
        skillsArray = String(techSkills).split(/\s+/).filter(s => s.length > 0);
        console.log('✅ Split string into', skillsArray.length, 'words');
      }
    }
    // Priority 2: Fallback to technicalSkills
    else if (this.profile.technicalSkills) {
      console.log('⚠️ Fallback: Using profile.technicalSkills');
      const techSkills = this.profile.technicalSkills;
      
      if (Array.isArray(techSkills)) {
        skillsArray = techSkills.map(skill => 
          typeof skill === 'string' ? skill.trim() : String(skill).trim()
        ).filter(skill => skill.length > 0);
      }
    }
    // Priority 3: Fallback to general skills
    else if (this.profile.skills) {
      console.log('⚠️ Fallback: Using profile.skills');
      const skills = this.profile.skills;
      
      if (Array.isArray(skills)) {
        skillsArray = skills.map(skill => 
          typeof skill === 'string' ? skill.trim() : String(skill).trim()
        ).filter(skill => skill.length > 0);
      }
    }
    
    if (skillsArray.length === 0) {
      console.log('❌ No valid skills found');
      return [];
    }
    
    console.log('✅ Final skills array with', skillsArray.length, 'items');
    console.log('✅ First 5 skills:', skillsArray.slice(0, 5));

    const paragraphs: Paragraph[] = [];

    // Add section header
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "TECHNICAL SKILLS",
            size: 28,
            bold: true,
            color: "1F2937",
            allCaps: true,
          }),
        ],
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "2563EB",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
      })
    );

    // EXACT SAME AS PDF: Join with ' • ' 
    const skillsText = skillsArray.join(' • ');
    
    console.log('✅ Final skills text length:', skillsText.length);
    console.log('✅ Final skills text preview:', skillsText.substring(0, 200));
    console.log('✅ Contains bullets:', skillsText.includes('•'), 'Count:', (skillsText.match(/•/g) || []).length);
    
    // Display all skills inline with bullet separators - EXACT SAME FORMAT as PDF
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: skillsText,
            size: 20,
            color: "374151",
          }),
        ],
        spacing: { after: 180, line: 276 },
        alignment: AlignmentType.LEFT,
        wordWrap: true,
      })
    );

    console.log('✅ Skills section created successfully');
    return paragraphs;
  }

  private createCoreCompetenciesSection(): Paragraph[] {
    console.log('[DOCX Generator] Creating Core Competencies section...');
    console.log('[DOCX Generator] coreCompetencies:', this.profile.coreCompetencies);
    console.log('[DOCX Generator] coreCompetencies length:', this.profile.coreCompetencies?.length || 0);
    
    if (!this.profile.coreCompetencies?.length) {
      console.warn('[DOCX Generator] ⚠️ No Core Competencies found - section will be omitted from DOCX!');
      return [];
    }

    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "CORE COMPETENCIES",
            size: 28,
            bold: true,
            color: "1F2937",
            allCaps: true,
          }),
        ],
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "2563EB",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
      })
    );

    // EXACT SAME AS TECHNICAL SKILLS: Join with ' • ' inline for consistency
    const competenciesText = this.profile.coreCompetencies.join(' • ');
    console.log('[DOCX Generator] ✅ Core Competencies text:', competenciesText.substring(0, 100));
    
    // Display all competencies inline with bullet separators - EXACT SAME FORMAT as Technical Skills
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: competenciesText,
            size: 20,
            color: "374151",
          }),
        ],
        spacing: { after: 180, line: 276 },
        alignment: AlignmentType.LEFT,
      })
    );

    console.log('[DOCX Generator] ✅ Core Competencies section created successfully');
    return paragraphs;
  }

  private createExperienceSection(): Paragraph[] {
    console.log('[DocxResumeGenerator] ========= CREATING EXPERIENCE SECTION =========');
    
    // Step 1: Collect ALL experience from various sources
    let experienceData: any[] = [];
    
    // Defensive: Ensure workExperience exists
    if (!this.profile.workExperience) {
      console.warn('[DocxResumeGenerator] No workExperience array, initializing to empty');
      this.profile.workExperience = [];
    }
    
    if (this.profile.detailedResumeSections?.experience) {
      console.log('[DocxResumeGenerator] Using detailedResumeSections.experience');
      experienceData = this.profile.detailedResumeSections.experience.map(exp => ({
        position: exp.position,
        company: exp.company,
        location: exp.location,
        duration: exp.duration,
        responsibilities: exp.key_responsibilities,
        achievements: exp.achievements,
        technologies_used: exp.technologies_used,
        quantified_results: exp.quantified_results,
        isProject: false
      }));
    } else if (this.profile.experience?.length) {
      console.log('[DocxResumeGenerator] Using profile.experience');
      experienceData = [...this.profile.experience];
    } else if (this.profile.workExperience?.length) {
      console.log('[DocxResumeGenerator] Using profile.workExperience');
      experienceData = [...this.profile.workExperience];
    } else {
      console.log('[DocxResumeGenerator] No experience data found');
    }
    
    // Step 2: Collect ALL projects from various sources
    let allProjects: any[] = [];
    
    // Source 1: detailedResumeSections.projects
    const detailed = this.profile.detailedResumeSections;
    if (detailed?.projects?.length) {
      console.log('[DocxResumeGenerator] Found projects in detailedResumeSections:', detailed.projects.length);
      allProjects.push(...detailed.projects);
    }
    
    // Source 2: profile.projects (from HTML parsing)
    if (this.profile.projects?.length) {
      console.log('[DocxResumeGenerator] ✅ Found projects in profile.projects:', this.profile.projects.length);
      console.log('[DocxResumeGenerator] Projects data:', JSON.stringify(this.profile.projects, null, 2));
      allProjects.push(...this.profile.projects);
    } else {
      console.log('[DocxResumeGenerator] ⚠️ profile.projects is:', this.profile.projects);
    }
    
    console.log('[DocxResumeGenerator] DEBUG: detailed keys:', detailed ? Object.keys(detailed) : 'undefined');
    console.log('[DocxResumeGenerator] DEBUG: profile keys:', Object.keys(this.profile));
    console.log('[DocxResumeGenerator] Total projects collected (before validation):', allProjects.length);
    
    if (allProjects.length === 0) {
      console.error('[DocxResumeGenerator] ❌ NO PROJECTS FOUND! Check if profile.projects or detailed.projects exists');
      console.log('[DocxResumeGenerator] Profile structure sample:', JSON.stringify(this.profile, null, 2).substring(0, 500));
    }
    
    // Step 2.5: Sanitize and validate ALL projects
    const validProjects: any[] = [];
    for (const project of allProjects) {
      console.log('[DocxResumeGenerator] 🔍 Validating project:', project.name || project.title || 'unnamed');
      
      // First sanitize the project
      const sanitized = DocxResumeGenerator.sanitizeProject(project);
      if (!sanitized) {
        console.warn('[DocxResumeGenerator] ⚠️ Skipping project: failed sanitization');
        continue;
      }
      
      // Then validate it
      if (DocxResumeGenerator.isValidProject(sanitized)) {
        validProjects.push(sanitized);
      } else {
        console.warn('[DocxResumeGenerator] ⚠️ Skipping invalid project:', sanitized.name || sanitized.title || 'unnamed');
      }
    }
    
    console.log('[DocxResumeGenerator] ✅ Valid projects after filtering:', validProjects.length);
    if (validProjects.length !== allProjects.length) {
      console.warn(`[DocxResumeGenerator] ⚠️ Filtered out ${allProjects.length - validProjects.length} invalid/malformed projects`);
    }
    
    // Step 3: Convert VALID projects to experience format and append
    if (validProjects.length > 0) {
      console.log('[DocxResumeGenerator] Converting validated projects to experience entries...');
      
      for (const project of validProjects) {
        const projectName = project.name || project.title || 'Project';
        let technologies = '';
        
        // Handle different technology formats
        if (Array.isArray(project.technologies) && project.technologies.length > 0) {
          technologies = project.technologies.filter((t: any) => t && String(t).trim()).join(', ');
        } else if (typeof project.technologies === 'string' && project.technologies.trim()) {
          technologies = project.technologies.trim();
        } else if (project.techStack) {
          if (Array.isArray(project.techStack) && project.techStack.length > 0) {
            technologies = project.techStack.filter((t: any) => t && String(t).trim()).join(', ');
          } else if (typeof project.techStack === 'string' && project.techStack.trim()) {
            technologies = project.techStack.trim();
          }
        }
        
        // Get single-line description (already validated to be non-placeholder)
        let description = '';
        if (project.description && String(project.description).trim()) {
          description = String(project.description).trim();
        } else if (Array.isArray(project.achievements) && project.achievements.length > 0) {
          description = String(project.achievements[0]).trim();
        } else if (Array.isArray(project.bullets) && project.bullets.length > 0) {
          description = String(project.bullets[0]).trim();
        }
        
        // Ensure we have either description or technologies (validation should have caught this)
        if (!description && !technologies) {
          console.warn('[DocxResumeGenerator] ⚠️ Skipping project with no description or technologies:', projectName);
          continue;
        }
        
        // FINAL SAFETY CHECK: Verify no placeholder text made it through
        const finalCheckText = `${projectName} ${description} ${technologies}`;
        const hasPlaceholder = DocxResumeGenerator.PLACEHOLDER_PATTERNS.some(pattern => pattern.test(finalCheckText));
        if (hasPlaceholder) {
          console.error('[DocxResumeGenerator] 🚨 PLACEHOLDER DETECTED IN FINAL CHECK! Rejecting project:', {
            name: projectName,
            description: description.substring(0, 100),
            technologies
          });
          continue;
        }
        
        // Build the project entry - format like professional experience
        const projectEntry = {
          position: projectName, // Clean project name without "PROJECT:" prefix
          company: project.company || '',
          location: project.location || '',
          duration: project.duration || '',
          description: description, // One-line insight about the project
          achievements: [], // No achievements for projects - keep it clean
          responsibilities: [],
          technologies_used: technologies ? [technologies] : [],
          isProject: true
        };
        
        console.log('[DocxResumeGenerator] ✅ Created valid project entry:', projectEntry.position);
        experienceData.push(projectEntry);
      }
    } else {
      console.log('[DocxResumeGenerator] ℹ️ No valid projects to add to experience section');
    }
    
    console.log('[DocxResumeGenerator] Final experience count (including projects):', experienceData.length);
    
    if (!experienceData.length) {
      console.log('[DocxResumeGenerator] No experience or projects found, returning empty array');
      return [];
    }

    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "PROFESSIONAL EXPERIENCE",
            size: 28,
            bold: true,
            color: "1F2937",
            allCaps: true,
          }),
        ],
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "2563EB",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
      })
    );

    // Filter out malformed experience entries with invalid/empty positions or companies
    const validExperienceData = experienceData.filter(exp => {
      const position = (exp.position || exp.title || exp.jobTitle || '').trim();
      const company = (exp.company || '').trim();
      
      // Must have at least a position with minimum length
      if (!position || position.length < 3) {
        console.warn('[DOCX] Filtering out invalid experience entry: missing position:', { position, company });
        return false;
      }
      
      // For regular work experience, also require company name (but projects may not have company)
      const isProject = (exp as any).isProject === true;
      if (!isProject && (!company || company.length < 2)) {
        console.warn('[DOCX] Filtering out work experience without company:', { position, company });
        return false;
      }
      
      // Filter out placeholder text that doesn't look like a real job title
      const placeholderPatterns = [
        /^with high accuracy/i,
        /^proven ability/i,
        /^optimize development/i,
        /^achieved.*%/i,
        /^reduced.*time/i
      ];
      
      if (placeholderPatterns.some(pattern => pattern.test(position))) {
        console.warn('[DOCX] Filtering out placeholder position:', position);
        return false;
      }
      
      return true;
    });

    console.log(`[DOCX] Experience entries: ${experienceData.length} total, ${validExperienceData.length} valid`);

    for (const exp of validExperienceData) {
      // Defensive: Ensure position is never empty
      const positionText = (exp.position || exp.title || exp.jobTitle || 'Position').trim() || 'Position';
      const durationText = (exp.duration || this.formatDateRange(exp.startDate, exp.endDate) || 'Ongoing').trim();
      const isProject = (exp as any).isProject === true;
      
      // For projects: use "PROJECT: Name" format with better visibility
      const displayTitle = isProject 
        ? `PROJECT: ${positionText}` 
        : positionText;
      
      // Job Title and Dates
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: displayTitle,
              size: 24,
              bold: true,
              color: "111827",
            }),
            new TextRun({
              text: `\t${durationText}`,
              size: 20,
              color: "6B7280",
            }),
          ],
          spacing: { after: 120, before: 240 },
          tabStops: [
            {
              type: "right",
              position: convertInchesToTwip(6),
            },
          ],
        })
      );

      // Company and Location (only for work experience, not projects)
      if (!isProject) {
        const companyLocation = [exp.company, exp.location].filter(Boolean).join(" • ");
        if (companyLocation && companyLocation.trim().length > 0) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: companyLocation.trim(),
                  size: 20,
                  bold: true,
                  color: "1F2937",
                }),
              ],
              spacing: { after: 120 },
            })
          );
        }
      }

      // For projects: show description as clean one-liner
      if (isProject && exp.description && exp.description.trim()) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: this.highlightKeywords(exp.description.trim()),
                size: 20,
                color: "2C3E50",
              }),
            ],
            spacing: { after: 80, before: 40 },
          })
        );
      }

      // Key Achievements (for both projects and work experience)
      if (exp.achievements?.length) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Key Achievements:",
                size: 20,
                bold: true,
                color: "1F2937",
              }),
            ],
            spacing: { after: 60, before: 80 },
          })
        );
        for (const achievement of exp.achievements) {
          const achText = String(achievement || '').trim();
          if (!achText) continue;
          
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: this.highlightKeywords(achText),
                  size: 20,
                  color: "0F3D7A",
                }),
              ],
              bullet: { level: 0 },
              spacing: { after: 80 },
            })
          );
        }
      }

      // Key Responsibilities (only for work experience, not projects)
      if (!isProject) {
        if (exp.responsibilities?.length) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "Key Responsibilities:",
                  size: 20,
                  bold: true,
                  color: "1F2937",
              }),
            ],
            spacing: { after: 60, before: 80 },
          })
        );
        for (const responsibility of exp.responsibilities) {
          const respText = String(responsibility || '').trim();
          if (!respText) continue; // Skip empty responsibilities
          
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: this.highlightKeywords(respText),
                  size: 20,
                  color: "2C3E50",
                }),
              ],
              bullet: { level: 0 },
              spacing: { after: 80 },
            })
          );
        }
        } else if (exp.description) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: this.highlightKeywords(exp.description),
                  size: 20,
                  color: "2C3E50",
                }),
              ],
              spacing: { after: 80 },
            })
          );
        }
      }

      // Technologies Used (for both projects and work experience)
      const technologies = exp.technologies_used || (exp as any).technologies;
      if (technologies) {
        const techText = Array.isArray(technologies) 
          ? technologies.filter((t: any) => t && String(t).trim()).join(", ")
          : String(technologies).trim();
        
        if (techText) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "Technologies: ",
                  size: 20,
                  bold: true,
                  color: "1F2937",
                }),
                new TextRun({
                  text: this.highlightKeywords(techText),
                  size: 20,
                  color: "4B5563",
                }),
              ],
              spacing: { after: 120, before: 60 },
            })
          );
        }
      }
    } // Close for loop

    paragraphs.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }));

    return paragraphs;
  }

  private createEducationSection(): Paragraph[] {
    console.log('📚 Creating education section');
    
    // Defensive: Ensure education exists
    if (!this.profile.education) {
      console.warn('[DOCX] No education array, initializing to empty');
      this.profile.education = [];
    }
    
    // Prioritize detailed AI-enhanced education
    let educationData: any[] = [];
    
    if (this.profile.detailedResumeSections?.education) {
      educationData = this.profile.detailedResumeSections.education.map(edu => ({
        degree: edu.degree,
        school: edu.institution,
        institution: edu.institution,
        graduationDate: edu.graduation_date,
        gpa: edu.gpa,
        relevantCoursework: edu.relevant_coursework?.join(', '),
        honors: edu.honors?.join(', ')
      }));
    } else {
      educationData = this.profile.education || [];
    }
    
    console.log('Education data:', educationData);
    
    if (!educationData.length) {
      console.log('❌ No education data found');
      return [];
    }

    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "EDUCATION",
            size: 28,
            bold: true,
            color: "1F2937",
            allCaps: true,
          }),
        ],
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "2563EB",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
      })
    );

    for (const edu of educationData) {
      // Degree and Date on first line
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: edu.degree || "Degree",
              size: 24,
              bold: true,
              color: "1F2937",
            }),
            new TextRun({
              text: `\t${this.formatDateRange(edu.startDate, edu.endDate) || edu.graduationDate || ""}`,
              size: 20,
              color: "6B7280",
            }),
          ],
          spacing: { after: 80, before: 240 },
          tabStops: [
            {
              type: "right",
              position: convertInchesToTwip(6),
            },
          ],
        })
      );

      // School and Location on second line
      const schoolInfo = [edu.school || edu.institution, edu.location].filter(Boolean).join(" • ");
      if (schoolInfo) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: schoolInfo,
                size: 22,
                color: "4B5563",
                italics: true,
              }),
            ],
            spacing: { after: 100 },
          })
        );
      }

      // GPA on third line
      if (edu.gpa) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `GPA: ${edu.gpa}`,
                size: 20,
                color: "374151",
                bold: true,
              }),
            ],
            spacing: { after: 80 },
          })
        );
      }

      // Relevant Coursework on fourth line
      if (edu.relevantCoursework) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Relevant Coursework: ",
                size: 20,
                bold: true,
                color: "1F2937",
              }),
              new TextRun({
                text: edu.relevantCoursework,
                size: 20,
                color: "374151",
              }),
            ],
            spacing: { after: 80 },
          })
        );
      }

      // Honors on separate line if exists
      if (edu.honors) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Honors: ",
                size: 20,
                bold: true,
                color: "1F2937",
              }),
              new TextRun({
                text: edu.honors,
                size: 20,
                color: "374151",
              }),
            ],
            spacing: { after: 180 },
          })
        );
      } else {
        // Add spacing if no honors
        paragraphs.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 100 } }));
      }
    }

    return paragraphs;
  }

  private createProjectsSection(): Paragraph[] {
    console.log('🚀 Creating projects section');
    
    // Prioritize detailed AI-enhanced projects
    let projectsData: any[] = [];
    
    if (this.profile.detailedResumeSections?.projects) {
      projectsData = this.profile.detailedResumeSections.projects;
    } else {
      projectsData = this.profile.projects || [];
    }
    
    console.log('Projects data:', projectsData);
    
    if (!projectsData.length) {
      console.log('❌ No projects data found');
      return [];
    }

    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "KEY PROJECTS",
            size: 28,
            bold: true,
            color: "1F2937",
            allCaps: true,
          }),
        ],
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "2563EB",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
      })
    );

    for (const project of projectsData) {
      // Project Title and Duration
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: project.title || project.name || "Project",
              size: 22,
              bold: true,
              color: "1F2937",
            }),
            new TextRun({
              text: `\t${project.duration || this.formatDateRange(project.startDate, project.endDate) || ""}`,
              size: 18,
              color: "6B7280",
            }),
          ],
          spacing: { after: 80 },
          tabStops: [
            {
              type: "right",
              position: convertInchesToTwip(6),
            },
          ],
        })
      );

      // Project Description
      if (project.description) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: this.highlightKeywords(project.description),
                size: 20,
                color: "374151",
              }),
            ],
            spacing: { after: 80 },
          })
        );
      }

      // Project Achievements/Bullets (like experience responsibilities)
      if (project.achievements?.length || project.bullets?.length) {
        const bulletPoints = project.achievements || project.bullets || [];
        for (const achievement of bulletPoints) {
          if (achievement && achievement.trim()) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: this.highlightKeywords(achievement),
                    size: 20,
                    color: "2C3E50",
                  }),
                ],
                bullet: { level: 0 },
                spacing: { after: 80 },
              })
            );
          }
        }
      }

      // Technologies
      if (project.technologies?.length) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Technologies: ${project.technologies.join(", ")}`,
                size: 18,
                color: "6B7280",
                italics: true,
              }),
            ],
            spacing: { after: 160 },
          })
        );
      }

      // Add spacing between projects
      paragraphs.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }));
    }

    return paragraphs;
  }

  private createCertificationsSection(): Paragraph[] {
    // Prioritize detailed AI-enhanced certifications
    let certificationsData: any[] = [];
    
    if (this.profile.detailedResumeSections?.certifications) {
      certificationsData = this.profile.detailedResumeSections.certifications.map(cert => ({
        name: cert.name,
        title: cert.name,
        issuer: cert.issuing_organization,
        organization: cert.issuing_organization,
        date: cert.issue_date,
        issueDate: cert.issue_date,
        expirationDate: cert.expiration_date,
        credentialId: cert.credential_id
      }));
    } else {
      certificationsData = this.profile.certifications || [];
    }
    
    if (!certificationsData.length) return [];

    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "CERTIFICATIONS",
            size: 28,
            bold: true,
            color: "1F2937",
            allCaps: true,
          }),
        ],
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "2563EB",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
      })
    );

    for (const cert of certificationsData) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cert.name || cert.title || "Certification",
              size: 22,
              bold: true,
              color: "1F2937",
            }),
          ],
          spacing: { after: 80 },
        })
      );

      if (cert.issuer || cert.organization) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: cert.issuer || cert.organization || "",
                size: 20,
                color: "374151",
              }),
            ],
            spacing: { after: 60 },
          })
        );
      }
      
      // Add extra spacing after issuer
      paragraphs[paragraphs.length - 1] = new Paragraph({
        ...paragraphs[paragraphs.length - 1],
        spacing: { after: 120 },
      });
    }

    return paragraphs;
  }

  private createAwardsSection(): Paragraph[] {
    // Prioritize detailed AI-enhanced awards
    let awardsData: any[] = [];
    
    if (this.profile.detailedResumeSections?.awards) {
      awardsData = this.profile.detailedResumeSections.awards;
    } else {
      awardsData = this.profile.awards || [];
    }
    
    if (!awardsData.length) return [];

    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "AWARDS & RECOGNITION",
            size: 28,
            bold: true,
            color: "1F2937",
            allCaps: true,
          }),
        ],
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "2563EB",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
      })
    );

    for (const award of awardsData) {
      // Award title and date on same line (title left, date right)
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: award.title || award.name || "Award",
              size: 22,
              bold: true,
              color: "1F2937",
            }),
            new TextRun({
              text: `\t${award.date || ""}`,
              size: 18,
              color: "6B7280",
            }),
          ],
          spacing: { after: 60 },
          tabStops: [
            {
              type: "right",
              position: convertInchesToTwip(6),
            },
          ],
        })
      );

      // Issuer/Organization on separate line
      if (award.issuer || award.organization) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: award.issuer || award.organization || "",
                size: 20,
                color: "4B5563",
                italics: true,
              }),
            ],
            spacing: { after: 80 },
          })
        );
      }

      // Description on separate line(s)
      if (award.description) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: award.description,
                size: 20,
                color: "374151",
              }),
            ],
            spacing: { after: 160 },
          })
        );
      } else {
        // Add extra spacing if no description
        paragraphs[paragraphs.length - 1] = new Paragraph({
          ...paragraphs[paragraphs.length - 1],
          spacing: { after: 160 },
        });
      }
    }

    return paragraphs;
  }

  private organizeSkillsByCategory(skills: (string | { name?: string })[]): Record<string, string[]> {
    const categories: Record<string, string[]> = {
      "Programming Languages": [],
      "Data Science & Machine Learning": [],
      "Data Visualization & BI": [],
      "Web Development Frameworks": [],
      "Tools & Platforms": [],
      "Project Management": [],
      "Industry Tools": [],
      "Core Competencies": [],
      "Technical Skills": [],
    };

    for (const skill of skills) {
      if (typeof skill === 'string') {
        // Categorize based on keywords
        const skillLower = skill.toLowerCase();
        
        if (skillLower.includes('python') || skillLower.includes('java') || skillLower.includes('javascript') || 
            skillLower.includes('sql') || skillLower.includes('r ') || skillLower.includes('c++')) {
          categories["Programming Languages"].push(skill);
        } else if (skillLower.includes('pandas') || skillLower.includes('numpy') || skillLower.includes('tensorflow') ||
                   skillLower.includes('scikit') || skillLower.includes('keras') || skillLower.includes('machine learning') ||
                   skillLower.includes('nlp') || skillLower.includes('ml')) {
          categories["Data Science & Machine Learning"].push(skill);
        } else if (skillLower.includes('tableau') || skillLower.includes('power bi') || skillLower.includes('visualization') ||
                   skillLower.includes('dashboard') || skillLower.includes('streamlit')) {
          categories["Data Visualization & BI"].push(skill);
        } else if (skillLower.includes('react') || skillLower.includes('flask') || skillLower.includes('framework') ||
                   skillLower.includes('web development')) {
          categories["Web Development Frameworks"].push(skill);
        } else if (skillLower.includes('git') || skillLower.includes('docker') || skillLower.includes('jupyter') ||
                   skillLower.includes('vs code') || skillLower.includes('github')) {
          categories["Tools & Platforms"].push(skill);
        } else if (skillLower.includes('agile') || skillLower.includes('scrum') || skillLower.includes('kanban') ||
                   skillLower.includes('project management') || skillLower.includes('jira') || skillLower.includes('smartsheet')) {
          categories["Project Management"].push(skill);
        } else if (skillLower.includes('salesforce') || skillLower.includes('industry')) {
          categories["Industry Tools"].push(skill);
        } else if (skillLower.includes('analytical') || skillLower.includes('problem solving') || 
                   skillLower.includes('communication') || skillLower.includes('collaboration') ||
                   skillLower.includes('planning') || skillLower.includes('leadership')) {
          categories["Core Competencies"].push(skill);
        } else {
          categories["Technical Skills"].push(skill);
        }
      } else if (skill?.name) {
        categories["Technical Skills"].push(skill.name);
      }
    }

    // Remove empty categories
    Object.keys(categories).forEach(key => {
      if (categories[key].length === 0) {
        delete categories[key];
      }
    });

    return categories;
  }

  private formatDateRange(startDate?: string, endDate?: string): string {
    if (!startDate && !endDate) return "";
    
    const start = startDate ? new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : "";
    const end = endDate ? (endDate.toLowerCase() === 'present' ? 'Present' : new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })) : "Present";
    
    if (!startDate) return end;
    if (!endDate) return start;
    
    return `${start} – ${end}`;
  }

  private highlightKeywords(text: string): string {
    if (this.jobKeywords.length === 0) return text;
    
    // Note: DOCX doesn't support inline highlighting in TextRun the same way HTML does
    // We'll just return the text as-is for now, but this could be enhanced
    // by splitting text and applying different styles to highlighted portions
    return text;
  }

  private createVolunteerSection(): Paragraph[] {
    // Use detailed AI-enhanced volunteer work
    let volunteerData: any[] = [];
    
    if (this.profile.detailedResumeSections?.volunteer_work) {
      volunteerData = this.profile.detailedResumeSections.volunteer_work;
    }
    
    if (!volunteerData.length) return [];
    
    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "VOLUNTEER EXPERIENCE",
            size: 28,
            bold: true,
            color: "1F2937",
            allCaps: true,
          }),
        ],
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "2563EB",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
      })
    );

    for (const volunteer of volunteerData) {
      // Role and Duration
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: volunteer.role,
              size: 24,
              bold: true,
              color: "111827",
            }),
            new TextRun({
              text: `\t${volunteer.duration}`,
              size: 18,
              color: "6B7280",
            }),
          ],
          spacing: { after: 80 },
          tabStops: [
            {
              type: "right",
              position: convertInchesToTwip(6),
            },
          ],
        })
      );

      // Organization
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: volunteer.organization,
              size: 20,
              bold: true,
              color: "1F2937",
            }),
          ],
          spacing: { after: 80 },
        })
      );

      // Description
      if (volunteer.description) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: volunteer.description,
                size: 20,
                color: "374151",
              }),
            ],
            spacing: { after: 80 },
          })
        );
      }

      // Achievements
      if (volunteer.achievements?.length) {
        for (const achievement of volunteer.achievements) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: achievement,
                  size: 20,
                  color: "2C3E50",
                }),
              ],
              bullet: { level: 0 },
              spacing: { after: 80 },
            })
          );
        }
      }

      paragraphs.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }));
    }

    return paragraphs;
  }

  private createPublicationsSection(): Paragraph[] {
    // Use detailed AI-enhanced publications
    let publicationsData: any[] = [];
    
    if (this.profile.detailedResumeSections?.publications) {
      publicationsData = this.profile.detailedResumeSections.publications;
    }
    
    if (!publicationsData.length) return [];
    
    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "PUBLICATIONS",
            size: 28,
            bold: true,
            color: "1F2937",
            allCaps: true,
          }),
        ],
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "2563EB",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
      })
    );

    for (const publication of publicationsData) {
      // Title and Date
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: publication.title,
              size: 22,
              bold: true,
              color: "1F2937",
            }),
            new TextRun({
              text: `\t${publication.date}`,
              size: 18,
              color: "6B7280",
            }),
          ],
          spacing: { after: 60 },
          tabStops: [
            {
              type: "right",
              position: convertInchesToTwip(6),
            },
          ],
        })
      );

      // Publication venue
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: publication.publication,
              size: 20,
              color: "4B5563",
              italics: true,
            }),
          ],
          spacing: { after: 80 },
        })
      );

      // Authors
      if (publication.authors?.length) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Authors: ${publication.authors.join(', ')}`,
                size: 18,
                color: "6B7280",
              }),
            ],
            spacing: { after: 60 },
          })
        );
      }

      // Description
      if (publication.description) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: publication.description,
                size: 20,
                color: "374151",
              }),
            ],
            spacing: { after: 160 },
          })
        );
      }
    }

    return paragraphs;
  }

  private createLanguagesSection(): Paragraph[] {
    if (!this.profile.languages?.length) return [];
    
    const paragraphs: Paragraph[] = [];
    
    // Section header
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "LANGUAGES",
            bold: true,
            size: 28,
            color: "1F2937",
            allCaps: true,
          }),
        ],
        spacing: { before: 240, after: 120 },
        border: {
          bottom: {
            color: "2563EB",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
      })
    );

    // Add spacing
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: "", size: 12 })],
        spacing: { after: 100 },
      })
    );

    // Languages list
    for (const language of this.profile.languages) {
      const languageName = language.name || '';
      const proficiency = language.proficiency || '';
      
      if (!languageName) continue;

      const displayText = proficiency ? `${languageName} (${proficiency})` : languageName;
      
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "• ",
              size: 22,
              color: "2563EB",
              bold: true,
            }),
            new TextRun({
              text: displayText,
              size: 22,
              color: "374151",
            }),
          ],
          spacing: { after: 120 },
        })
      );
    }

    return paragraphs;
  }

  /**
   * Generate a professional DOCX cover letter document
   * @param detailedCoverLetter The cover letter content from AI
   * @param userProfile User profile data (name, email, phone, location)
   * @param applicationData Job application details (company, position, location)
   * @returns Promise<Buffer> DOCX document buffer
   */
  public static async generateCoverLetterDocx(
    detailedCoverLetter: {
      opening_paragraph?: string;
      body_paragraph?: string;
      closing_paragraph?: string;
    },
    userProfile: {
      fullName?: string;
      name?: string;
      email?: string;
      phone?: string;
      location?: string;
    },
    applicationData: {
      company_name?: string;
      position?: string;
      location?: string;
    }
  ): Promise<Buffer> {
    const name = userProfile.fullName || userProfile.name || 'Your Name';
    const email = userProfile.email || 'email@example.com';
    const phone = userProfile.phone || '';
    const userLocation = userProfile.location || '';
    
    const companyName = applicationData.company_name || 'Company Name';
    const position = applicationData.position || 'Position Title';
    const companyLocation = applicationData.location || 'Company Location';

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const doc = new Document({
      creator: "AI Job Search Agent",
      title: `${name} - Cover Letter - ${position} at ${companyName}`,
      description: `Cover letter for ${position} position at ${companyName}`,
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(0.8), // Reduced from 1 to 0.8 inch for compact layout
                right: convertInchesToTwip(0.8),
                bottom: convertInchesToTwip(0.8),
                left: convertInchesToTwip(0.8),
              },
            },
          },
          children: [
            // Header - Name
            new Paragraph({
              children: [
                new TextRun({
                  text: name,
                  bold: true,
                  size: 28,
                  color: "1F2937",
                  font: "Calibri",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
            }),

            // Contact Information
            new Paragraph({
              children: [
                new TextRun({
                  text: `${email}${phone ? ` • ${phone}` : ''}${userLocation ? ` • ${userLocation}` : ''}`,
                  size: 22,
                  color: "6B7280",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 360 },
            }),

            // Date
            new Paragraph({
              children: [
                new TextRun({
                  text: currentDate,
                  size: 22,
                  color: "6B7280",
                }),
              ],
              alignment: AlignmentType.LEFT,
              spacing: { after: 240 },
            }),

            // Employer Information
            new Paragraph({
              children: [
                new TextRun({
                  text: "Hiring Manager",
                  size: 22,
                  color: "374151",
                }),
              ],
              spacing: { after: 80 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: companyName,
                  size: 22,
                  color: "374151",
                }),
              ],
              spacing: { after: 80 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: companyLocation,
                  size: 22,
                  color: "374151",
                }),
              ],
              spacing: { after: 240 },
            }),

            // Subject Line
            new Paragraph({
              children: [
                new TextRun({
                  text: `Re: Application for ${position}`,
                  bold: true,
                  size: 22,
                  color: "374151",
                }),
              ],
              spacing: { after: 240 },
            }),

            // Salutation
            new Paragraph({
              children: [
                new TextRun({
                  text: "Dear Hiring Manager,",
                  size: 22,
                  color: "374151",
                }),
              ],
              spacing: { after: 240 },
            }),

            // Opening Paragraph
            new Paragraph({
              children: [
                new TextRun({
                  text: detailedCoverLetter.opening_paragraph ||
                    `I am writing to express my strong interest in the ${position} role at ${companyName}. Based on my background and experience, I am confident that I can contribute meaningfully to your team's success.`,
                  size: 22,
                  color: "374151",
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 240, line: 360 },
            }),

            // Body Paragraph
            new Paragraph({
              children: [
                new TextRun({
                  text: detailedCoverLetter.body_paragraph ||
                    `My experience aligns well with the requirements for this role. I have developed relevant skills and competencies that would enable me to contribute effectively to ${companyName}. I am particularly drawn to this opportunity because it aligns with my professional goals and interests.`,
                  size: 22,
                  color: "374151",
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 240, line: 360 },
            }),

            // Closing Paragraph
            new Paragraph({
              children: [
                new TextRun({
                  text: detailedCoverLetter.closing_paragraph ||
                    `I would welcome the opportunity to discuss how my background and skills can contribute to ${companyName}'s success. Thank you for your time and consideration. I look forward to hearing from you.`,
                  size: 22,
                  color: "374151",
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 360, line: 360 },
            }),

            // Sign-off
            new Paragraph({
              children: [
                new TextRun({
                  text: "Sincerely,",
                  size: 22,
                  color: "374151",
                }),
              ],
              spacing: { after: 240 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: name,
                  size: 22,
                  color: "374151",
                }),
              ],
              spacing: { after: 360 },
            }),

            // Footer
            new Paragraph({
              children: [
                new TextRun({
                  text: `Tailored for ${position} at ${companyName}.`,
                  size: 18,
                  color: "9CA3AF",
                  italics: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              border: {
                top: {
                  color: "E5E7EB",
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 6,
                },
              },
              spacing: { before: 240 },
            }),
          ],
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }
}

export default DocxResumeGenerator;