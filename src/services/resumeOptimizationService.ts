import { fetchWithErrorHandling, createApiError } from '../utils/apiErrorUtils';

interface OptimizationRequest {
  firebase_uid: string;
  resume_text: string;
  job_description: string;
}

interface OptimizationResponse {
  success: boolean;
  message: string;
  data?: {
    django_user_id: number;
    firebase_uid: string;
    user_created: boolean;
    analysis: {
      match_score: number;
      strengths: string[];
      gaps: string[];
      suggestions: string[];
      tweaked_resume_text: string;
    };
    optimization_successful: boolean;
    score_threshold_met: boolean;
    tweaked_text: string | null;
    explanation: string;
  };
  error?: string;
}

export class ResumeOptimizationService {
  private static readonly API_URL = 'https://resumebuilder-arfb.onrender.com/optimizer/api/optimize-resume/';
  private static readonly API_TIMEOUT = 30000; // 30 seconds
  private static readonly PROXY_URL = '/api/proxy/resume-optimization'; // Local proxy endpoint

  /**
   * Validate optimization request data
   * @param userId User ID
   * @param resumeText Resume text
   * @param jobDescription Job description
   * @returns Validation result
   */
  private static validateOptimizationRequest(
    userId: string,
    resumeText: string,
    jobDescription: string
  ): { isValid: boolean; error?: string } {
    if (!userId || userId.trim().length === 0) {
      return { isValid: false, error: 'User ID is required' };
    }

    if (!resumeText || resumeText.trim().length < 100) {
      return { isValid: false, error: 'Resume text must be at least 100 characters long' };
    }

    if (!jobDescription || jobDescription.trim().length < 50) {
      return { isValid: false, error: 'Job description must be at least 50 characters long' };
    }

    return { isValid: true };
  }

  /**
   * Optimize resume for a specific job posting
   * @param userId Firebase UID
   * @param resumeText Complete resume text
   * @param jobDescription Target job description
   * @returns Optimization results
   */
  static async optimizeResume(
    userId: string,
    resumeText: string,
    jobDescription: string
  ): Promise<OptimizationResponse> {
    try {
      // Validate input
      const validation = this.validateOptimizationRequest(userId, resumeText, jobDescription);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.error || 'Invalid input data',
          error: validation.error
        };
      }

      const requestData: OptimizationRequest = {
        firebase_uid: userId,
        resume_text: resumeText,
        job_description: jobDescription
      };

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: AbortSignal.timeout(this.API_TIMEOUT)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result: OptimizationResponse = await response.json();
      return result;

    } catch (error: any) {
      console.error('Resume optimization error:', error);

      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Request timed out. Please try again.',
          error: 'Timeout error'
        };
      }

      return {
        success: false,
        message: error.message || 'Failed to optimize resume',
        error: error.message
      };
    }
  }

  /**
   * Extract structured data from resume text
   * @param resumeText Raw resume text
   * @returns Structured resume data
   */
  static parseResumeText(resumeText: string): any {
    const sections = {
      personal: this.extractPersonalInfo(resumeText),
      summary: this.extractSection(resumeText, ['PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE', 'OBJECTIVE']),
      experience: this.extractExperience(resumeText),
      education: this.extractEducation(resumeText),
      skills: this.extractSkills(resumeText),
      projects: this.extractProjects(resumeText),
      certifications: this.extractSection(resumeText, ['CERTIFICATIONS', 'LICENSES', 'CREDENTIALS']),
      awards: this.extractSection(resumeText, ['AWARDS', 'HONORS', 'RECOGNITION']),
      volunteer: this.extractSection(resumeText, ['VOLUNTEER', 'COMMUNITY SERVICE', 'VOLUNTEER EXPERIENCE']),
      publications: this.extractSection(resumeText, ['PUBLICATIONS', 'RESEARCH', 'PAPERS'])
    };

    return sections;
  }

  private static extractPersonalInfo(text: string): any {
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    const phoneMatch = text.match(/\b(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/);
    const nameMatch = text.match(/^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/m);

    return {
      name: nameMatch ? nameMatch[1] : '',
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0] : '',
      location: this.extractLocation(text)
    };
  }

  private static extractLocation(text: string): string {
    const locationPatterns = [
      /([A-Z][a-z]+,\s*[A-Z]{2})/g,
      /([A-Z][a-z]+\s+[A-Z][a-z]+,\s*[A-Z]{2})/g,
      /([A-Z][a-z]+,\s*[A-Z][a-z]+)/g
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return '';
  }

  private static extractSection(text: string, sectionNames: string[]): string {
    for (const sectionName of sectionNames) {
      const regex = new RegExp(`${sectionName}[:\\s]*([\\s\\S]*?)(?=(?:PROFESSIONAL SUMMARY|EXPERIENCE|EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS|AWARDS|VOLUNTEER|PUBLICATIONS|$))`, 'i');
      const match = text.match(regex);
      if (match && match[1]?.trim()) {
        return match[1].trim();
      }
    }
    return '';
  }

  private static extractExperience(text: string): any[] {
    const experienceSection = this.extractSection(text, ['PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE', 'EXPERIENCE', 'EMPLOYMENT HISTORY']);
    if (!experienceSection) return [];

    // Enhanced experience parsing
    const experiences = [];
    const jobPatterns = [
      /(?=\n\s*(?:[A-Z][a-zA-Z\s&,.-]*(?:Engineer|Developer|Manager|Analyst|Specialist|Coordinator|Director|Lead|Senior|Junior|Intern|Consultant|Associate|Executive|Administrator|Supervisor|Officer|Representative)))/gm,
      /(?=\n\s*[A-Z][a-zA-Z\s&,.-]+\s+(?:at|@|\|)\s+[A-Z])/gm
    ];

    let allExperiences: string[] = [];
    for (const pattern of jobPatterns) {
      const entries = experienceSection.split(pattern).filter(entry => entry.trim().length > 40);
      if (entries.length > allExperiences.length) {
        allExperiences = entries;
      }
    }

    return allExperiences.map(exp => this.parseExperienceEntry(exp)).filter(exp => exp.title);
  }

  private static parseExperienceEntry(entry: string): any {
    const lines = entry.split('\n').filter(line => line.trim()).map(line => line.trim());
    if (lines.length === 0) return {};

    let title = '';
    let company = '';
    let dates = '';
    let location = '';
    const responsibilities = [];

    // Parse first line for title and company
    const firstLine = lines[0] || '';
    const titleCompanyPattern = /^(.+?)\s+(?:at|@)\s+(.+?)(?:\s+[•·|]\s+(.+?))?(?:\s+[•·|]\s+(.+?))?$/i;
    const match = firstLine.match(titleCompanyPattern);

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
    } else {
      title = firstLine;
      if (lines[1]) {
        company = lines[1];
      }
    }

    // Extract responsibilities from remaining lines
    const startIndex = match ? 1 : 2;
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].replace(/^[•·\-*→▪▫◦‣⁃]\s*/, '').trim();
      if (line.length > 10 && !line.match(/^\d{4}/) && !line.match(/^[A-Z][a-z]+\s+\d{4}/)) {
        responsibilities.push(line);
      }
    }

    return {
      title: title || 'Professional Role',
      company: company || 'Company',
      dates: dates || '',
      location: location || '',
      responsibilities: responsibilities.length > 0 ? responsibilities : ['Managed key responsibilities and delivered results.']
    };
  }

  private static extractEducation(text: string): any[] {
    const educationSection = this.extractSection(text, ['EDUCATION', 'ACADEMIC BACKGROUND', 'ACADEMIC QUALIFICATIONS']);
    if (!educationSection) return [];

    const educationEntries = educationSection.split(/(?=(?:Bachelor|Master|PhD|Associate|Diploma|Certificate|B\.S\.|M\.S\.|B\.A\.|M\.A\.|B\.Sc\.|M\.Sc\.))/i);

    return educationEntries.filter(entry => entry.trim().length > 10).map(entry => {
      const lines = entry.split('\n').filter(line => line.trim());
      return {
        degree: lines[0]?.trim() || 'Degree',
        school: lines[1]?.trim() || 'Institution',
        year: this.extractYear(entry),
        details: lines.slice(2).join(' • ').trim()
      };
    });
  }

  private static extractSkills(text: string): string[] {
    const skillsSection = this.extractSection(text, ['TECHNICAL SKILLS', 'SKILLS', 'CORE COMPETENCIES', 'TECHNOLOGIES']);
    if (!skillsSection) return [];

    return skillsSection
      .split(/[,•\n|]/)
      .map(skill => skill.trim())
      .filter(skill => skill.length > 1 && skill.length < 50);
  }

  private static extractProjects(text: string): any[] {
    const projectsSection = this.extractSection(text, ['PROJECTS', 'KEY PROJECTS', 'NOTABLE PROJECTS']);
    if (!projectsSection) return [];

    const projectEntries = projectsSection.split(/(?=\n\s*[A-Z][a-zA-Z\s&,.-]*(?:Project|System|Application|Platform|Tool|Solution|Website|App|Portal|Dashboard))/gi);

    return projectEntries.filter(entry => entry.trim().length > 15).map(project => {
      const lines = project.split('\n').filter(line => line.trim());
      return {
        title: lines[0]?.replace(/^[•\d.\s-]+/, '').trim() || 'Project',
        description: lines.slice(1).join(' ').trim() || 'Project description'
      };
    });
  }

  private static extractYear(text: string): string {
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : '';
  }
}