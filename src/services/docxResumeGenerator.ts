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
            },
            paragraph: {
              spacing: {
                after: 240,
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
            },
            paragraph: {
              spacing: {
                before: 240,
                after: 120,
              },
              border: {
                bottom: {
                  color: "E5E7EB",
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 6,
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
            },
            paragraph: {
              spacing: {
                line: 276,
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
            },
            paragraph: {
              spacing: {
                after: 80,
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
            },
            paragraph: {
              spacing: {
                after: 80,
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
            },
            paragraph: {
              spacing: {
                after: 80,
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
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
              },
            },
          },
          children: [
            ...this.createHeader(),
            ...this.createProfessionalSummary(),
            ...this.createSkillsSection(),
            ...this.createCoreCompetenciesSection(),
            ...this.createExperienceSection(),
            ...this.createEducationSection(),
            ...this.createProjectsSection(),
            ...this.createCertificationsSection(),
            ...this.createAwardsSection(),
            ...this.createVolunteerSection(),
            ...this.createPublicationsSection(),
            ...this.createLanguagesSection(),
          ],
        },
      ],
    });

    return await Packer.toBuffer(doc);
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
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
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
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
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
        spacing: { after: 300 },
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
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: summary,
            size: 22,
            color: "374151",
          }),
        ],
        spacing: { after: 240, line: 300 },
        alignment: AlignmentType.JUSTIFIED,
      }),
    ];
  }

  private createSkillsSection(): Paragraph[] {
    console.log('🛠️ Creating skills section');
    
    // Prioritize detailed AI-enhanced skills
    const skillsData = this.profile.detailedResumeSections?.technical_skills ||
                      this.profile.technicalSkills || 
                      this.profile.skills || [];
    
    console.log('Skills data:', skillsData);
    
    // Normalize skills to strings
    const normalizedSkills = skillsData
      .map((skill: any) => {
        if (typeof skill === 'string') return skill.trim();
        if (skill && typeof skill === 'object' && skill.name) return skill.name.trim();
        return null;
      })
      .filter((skill: string | null) => skill && skill.length > 0);
    
    console.log('Normalized skills:', normalizedSkills);
    
    if (!normalizedSkills.length) {
      console.log('❌ No valid skills data found after normalization');
      return [];
    }

    const paragraphs: Paragraph[] = [];

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

    // Display all skills inline with asterisk separators - SAVES SIGNIFICANT SPACE
    // This format is more professional and ATS-friendly than multi-line categories
    // Using LEFT alignment to prevent odd spacing, and ensuring skills flow naturally in paragraph
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: normalizedSkills.join(" * "),
            size: 20,
            color: "374151",
          }),
        ],
        spacing: { after: 180, line: 276 }, // Single line spacing (1.15)
        alignment: AlignmentType.LEFT,
        wordWrap: true, // Ensure proper word wrapping
      })
    );

    return paragraphs;
  }

  private createCoreCompetenciesSection(): Paragraph[] {
    if (!this.profile.coreCompetencies?.length) {
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

    // Display competencies in a grid-like format using multiple short paragraphs
    const competenciesPerRow = 3;
    for (let i = 0; i < this.profile.coreCompetencies.length; i += competenciesPerRow) {
      const rowCompetencies = this.profile.coreCompetencies.slice(i, i + competenciesPerRow);
      
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: rowCompetencies.join(" • "),
              size: 20,
              color: "374151",
            }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    paragraphs.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }));

    return paragraphs;
  }

  private createExperienceSection(): Paragraph[] {
    // Prioritize detailed AI-enhanced experience
    let experienceData: any[] = [];
    
    if (this.profile.detailedResumeSections?.experience) {
      experienceData = this.profile.detailedResumeSections.experience.map(exp => ({
        position: exp.position,
        company: exp.company,
        location: exp.location,
        duration: exp.duration,
        responsibilities: exp.key_responsibilities,
        achievements: exp.achievements,
        technologies_used: exp.technologies_used,
        quantified_results: exp.quantified_results
      }));
    } else {
      experienceData = this.profile.experience || this.profile.workExperience || [];
    }
    
    console.log('[DocxResumeGenerator] createExperienceSection called, experienceData:', experienceData);
    console.log('[DocxResumeGenerator] experienceData length:', experienceData.length);
    
    if (!experienceData.length) {
      console.log('[DocxResumeGenerator] No experience data found, returning empty array');
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

    for (const exp of experienceData) {
      // Job Title and Dates
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: exp.position || exp.title || exp.jobTitle || "Position",
              size: 24,
              bold: true,
              color: "111827",
            }),
            new TextRun({
              text: `\t${exp.duration || this.formatDateRange(exp.startDate, exp.endDate)}`,
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

      // Company and Location
      const companyLocation = [exp.company, exp.location].filter(Boolean).join(" • ");
      if (companyLocation) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: companyLocation,
                size: 20,
                bold: true,
                color: "1F2937",
              }),
            ],
            spacing: { after: 120 },
          })
        );
      }

      // Key Responsibilities
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
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: this.highlightKeywords(responsibility),
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

      // Key Achievements
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
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: this.highlightKeywords(achievement),
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

      // Technologies Used
      if (exp.technologies_used?.length) {
        const techText = Array.isArray(exp.technologies_used) 
          ? exp.technologies_used.join(", ") 
          : exp.technologies_used;
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Technologies: ",
                size: 18,
                bold: true,
                color: "6B7280",
              }),
              new TextRun({
                text: techText,
                size: 18,
                color: "6B7280",
                italics: true,
              }),
            ],
            spacing: { after: 80, before: 40 },
          })
        );
      }

      paragraphs.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }));
    }

    return paragraphs;
  }

  private createEducationSection(): Paragraph[] {
    console.log('📚 Creating education section');
    
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
      // Degree and Date
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: edu.degree || "Degree",
              size: 22,
              bold: true,
              color: "1F2937",
            }),
            new TextRun({
              text: `\t${this.formatDateRange(edu.startDate, edu.endDate) || edu.graduationDate || ""}`,
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

      // School and Location
      const schoolInfo = [edu.school || edu.institution, edu.location].filter(Boolean).join(" • ");
      if (schoolInfo) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: schoolInfo,
                size: 20,
                color: "374151",
              }),
            ],
            spacing: { after: 80 },
          })
        );
      }

      // GPA or additional details
      if (edu.gpa || edu.honors || edu.relevantCoursework) {
        const details = [
          edu.gpa ? `GPA: ${edu.gpa}` : "",
          edu.honors || "",
          edu.relevantCoursework ? `Relevant Coursework: ${edu.relevantCoursework}` : "",
        ].filter(Boolean).join(" • ");

        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: details,
                size: 20,
                color: "2C3E50",
              }),
            ],
            spacing: { after: 160 },
          })
        );
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
}

export default DocxResumeGenerator;