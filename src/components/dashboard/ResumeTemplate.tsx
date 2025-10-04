/* eslint-disable complexity, max-lines, @typescript-eslint/no-explicit-any */
import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { UserProfileData } from '../../services/profileService';
import { postProcessExperienceBullets, dedupeSkills } from '../../utils/resumeUtils';

// Enhanced styles for maximum ATS compatibility and professional appearance
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10.5,
    lineHeight: 1.4,
    color: '#000000',
  },

  // Header styles
  header: {
    marginBottom: 16, // Reduced from 20 to 16
    borderBottom: '2 solid #2563EB',
    paddingBottom: 15, // Reduced from 15 to 12
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16, // Increased from 10 to 16 for more space between name and contact info
    textAlign: 'center',
    letterSpacing: 0.6,
  },
  contactInfo: {
    fontSize: 11,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 1.3,
  },
  contactLine: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 3,
  },
  section: {
    marginBottom: 6, // Reduced from 10 to 6 for tighter spacing
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1F2937',
    textTransform: 'uppercase',
    borderBottom: '1 solid #E5E7EB',
    paddingBottom: 3,
    marginBottom: 4, // Reduced from 6 to 4
    letterSpacing: 0.7,
  },
  summaryContainer: {
    marginBottom: 8, // Reduced from 10 to 8 for better spacing
  },
  summaryText: {
    fontSize: 10.2,
    lineHeight: 1.35,
    marginBottom: 3,
    color: '#374151',
    textAlign: 'justify'
  },
  competencyParagraph: {
    fontSize: 9.5,
    lineHeight: 1.4,
    color: '#374151',
    textAlign: 'justify',
    marginBottom: 3,
  },
  skillGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  skillGroupLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 6,
    marginTop: 2,
  },
  skillPill: {
    fontSize: 9,
    padding: '2 5',
    border: '1 solid #D1D5DB',
    borderRadius: 3,
    marginRight: 4,
    marginBottom: 4,
    color: '#374151',
  },
  skillPillHighlight: {
    fontSize: 9,
    padding: '2 5',
    border: '1 solid #2563EB',
    backgroundColor: '#DBEAFE',
    borderRadius: 3,
    marginRight: 4,
    marginBottom: 4,
    color: '#1E40AF',
    fontWeight: 'bold'
  },
  experienceItem: {
    marginBottom: 6, // Reduced from 8 to 6 for tighter spacing
  },
  jobTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  jobTitle: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    paddingRight: 6,
  },
  jobDates: {
    fontSize: 9,
    color: '#6B7280',
  },
  companyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  companyName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  jobLocation: {
    fontSize: 9,
    color: '#6B7280',
  },
  bulletContainer: {
    flexDirection: 'row',
    marginBottom: 2,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    width: 10,
    fontSize: 8,
    color: '#2563EB',
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    fontSize: 9.2,
    lineHeight: 1.28,
    color: '#2C3E50',
    textAlign: 'justify'
  },
  bulletMetric: {
    fontWeight: 'bold',
    color: '#0F3D7A'
  },
  educationItem: {
    marginBottom: 4, // Reduced from 6 to 4 for tighter spacing
  },
  degreeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  degree: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    paddingRight: 6,
  },
  graduationDate: {
    fontSize: 9,
    color: '#6B7280',
  },
  school: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 2,
  },
  educationDetails: {
    fontSize: 9.2,
    lineHeight: 1.25,
    color: '#2C3E50',
  },
  projectItem: {
    marginBottom: 6, // Reduced from 8 to 6 for tighter spacing
  },
  projectTitleLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  keyword: {
    backgroundColor: '#FEF9C3',
    color: '#92400E',
    fontWeight: 'bold'
  },
  educationBulletRow: {
    flexDirection: 'row',
    marginBottom: 2,
    alignItems: 'flex-start'
  },
  educationBulletMarker: {
    width: 10,
    fontSize: 7.5,
    color: '#2563EB',
    marginTop: 1
  },
  educationBulletText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.2,
    color: '#2C3E50'
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
  projectBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  projectBulletMarker: {
    width: 10,
    fontSize: 8,
    color: '#0F62FE',
    marginTop: 1,
  },
  projectBulletText: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 1.3,
    color: '#2C3E50',
    textAlign: 'justify',
  },
  projectTech: {
    fontSize: 9.2,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 3,
    paddingLeft: 2,
  },
  projectsContainer: {
    padding: 12,
    border: '2 solid #E5E7EB',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    marginBottom: 12, // Reduced from 16 to 12 for better spacing
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  projectsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F3D7A',
    marginBottom: 8,
    textTransform: 'uppercase',
    borderBottom: '2 solid #2563EB',
    paddingBottom: 4,
    letterSpacing: 1,
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 8,
    bottom: 18,
    right: 40,
    color: '#6B7280',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 10,
    borderTop: '1 solid #E5E7EB',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 7.5,
    color: '#6B7280',
  },
  twoColumnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  column: {
    flex: 1,
    flexDirection: 'column',
  },
  smallCaps: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: '#555',
    textTransform: 'uppercase',
  },

  // Technical Skills styles
  skillsGrid: {
    flexDirection: 'column',
    gap: 4,
  },
  skillItem: {
    fontSize: 11,
    lineHeight: 1.4,
    marginBottom: 2,
    color: '#374151',
  },

  // Core Competencies styles
  competenciesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  competencyItem: {
    fontSize: 9.5,
    color: '#1f2937',
    backgroundColor: '#e0f2fe',
    padding: '4 8',
    borderRadius: 3,
    marginRight: 6,
    marginBottom: 6,
    border: '1 solid #bae6fd',
    lineHeight: 1.4,
  },

  // Professional Experience styles
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  responsibilitySection: {
    marginBottom: 6,
  },
  responsibilityLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  responsibilityList: {
    marginLeft: 4,
  },
  responsibility: {
    fontSize: 11,
    lineHeight: 1.4,
    color: '#374151',
    marginLeft: 4,
    flex: 1,
  },
  achievementsList: {
    marginLeft: 4,
  },
  achievement: {
    fontSize: 11,
    lineHeight: 1.4,
    color: '#059669',
    marginLeft: 4,
    flex: 1,
    fontWeight: 'bold',
  },
  technologiesSection: {
    flexDirection: 'row',
    marginTop: 4,
  },
  technologiesLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  technologiesText: {
    fontSize: 11,
    color: '#6b7280',
    flex: 1,
  },

  // Education styles
  educationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  gpa: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
  },
  coursework: {
    flexDirection: 'row',
    marginTop: 4,
  },
  courseworkLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  courseworkText: {
    fontSize: 11,
    color: '#6b7280',
    flex: 1,
  },

  // Projects styles
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  projectDate: {
    fontSize: 9,
    color: '#6B7280',
  },
  projectAchievementsList: {
    marginLeft: 4,
    marginTop: 4,
  },
  projectAchievement: {
    fontSize: 11,
    lineHeight: 1.4,
    color: '#374151',
    marginLeft: 4,
    flex: 1,
  },
  projectTechnologies: {
    flexDirection: 'row',
    marginTop: 4,
  },
  projectTechLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  projectTechText: {
    fontSize: 11,
    color: '#6b7280',
    flex: 1,
  },

  // Certifications styles
  certificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottom: '1 solid #e5e7eb',
    paddingBottom: 4,
  },
  certificationInfo: {
    flex: 1,
  },
  certificationName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  certificationIssuer: {
    fontSize: 11,
    color: '#6b7280',
  },
  certificationDates: {
    alignItems: 'flex-end',
  },
  certificationIssued: {
    fontSize: 10,
    color: '#4b5563',
  },
  certificationExpires: {
    fontSize: 10,
    color: '#4b5563',
  },

  // Awards styles
  awardItem: {
    marginBottom: 8,
    borderBottom: '1 solid #e5e7eb',
    paddingBottom: 4,
  },
  awardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  awardName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  awardDate: {
    fontSize: 11,
    color: '#6b7280',
  },
  awardIssuer: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  awardDescription: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 1.4,
  },

  // Volunteer Experience styles
  volunteerItem: {
    marginBottom: 8,
    borderBottom: '1 solid #e5e7eb',
    paddingBottom: 4,
  },
  volunteerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  volunteerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  volunteerDate: {
    fontSize: 11,
    color: '#6b7280',
  },
  volunteerOrganization: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  volunteerDescription: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 1.4,
    marginBottom: 4,
  },
  volunteerAchievementsList: {
    marginLeft: 4,
  },
  volunteerAchievement: {
    fontSize: 11,
    lineHeight: 1.4,
    color: '#374151',
    marginLeft: 4,
    flex: 1,
  },
  placeholderText: {
    fontSize: 9,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 4,
  },
});

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

interface ParsedProject {
  name: string;
  title: string;
  description: string;
  achievements: string[];
  technologies: string;
  duration: string;
  bullets?: string[];
  techStack?: string;
}

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
        .replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/li>/gi, '\n\n'); // Use double newlines for paragraph breaks
    }
    return cleaned
      .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/[ \t]+/g, ' ') // Only replace spaces and tabs, preserve line breaks
      .replace(/\n[ \t]+/g, '\n') // Remove leading spaces from lines
      .replace(/[ \t]+\n/g, '\n') // Remove trailing spaces from lines
      .replace(/\n{3,}/g, '\n\n') // Replace 3+ consecutive newlines with double newlines
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
          // Clean up the extracted content while preserving paragraph structure
          return match[1]
            .trim()
            .replace(/\n{3,}/g, '\n\n') // Normalize multiple line breaks to double line breaks
            .replace(/^\s+|\s+$/gm, '') // Remove leading/trailing spaces from each line
            .replace(/\n\n+/g, '\n\n'); // Ensure consistent paragraph separation
        }
      }
    }
    return '';
  }

  extractEducation(): ParsedEducation[] {
    const educationEntries: ParsedEducation[] = [];
    const educationSectionMatch = this.rawHtml.match(/<h2[^>]*>\s*EDUCATION\s*<\/h2>([\s\S]*?)(?=<h2|<section|$)/i);

    if (!educationSectionMatch || !educationSectionMatch[1]) {
      return this.extractEducationFromText(); // Fallback to text parser
    }

    const educationHtml = educationSectionMatch[1];
    
    // Look for education entries in the HTML - they are usually in div blocks
    // Try to split by significant div breaks
    const entryBlocks = educationHtml.split(/<div[^>]*style="[^"]*margin-bottom:\s*18px[^"]*"[^>]*>/i)
      .filter(block => block.trim().length > 30);

    // If no style-based splits work, try splitting by degree patterns
    if (entryBlocks.length <= 1) {
      const rawText = this.cleanHTML(educationHtml);
      const degreePattern = /(B\.\s*Tech|Bachelor|Master|MBA|Ph\.?D|Associate|Certificate)/gi;
      const matches = Array.from(rawText.matchAll(new RegExp(degreePattern.source, 'gi')));
      
      if (matches.length > 1) {
        const blocks: string[] = [];
        let lastIndex = 0;
        matches.forEach((match, index) => {
          if (index > 0) {
            blocks.push(rawText.substring(lastIndex, match.index));
          }
          lastIndex = match.index || 0;
        });
        blocks.push(rawText.substring(lastIndex));
        
        // Process text-based blocks
        blocks.filter(block => block.trim().length > 20).forEach(block => {
          const entry = this.parseEducationBlock(block, true);
          if (entry) educationEntries.push(entry);
        });
        
        return educationEntries.length > 0 ? educationEntries : this.extractEducationFromText();
      }
    }

    // Process HTML blocks
    for (const block of entryBlocks) {
      const entry = this.parseEducationBlock(block, false);
      if (entry) educationEntries.push(entry);
    }

    return educationEntries.length > 0 ? educationEntries : this.extractEducationFromText();
  }

  private parseEducationBlock(block: string, isTextMode: boolean): ParsedEducation | null {
    let degree = '';
    let school = '';
    let graduationDate = '';
    let details = '';
    let gpa = '';
    let coursework: string[] = [];
    let honors: string[] = [];

    if (isTextMode) {
      // Parse text-based block
      const lines = block.split('\n').filter(line => line.trim());
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for degree in first few lines
        if (!degree && /(B\.\s*Tech|Bachelor|Master|MBA|Ph\.?D)/i.test(line)) {
          degree = line;
          // Check if date is on same line
          const dateMatch = line.match(/\b(Expected\s+)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})/i);
          if (dateMatch) graduationDate = dateMatch[0];
        }
        
        // Look for school/university
        else if (!school && /(University|Institute|College|School)/i.test(line)) {
          school = line;
        }
        
        // Look for date if not found yet
        else if (!graduationDate && /(Expected\s+)?\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i.test(line)) {
          graduationDate = line;
        }
        
        // Look for GPA
        else if (/GPA[:\s]+[\d.]+/i.test(line)) {
          const gpaMatch = line.match(/GPA[:\s]+([\d.]+)/i);
          if (gpaMatch) gpa = gpaMatch[1];
        }
        
        // Look for relevant coursework
        else if (/Relevant\s+Coursework[:\s]/i.test(line)) {
          const courseworkText = line.replace(/Relevant\s+Coursework[:\s]*/i, '');
          if (courseworkText) {
            coursework = courseworkText.split(/,|;/).map(c => c.trim()).filter(c => c.length > 0);
          }
          // Check next lines for more coursework
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim();
            if (/Honors|Award|Dean|GPA/i.test(nextLine)) break;
            if (nextLine && !/(University|Institute|College|School)/i.test(nextLine)) {
              coursework.push(...nextLine.split(/,|;/).map(c => c.trim()).filter(c => c.length > 0));
            } else {
              break;
            }
          }
        }
        
        // Look for honors
        else if (/Honors[:\s]/i.test(line)) {
          const honorsText = line.replace(/Honors[:\s]*/i, '');
          if (honorsText) {
            honors = honorsText.split(/,|;/).map(h => h.trim()).filter(h => h.length > 0);
          }
        }
      }
    } else {
      // Parse HTML block
      const degreeMatch = block.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
      if (degreeMatch) degree = this.cleanHTML(degreeMatch[1]);

      const dateMatch = block.match(/<span[^>]*color:\s*#6b7280[^>]*>([^<]+)<\/span>/i) || 
                       block.match(/<span[^>]*>([\s\S]*?)<\/span>/i);
      if (dateMatch) graduationDate = this.cleanHTML(dateMatch[1]);

      // Extract school name
      const schoolMatch = block.match(/<div[^>]*>([^<]*(?:University|Institute|College|School)[^<]*)<\/div>/i);
      if (schoolMatch) {
        school = this.cleanHTML(schoolMatch[1]);
      }

      // Extract GPA
      const gpaMatch = block.match(/GPA[:\s]+([\d.]+)/i);
      if (gpaMatch) gpa = gpaMatch[1];

      // Extract coursework
      const courseworkMatch = block.match(/Relevant\s+Coursework[:\s]*([^<\n]+)/i);
      if (courseworkMatch) {
        coursework = courseworkMatch[1].split(/,|;/).map(c => c.trim()).filter(c => c.length > 0);
      }

      // Extract honors
      const honorsMatch = block.match(/Honors[:\s]*([^<\n]+)/i);
      if (honorsMatch) {
        honors = honorsMatch[1].split(/,|;/).map(h => h.trim()).filter(h => h.length > 0);
      }

      // Get remaining text as details
      const otherText = block
        .replace(/<strong[^>]*>[\s\S]*?<\/strong>/gi, '')
        .replace(/<span[^>]*>[\s\S]*?<\/span>/gi, '')
        .replace(/<div[^>]*>[\s\S]*?<\/div>/gi, '');

      const cleanedDetails = this.cleanHTML(otherText).trim();
      if (cleanedDetails && !coursework.length && !honors.length) {
        details = cleanedDetails;
      }
    }

    // Build details string from components
    if (!details) {
      const detailParts: string[] = [];
      if (gpa) detailParts.push(`GPA: ${gpa}`);
      if (coursework.length > 0) detailParts.push(`Relevant Coursework: ${coursework.join(', ')}`);
      if (honors.length > 0) detailParts.push(`Honors: ${honors.join(', ')}`);
      details = detailParts.join('. ');
    }

    if (degree || school) {
      // Extract major from degree if possible
      let major = '';
      if (degree) {
        // Look for patterns like "B.Tech in Computer Science" or "Bachelor of Science in Accounting"
        const majorMatch = degree.match(/\b(?:in|of)\s+([^,]+)/i);
        if (majorMatch) {
          major = majorMatch[1].trim();
        } else if (degree.includes(',')) {
          // Handle patterns like "B.Tech in Computer Science, Specialization in Data Science"
          const parts = degree.split(',');
          if (parts.length > 1) {
            const firstPart = parts[0].trim();
            const majorMatch2 = firstPart.match(/\b(?:in|of)\s+(.+)/i);
            if (majorMatch2) {
              major = majorMatch2[1].trim();
              // Add specialization if available
              const specialization = parts[1].trim();
              if (specialization.toLowerCase().includes('specialization')) {
                major += `, ${specialization}`;
              }
            }
          }
        }
      }

      return {
        degree: degree || 'Degree',
        school: school || 'Institution',
        graduationDate: graduationDate || '',
        dates: graduationDate || '',
        major: major,
        details: details || '',
        gpa,
        coursework,
        honors
      };
    }

    return null;
  }

  extractEducationFromText(): ParsedEducation[] {
    const educationText = this.extractSection(['EDUCATION', 'ACADEMIC BACKGROUND']);
    if (!educationText) {
      // If no education section found, try to extract from the raw text directly
      const rawText = this.cleanHTML(this.rawHtml);
      const educationMatch = rawText.match(/EDUCATION([\s\S]*?)(?=PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|PROJECTS|KEY PROJECTS|SKILLS|$)/i);
      
      if (educationMatch) {
        return this.parseEducationText(educationMatch[1]);
      }
      return [];
    }

    return this.parseEducationText(educationText);
  }

  private parseEducationText(educationText: string): ParsedEducation[] {
    const entries: ParsedEducation[] = [];
    const lines = educationText.split('\n').filter(l => l.trim());
    
    let currentEntry: ParsedEducation | null = null;

    const flushEntry = () => {
      if (currentEntry) {
        // Extract major from degree
        let major = '';
        if (currentEntry.degree) {
          const majorMatch = currentEntry.degree.match(/\b(?:in|of)\s+([^,]+)/i);
          if (majorMatch) {
            major = majorMatch[1].trim();
            currentEntry.major = major;
          }
        }
        
        // Parse details for coursework and honors if not already extracted
        if (currentEntry.details && (!currentEntry.coursework || currentEntry.coursework.length === 0)) {
          const courseworkMatch = currentEntry.details.match(/Relevant\s+Coursework[:\s]*([^.]+)/i);
          if (courseworkMatch) {
            currentEntry.coursework = courseworkMatch[1].split(/,|;/).map(c => c.trim()).filter(c => c.length > 0);
          }
          
          const honorsMatch = currentEntry.details.match(/Honors[:\s]*([^.]+)/i);
          if (honorsMatch) {
            currentEntry.honors = honorsMatch[1].split(/,|;/).map(h => h.trim()).filter(h => h.length > 0);
          }
          
          const gpaMatch = currentEntry.details.match(/GPA[:\s]*([\d.]+)/i);
          if (gpaMatch) {
            currentEntry.gpa = gpaMatch[1];
          }
        }
        
        currentEntry.dates = currentEntry.graduationDate;
        entries.push(currentEntry);
      }
      currentEntry = null;
    };

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for degree patterns - more comprehensive
      if (/(B\.\s*Tech|Master|Bachelor|MBA|Ph\.?D|Associate|Certificate|Degree)/i.test(trimmedLine)) {
        flushEntry();
        
        // Extract date from degree line if present
        const dateMatch = trimmedLine.match(/\b(Expected\s+)?(May|June|Jan|Feb|Mar|Apr|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|\d{4}|\(\s*Expected\s*\)/i);
        
        currentEntry = {
          degree: trimmedLine.replace(dateMatch ? dateMatch[0] : '', '').trim(),
          school: '',
          graduationDate: dateMatch ? dateMatch[0] : '',
          dates: dateMatch ? dateMatch[0] : '',
          details: '',
          coursework: [],
          honors: []
        };
      } else if (currentEntry) {
        // Process lines for current entry
        if (!currentEntry.school && /(University|Institute|School|College)/i.test(trimmedLine)) {
          currentEntry.school = trimmedLine;
        } else if (!currentEntry.graduationDate && /(Expected\s+)?\d{4}|May|June|Jan|Feb|Mar|Apr|Jul|Aug|Sep|Oct|Nov|Dec/i.test(trimmedLine)) {
          currentEntry.graduationDate = trimmedLine;
          currentEntry.dates = trimmedLine;
        } else if (/Relevant\s+Coursework/i.test(trimmedLine)) {
          const courseworkText = trimmedLine.replace(/Relevant\s+Coursework[:\s]*/i, '');
          if (courseworkText) {
            currentEntry.coursework = courseworkText.split(/,|;/).map(c => c.trim()).filter(c => c.length > 0);
          }
        } else if (/Honors/i.test(trimmedLine)) {
          const honorsText = trimmedLine.replace(/Honors[:\s]*/i, '');
          if (honorsText) {
            currentEntry.honors = honorsText.split(/,|;/).map(h => h.trim()).filter(h => h.length > 0);
          }
        } else if (/GPA/i.test(trimmedLine)) {
          const gpaMatch = trimmedLine.match(/GPA[:\s]*([\d.]+)/i);
          if (gpaMatch) {
            currentEntry.gpa = gpaMatch[1];
          }
        } else {
          // Add to details
          currentEntry.details = `${currentEntry.details} ${trimmedLine}`.trim();
        }
      }
    }
    
    flushEntry();
    return entries;
  }

  extractExperience(): ParsedExperience[] {
    const experienceEntries: ParsedExperience[] = [];
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
      const achievements: string[] = [];
      let technologies_used: string[] = [];

      // Extract job title
      const titleMatch = block.match(/<h3[^>]*>([^<]+)<\/h3>/);
      if (titleMatch) title = this.cleanHTML(titleMatch[1]);

      // Extract dates
      const dateMatch = block.match(/<span[^>]*color:\s*#6b7280[^>]*>([^<]+)<\/span>/);
      if (dateMatch) dates = this.cleanHTML(dateMatch[1]);

      // Extract company name
      const companyMatch = block.match(/<span[^>]*color:\s*#4b5563[^>]*>([^<]+)<\/span>/);
      if (companyMatch) company = this.cleanHTML(companyMatch[1]);

      // Extract location
      const locationMatch = block.match(/<span[^>]*color:\s*#6b7280[^>]*>([^<]+)<\/span>/g);
      if (locationMatch && locationMatch.length > 1) {
        location = this.cleanHTML(locationMatch[1]);
      }

      // Extract "Key Responsibilities:" section
      const responsibilitiesSection = block.match(/Key Responsibilities:<\/strong>([\s\S]*?)(?=<strong>|<div style="margin-top|$)/i);
      if (responsibilitiesSection) {
        const respLiMatches = responsibilitiesSection[1].match(/<li[^>]*>([\s\S]*?)<\/li>/g);
        if (respLiMatches) {
          respLiMatches.forEach(li => {
            const respText = this.cleanHTML(li);
            if (respText && respText.trim().length > 0) {
              responsibilities.push(respText);
            }
          });
        }
      }

      // Extract "Key Achievements:" section - improved pattern matching
      const achievementsSection = block.match(/Key Achievements:<\/strong>([\s\S]*?)(?=<strong>Key |<strong>Technologies|<div style="margin-top|$)/i);
      if (achievementsSection) {
        const achLiMatches = achievementsSection[1].match(/<li[^>]*>([\s\S]*?)<\/li>/g);
        if (achLiMatches) {
          achLiMatches.forEach(li => {
            const achText = this.cleanHTML(li, { simple: true });
            if (achText && achText.trim().length > 0) {
              achievements.push(achText);
            }
          });
        }
      }

      // Extract technologies used
      const techMatch = block.match(/Technologies:<\/strong>\s*<span[^>]*>([\s\S]*?)<\/span>/i);
      if (techMatch) {
        const techText = this.cleanHTML(techMatch[1]);
        technologies_used = techText.split(/,\s*/).filter(t => t.length > 0);
      }

      // Fallback: If no structured sections found, extract all li elements
      if (responsibilities.length === 0 && achievements.length === 0) {
        const allLiMatches = block.match(/<li[^>]*>([\s\S]*?)<\/li>/g);
        if (allLiMatches) {
          allLiMatches.forEach(li => {
            const text = this.cleanHTML(li);
            if (text && text.trim().length > 0) {
              responsibilities.push(text);
            }
          });
        }
      }

      if (title && company) {
        experienceEntries.push({
          title,
          company,
          dates,
          location,
          responsibilities,
          achievements: achievements.length > 0 ? achievements : undefined,
          technologies_used: technologies_used.length > 0 ? technologies_used : undefined
        });
      }
    }

    return experienceEntries.length > 0 ? experienceEntries : this.extractExperienceFromText();
  }

  extractExperienceFromText(): ParsedExperience[] {
    const experienceText = this.extractSection(['PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE', 'EXPERIENCE']);
    if (!experienceText) return [];

    const entries: ParsedExperience[] = [];
    const lines = experienceText.split('\n').filter(l => l.trim());
    let currentEntry: ParsedExperience | null = null;

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

  extractProjects(): ParsedProject[] {
    const projectEntries: ParsedProject[] = [];
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

  extractProjectsFromText(): ParsedProject[] {
    const projectsText = this.extractSection(['KEY PROJECTS', 'PROJECTS']);
    if (!projectsText) return [];

    const entries: ParsedProject[] = [];
    const projectBlocks = projectsText.split(/(?=Smart Parking|Eco-Friendly|AI-Powered)/i);

    for (const block of projectBlocks) {
      if (block.trim().length < 20) continue;
      
      const lines = block.split('\n').filter(l => l.trim());
      if (lines.length === 0) continue;

      const title = lines[0].trim();
      const description = lines.find(l => l.length > 50 && !l.includes('•')) || '';
      const bullets = lines.filter(l => l.includes('•')).map(l => l.replace(/^[•-]\s*/, '').trim());

      entries.push({
        name: title,
        title,
        description,
        achievements: bullets.length > 0 ? bullets : [description],
        technologies: '',
        duration: 'Ongoing',
        bullets: bullets.length > 0 ? bullets : undefined,
        techStack: ''
      });
    }

    return entries;
  }

  extractSkills(): { technical: string[], soft: string[], tools: string[], all: string[] } {
    const skillsData = {
      technical: [] as string[],
      soft: [] as string[],
      tools: [] as string[],
      all: [] as string[]
    };

    // Extract Technical Skills section with detailed categories
    const techSkillsMatch = this.rawHtml.match(/<h2[^>]*>\s*TECHNICAL SKILLS\s*<\/h2>([\s\S]*?)(?=<h2|<section|$)/i);
    if (techSkillsMatch && techSkillsMatch[1]) {
      const techSkillsHtml = techSkillsMatch[1];
      
      // Try extracting structured skill categories (e.g., "Programming Languages: Python, Java")
      const categoryPattern = /<div[^>]*>([^:]+):\s*([^<]+)<\/div>/g;
      let categoryMatch;
      
      while ((categoryMatch = categoryPattern.exec(techSkillsHtml)) !== null) {
        const category = this.cleanHTML(categoryMatch[1]).trim();
        const skills = this.cleanHTML(categoryMatch[2]).trim();
        
        if (category && skills) {
          const fullSkill = `${category}: ${skills}`;
          skillsData.technical.push(fullSkill);
          skillsData.all.push(fullSkill);
        }
      }
      
      // If no structured categories found, try extracting skill spans
      if (skillsData.technical.length === 0) {
        const skillSpans = techSkillsHtml.match(/<span[^>]*background:\s*#f3f4f6[^>]*>([^<]+)<\/span>/g);
        
        if (skillSpans) {
          skillSpans.forEach(span => {
            const skillMatch = span.match(/<span[^>]*>([^<]+)<\/span>/);
            if (skillMatch) {
              const skillText = this.cleanHTML(skillMatch[1]);
              skillsData.technical.push(skillText);
              skillsData.all.push(skillText);
            }
          });
        }
      }
    }

    // Extract Core Competencies section  
    const competenciesMatch = this.rawHtml.match(/<h2[^>]*>\s*CORE COMPETENCIES\s*<\/h2>([\s\S]*?)(?=<h2|<section|$)/i);
    if (competenciesMatch && competenciesMatch[1]) {
      const competenciesHtml = competenciesMatch[1];
      const competencySpans = competenciesHtml.match(/<span[^>]*background:\s*#e0f2fe[^>]*>([^<]+)<\/span>/g);
      
      if (competencySpans) {
        competencySpans.forEach(span => {
          const competencyMatch = span.match(/<span[^>]*>([^<]+)<\/span>/);
          if (competencyMatch) {
            const competencyText = this.cleanHTML(competencyMatch[1]);
            skillsData.soft.push(competencyText);
            skillsData.all.push(competencyText);
          }
        });
      }
    }

    // Fallback to text-based extraction if HTML parsing fails
    if (skillsData.all.length === 0) {
      const skillsText = this.extractSection(['TECHNICAL SKILLS', 'SKILLS']);
      if (skillsText) {
        // Try to parse structured format (Category: skills)
        const lines = skillsText.split('\n').filter(l => l.trim());
        lines.forEach(line => {
          if (line.includes(':')) {
            skillsData.technical.push(line.trim());
            skillsData.all.push(line.trim());
          } else {
            const skills = line.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 2);
            skillsData.technical.push(...skills);
            skillsData.all.push(...skills);
          }
        });
      }
    }

    return skillsData;
  }

  extractCoreCompetencies(): string[] {
    console.log('🔍 Extracting core competencies...');
    
    // FIRST: Try to extract from HTML structure for most accurate results
    const competenciesSectionMatch = this.rawHtml.match(/<h2[^>]*>\s*CORE COMPETENCIES\s*<\/h2>([\s\S]*?)(?=<h2|<section|$)/i);
    
    if (competenciesSectionMatch) {
      const competenciesHtml = competenciesSectionMatch[1];
      console.log('📄 Found CORE COMPETENCIES HTML section, length:', competenciesHtml.length);
      console.log('📄 HTML Preview:', competenciesHtml.substring(0, 500));
      
      // Strategy 1: Extract from list items (most common in your HTML)
      const listItemMatches = competenciesHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
      if (listItemMatches && listItemMatches.length > 0) {
        const competencies = listItemMatches
          .map(li => {
            // Clean HTML and extract text content - preserve full descriptive text
            const cleaned = this.cleanHTML(li, { simple: true }).trim();
            return cleaned;
          })
          .filter(comp => comp.length > 15); // Accept reasonably long items
        
        if (competencies.length > 0) {
          console.log(`✅ Found ${competencies.length} competencies from list items:`, competencies);
          return competencies;
        }
      }
      
      // Strategy 2: Extract from div blocks - ACCEPT ALL (with or without colons)
      const divMatches = competenciesHtml.match(/<div[^>]*>([\s\S]*?)<\/div>/gi);
      if (divMatches && divMatches.length > 0) {
        const competencies = divMatches
          .map(div => {
            const cleaned = this.cleanHTML(div, { simple: true }).trim();
            return cleaned;
          })
          .filter(comp => {
            // Accept ANY competency with at least 15 characters
            return comp.length >= 15;
          });
        
        if (competencies.length > 0) {
          console.log(`✅ Found ${competencies.length} competencies from divs:`, competencies);
          return competencies;
        }
      }
      
      // Strategy 3: Extract from paragraph tags
      const pMatches = competenciesHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
      if (pMatches && pMatches.length > 0) {
        const competencies = pMatches
          .map(p => this.cleanHTML(p, { simple: true }).trim())
          .filter(comp => comp.length >= 15);
        
        if (competencies.length > 0) {
          console.log(`✅ Found ${competencies.length} competencies from paragraphs:`, competencies);
          return competencies;
        }
      }
      
      // Strategy 4: Extract from span tags (used in grid layout)
      const spanMatches = competenciesHtml.match(/<span[^>]*>([\s\S]*?)<\/span>/gi);
      if (spanMatches && spanMatches.length > 0) {
        console.log(`📦 Found ${spanMatches.length} span tags, checking content...`);
        const competencies = spanMatches
          .map(span => this.cleanHTML(span, { simple: true }).trim())
          .filter(comp => comp.length >= 15); // Filter out very short items
        
        if (competencies.length > 0) {
          console.log(`✅ Found ${competencies.length} competencies from spans:`, competencies);
          return competencies;
        }
      }
      
      // Strategy 5: If HTML extraction failed, try parsing the cleaned text from HTML
      const cleanedHtmlText = this.cleanHTML(competenciesHtml, { simple: true }).trim();
      console.log('� Cleaned HTML text, length:', cleanedHtmlText.length);
      console.log('� Cleaned text preview:', cleanedHtmlText.substring(0, 500));
      
      // Pattern A: Markdown format "**Name:** Description" - CHECK FIRST!
      const markdownPattern = /\*\*([^*]+)\*\*:\s*([^\*]+?)(?=\s*\*\*|$)/g;
      const markdownMatches = [];
      let match;
      
      while ((match = markdownPattern.exec(cleanedHtmlText)) !== null) {
        const competencyName = match[1].trim();
        const competencyDesc = match[2].trim().replace(/\s+/g, ' ');
        const fullCompetency = `${competencyName}: ${competencyDesc}`;
        markdownMatches.push(fullCompetency);
      }
      
      if (markdownMatches.length > 0) {
        console.log(`✅ Found ${markdownMatches.length} markdown competencies:`, markdownMatches);
        return markdownMatches;
      }
      
      // Pattern B: Plain format with colons
      const hyphenatedPattern = /([A-Z][a-zA-Z\-&\s()]+?):\s*([^:.]+?\.)/g;
      const hyphenatedMatches = [];
      
      while ((match = hyphenatedPattern.exec(cleanedHtmlText)) !== null) {
        const competencyName = match[1].trim();
        const competencyDesc = match[2].trim().replace(/\s+/g, ' ');
        const fullCompetency = `${competencyName}: ${competencyDesc}`;
        // Only accept if it has a reasonable description length
        if (competencyDesc.length > 20) {
          hyphenatedMatches.push(fullCompetency);
        }
      }
      
      if (hyphenatedMatches.length > 0) {
        console.log(`✅ Found ${hyphenatedMatches.length} hyphenated competencies from HTML text:`, hyphenatedMatches);
        return hyphenatedMatches;
      }
      
      // Pattern B: Simple competency names without descriptions (split by newlines)
      // This handles cases like:
      // "Analytical Problem-Solving\nData-Driven Decision Making\nProcess Optimization"
      const lines = cleanedHtmlText
        .split(/\n/)
        .map(line => line.trim())
        .filter(line => {
          // Accept lines that:
          // 1. Start with a capital letter
          // 2. Are at least 3 characters long
          // 3. Don't look like section headers (all caps with 8+ chars)
          return line.length >= 3 && 
                 /^[A-Z]/.test(line) && 
                 !(line === line.toUpperCase() && line.length >= 8);
        });
      
      if (lines.length > 0) {
        console.log(`✅ Found ${lines.length} line-separated competencies:`, lines);
        return lines;
      }
    }
    
    // FALLBACK: Return empty array
    console.log('⚠️ No competencies found using any strategy');
    return [];
  }

  extractCertifications(): Array<{name: string, issuer: string, issued: string, expires: string}> {
    const certificationsText = this.extractSection(['CERTIFICATIONS', 'CERTIFICATES', 'PROFESSIONAL CERTIFICATIONS']);
    
    if (certificationsText) {
      const certEntries = [];
      const certSectionMatch = this.rawHtml.match(/<h2[^>]*>\s*CERTIFICATIONS\s*<\/h2>([\s\S]*?)(?=<h2|<section|$)/i);
      
      if (certSectionMatch) {
        const certHtml = certSectionMatch[1];
        // More flexible regex: match div with style attribute containing margin-bottom: 8px
        const certBlocks = certHtml.split(/<div\s+style="[^"]*margin-bottom:\s*(?:8|10|12)px[^"]*">/i).filter(b => b.trim());
        
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
      
      // NO LIMIT - Return all certifications found
      if (certEntries.length > 0) {
        console.log(`✅ Found ${certEntries.length} certifications:`, certEntries);
        return certEntries;
      }
    }
    
    console.log('⚠️ No certifications found in HTML');
    return [];
    return [
      { name: 'Career Essentials in Data Analysis', issuer: 'Microsoft & LinkedIn', issued: 'August 2024', expires: 'N/A' },
      { name: 'Data Visualization Using Python', issuer: 'IBM', issued: 'May 2024', expires: 'N/A' },
      { name: 'Data Analytics Professional Certificate', issuer: 'Google', issued: 'October 2024', expires: 'N/A' }
    ];
  }

  extractAwards(): Array<{name: string, issuer: string, date: string, description: string}> {
    const awardsText = this.extractSection(['AWARDS', 'AWARDS & RECOGNITION', 'RECOGNITION', 'ACHIEVEMENTS']);
    
    if (awardsText) {
      const awardEntries = [];
      const awardSectionMatch = this.rawHtml.match(/<h2[^>]*>\s*AWARDS\s*(?:&|&amp;)?\s*RECOGNITION\s*<\/h2>([\s\S]*?)(?=<h2|<section|$)/i);
      
      if (awardSectionMatch) {
        const awardHtml = awardSectionMatch[1];
        
        // Try multiple splitting strategies
        // Strategy 1: Split by award item divs with margin-bottom
        let awardBlocks = awardHtml.split(/<div\s+style="[^"]*margin-bottom:\s*(?:8|10|12|15|18)px[^"]*">/i).filter(b => b.trim());
        
        // Strategy 2: If no blocks found, try splitting by strong tags (award names)
        if (awardBlocks.length <= 1) {
          const strongMatches = awardHtml.match(/<strong[^>]*>([^<]+)<\/strong>/gi);
          if (strongMatches && strongMatches.length > 1) {
            // Split by each strong tag
            awardBlocks = awardHtml.split(/(?=<strong[^>]*>)/i).filter(b => b.trim() && b.includes('<strong'));
          }
        }
        
        for (const block of awardBlocks) {
          const nameMatch = block.match(/<strong[^>]*>([^<]+)<\/strong>/i);
          
          if (nameMatch) {
            const awardName = this.cleanHTML(nameMatch[1]).trim();
            
            // Extract date - look for span tags or date patterns
            let date = '';
            const dateSpanMatch = block.match(/<span[^>]*color[^>]*>([^<]+)<\/span>/i);
            if (dateSpanMatch) {
              date = this.cleanHTML(dateSpanMatch[1]).trim();
            } else {
              // Try to find date pattern
              const datePatternMatch = block.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/i);
              if (datePatternMatch) {
                date = datePatternMatch[0];
              }
            }
            
            // Extract issuer - look for div tags
            let issuer = '';
            const issuerDivMatches = block.match(/<div[^>]*>([^<]+)<\/div>/gi);
            if (issuerDivMatches && issuerDivMatches.length > 0) {
              // Get the first div that's not the date
              for (const div of issuerDivMatches) {
                const issuerText = this.cleanHTML(div).trim();
                if (issuerText && issuerText !== date && !issuerText.includes('style=')) {
                  issuer = issuerText;
                  break;
                }
              }
            }
            
            // Extract description - look for p tags
            let description = '';
            const descMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
            if (descMatch) {
              description = this.cleanHTML(descMatch[1]).trim();
            }
            
            awardEntries.push({
              name: awardName,
              date: date,
              issuer: issuer,
              description: description
            });
          }
        }
      }
      
      // NO LIMIT - Return all awards found
      if (awardEntries.length > 0) {
        console.log(`✅ Found ${awardEntries.length} awards:`, awardEntries);
        return awardEntries;
      }
    }
    
    console.log('⚠️ No awards found in HTML');
    return [];
  }

  extractVolunteerExperience(): Array<{title: string, organization: string, date: string, description: string, achievements: string[]}> {
    const volunteerText = this.extractSection(['VOLUNTEER', 'VOLUNTEER EXPERIENCE', 'COMMUNITY SERVICE', 'VOLUNTEER WORK']);
    
    if (volunteerText) {
      const volunteerEntries = [];
      const volunteerSectionMatch = this.rawHtml.match(/<h2[^>]*>\s*VOLUNTEER\s*(?:EXPERIENCE|WORK)?\s*<\/h2>([\s\S]*?)(?=<h2|<section|$)/i);
      
      if (volunteerSectionMatch) {
        const volunteerHtml = volunteerSectionMatch[1];
        // More flexible regex: match div with various margin-bottom values
        let volunteerBlocks = volunteerHtml.split(/<div\s+style="[^"]*margin-bottom:\s*(?:8|10|12|15)px[^"]*">/i).filter(b => b.trim());
        
        // If no blocks found, try splitting by strong tags
        if (volunteerBlocks.length <= 1) {
          const strongMatches = volunteerHtml.match(/<strong[^>]*>([^<]+)<\/strong>/gi);
          if (strongMatches && strongMatches.length > 0) {
            volunteerBlocks = volunteerHtml.split(/(?=<strong[^>]*>)/i).filter(b => b.trim() && b.includes('<strong'));
          }
        }
        
        for (const block of volunteerBlocks) {
          const titleMatch = block.match(/<strong[^>]*>([^<]+)<\/strong>/i);
          
          if (titleMatch) {
            const title = this.cleanHTML(titleMatch[1]).trim();
            
            // Extract date
            let date = '';
            const dateSpanMatch = block.match(/<span[^>]*color[^>]*>([^<]+)<\/span>/i);
            if (dateSpanMatch) {
              date = this.cleanHTML(dateSpanMatch[1]).trim();
            }
            
            // Extract organization
            let organization = '';
            const orgDivMatches = block.match(/<div[^>]*>([^<]+)<\/div>/gi);
            if (orgDivMatches && orgDivMatches.length > 0) {
              for (const div of orgDivMatches) {
                const orgText = this.cleanHTML(div).trim();
                if (orgText && orgText !== date && !orgText.includes('style=')) {
                  organization = orgText;
                  break;
                }
              }
            }
            
            // Extract description
            let description = '';
            const descMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
            if (descMatch) {
              description = this.cleanHTML(descMatch[1]).trim();
            }
            
            // Extract achievements
            const achievements = [];
            const achievementMatches = block.match(/<ul[^>]*>([\s\S]*?)<\/ul>/i);
            if (achievementMatches) {
              const liMatches = achievementMatches[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
              if (liMatches) {
                achievements.push(...liMatches.map(li => this.cleanHTML(li).trim()).filter(a => a.length > 0));
              }
            }
            
            volunteerEntries.push({
              title: title,
              date: date,
              organization: organization,
              description: description,
              achievements: achievements
            });
          }
        }
      }
      
      // NO LIMIT - Return all volunteer entries
      if (volunteerEntries.length > 0) {
        console.log(`✅ Found ${volunteerEntries.length} volunteer entries:`, volunteerEntries);
        return volunteerEntries;
      }
    }
    
    console.log('⚠️ No volunteer experience found in HTML');
    return [];
  }
}

interface PerfectPDFProps {
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

const PerfectHTMLToPDF: React.FC<PerfectPDFProps> = ({
  htmlContent,
  profile,
  jobKeywords = [],
  twoColumnSkills: _twoColumnSkills = true,
  emphasizeMetrics = true,
  simpleMode = false,
  maxProjects: _maxProjects = 3,
  maxProjectBullets: _maxProjectBullets = 5,
  locale = 'en-US',
  projectKeywordHighlight = true,
  allowSecondPage: _allowSecondPage = true,
  projectsFirst: _projectsFirst = false,
  educationBulletize: _educationBulletize = true
}) => {

  let professionalSummary = '';
  let experience: ParsedExperience[] = [];
  let education: ParsedEducation[] = [];
  let projects: ParsedProject[] = [];
  let skillBuckets = {
    technical: [] as string[],
    soft: [] as string[],
    tools: [] as string[],
    all: [] as string[]
  };
  let coreCompetencies: string[] = [];
  let certificationsData: Array<{name: string, issuer: string, issued: string, expires: string}> = [];
  let awardsData: Array<{name: string, issuer: string, date: string, description: string}> = [];
  let volunteerData: Array<{title: string, organization: string, date: string, description: string, achievements: string[]}> = [];

  if (!simpleMode) {
    try {
      const parser = new ResumeContentParser(htmlContent);
      professionalSummary = parser.extractSection(['PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE']);
      education = parser.extractEducation();
      experience = parser.extractExperience();
      projects = parser.extractProjects();
      skillBuckets = parser.extractSkills();
      coreCompetencies = parser.extractCoreCompetencies();
      console.log('📊 Core competencies extracted:', coreCompetencies.length, 'items:', coreCompetencies);
      certificationsData = parser.extractCertifications();
      awardsData = parser.extractAwards();
      volunteerData = parser.extractVolunteerExperience();
    } catch (error) {
      console.error('Error parsing resume content:', error);
      simpleMode = true;
    }
  }

  const prioritizeSkills = (skillsList: string[]): string[] => {
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
    return [...priority, ...regular];
  };

  const dedupedSkills = dedupeSkills(skillBuckets.all);
  const prioritizedSkills = prioritizeSkills(dedupedSkills);

  const highlightMetrics = (text: string) => {
    if (!emphasizeMetrics) return text;
    return text.replace(/(\b\d{1,3}(?:[,\d]{3})*(?:%|\+|x)?\b)/g, m => `【${m}】`);
  };

  const highlightKeywords = (text: string) => {
    if (!projectKeywordHighlight || !jobKeywords.length) return text;
    const escaped = jobKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean);
    if (!escaped.length) return text;
    const regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'ig');
    return text.replace(regex, m => `«${m}»`);
  };

  const fallbackExperience = experience;

  const fallbackEducation = education.length > 0 ? education : 
    profile.education && profile.education.length > 0 ? 
      profile.education.map(edu => ({
        degree: edu.degree,
        school: edu.institution,
        graduationDate: edu.graduationYear,
        details: `Completed comprehensive academic program with focus on practical applications.`,
        dates: edu.graduationYear,
        major: edu.degree.split(' in ')[1] || edu.degree.split(',')[0] || '',
        gpa: undefined,
        coursework: [],
        honors: []
      })) : [];

  const fallbackProjects = projects;

  const renderBulletSegments = (text: string) => {
    const processed = highlightKeywords(highlightMetrics(text));
    const segments = processed.split(/(【[^】]+】|«[^»]+»)/g).filter(Boolean).map(seg => ({
      text: seg.replace(/[【】«»]/g, ''),
      metric: seg.startsWith('【') && seg.endsWith('】'),
      keyword: seg.startsWith('«') && seg.endsWith('»')
    }));
    return (
      <Text style={styles.bulletText}>
        {segments.map((s, i) => {
          let appliedStyle = undefined;
          if (s.metric) appliedStyle = styles.bulletMetric;
          else if (s.keyword) appliedStyle = styles.keyword;
          return <Text key={i} style={appliedStyle}>{s.text}</Text>;
        })}
      </Text>
    );
  };

  const normalizeDateRange = (dates: string): string => {
    if (!dates) return '';
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12'
    };
    const parts = dates.split(/[-–—]|to/i).map(p => p.trim());
    const fmt = (p: string) => {
      const m = p.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{4})/i);
      if (m) {
        const month = monthMap[m[1].toLowerCase()];
        const iso = `${m[2]}-${month}-01`;
        try {
          return new Date(iso).toLocaleDateString(locale, {
            month: 'short',
            year: 'numeric'
          });
        } catch {
          return p;
        }
      }
      const y = p.match(/\b(19|20)\d{2}\b/);
      if (y) return y[0];
      if (/present|current/i.test(p)) return 'Present';
      return p;
    };
    if (parts.length === 2) return `${fmt(parts[0])} – ${fmt(parts[1])}`;
    return parts.map(fmt).join(' – ');
  };

  const safeExperience = fallbackExperience.map(exp => {
    const processedBullets = postProcessExperienceBullets(exp.responsibilities, {
        jobKeywords,
        enforceQuantification: true
      })
      .slice(0, 6)
      .map(b => highlightKeywords(highlightMetrics(b)));
    
    // IMPORTANT: Preserve ALL extracted data including achievements and technologies
    return {
      ...exp, // Keep all original fields (achievements, technologies_used, etc.)
      dates: normalizeDateRange(exp.dates),
      responsibilities: processedBullets,
      // Explicitly preserve these fields with keyword highlighting if they exist
      achievements: exp.achievements?.map(a => highlightKeywords(highlightMetrics(a))),
      technologies_used: exp.technologies_used // Pass through as-is
    };
  });

  const safeEducation = fallbackEducation;
  const safeProjects = fallbackProjects;

  // Header section matching HTML exactly
  const headerSection = (
    <View style={styles.header} key="header">
      <Text style={styles.name}>{profile.fullName || 'Professional Name'}</Text>
      <View style={styles.contactLine}>
        <Text style={styles.contactInfo}>
          {profile.email || 'email@example.com'}
          {profile.phone && ` • ${profile.phone}`}
          {profile.location && ` • ${profile.location}`}
        </Text>
      </View>
    </View>
  );

  // Professional Summary section matching HTML exactly
  const summarySection = (
    <View style={styles.summaryContainer} key="summary">
      <Text style={styles.sectionTitle}>PROFESSIONAL SUMMARY</Text>
      {professionalSummary ? (
        professionalSummary.split('\n\n')
          .filter(p => p && p.trim().length > 0) // Filter empty paragraphs
          .map((paragraph, index) => (
            <Text key={index} style={styles.summaryText}>
              {paragraph.trim()}
            </Text>
          ))
      ) : (
        <Text style={styles.summaryText}>
          A highly motivated and analytical Computer Science student specializing in Data Science, bringing hands-on experience in extracting actionable insights and developing robust software solutions. Proficient in Python, SQL, and various machine learning techniques, with a proven ability to design and implement end-to-end technical solutions. Demonstrated capacity for problem-solving, process optimization, and delivering quantifiable results in fast-paced environments.
        </Text>
      )}
    </View>
  );

  // Technical Skills section matching HTML grid layout exactly - now dynamic
  const technicalSkillsSection = skillBuckets.technical.length > 0 && (
    <View style={styles.section} key="technical-skills">
      <Text style={styles.sectionTitle}>TECHNICAL SKILLS</Text>
      <View style={styles.skillsGrid}>
        {skillBuckets.technical.map((skill, index) => (
          <Text key={index} style={styles.skillItem}>{skill}</Text>
        ))}
      </View>
    </View>
  );

  // Core Competencies section - Display as bullet points
  const coreCompetenciesSection = coreCompetencies.length > 0 && (
    <View style={styles.section} key="core-competencies">
      <Text style={styles.sectionTitle}>CORE COMPETENCIES</Text>
      {coreCompetencies
        .flatMap(competency => {
          // Ensure competency is a valid non-empty string
          if (!competency || typeof competency !== 'string') {
            console.log('⚠️ Skipping invalid competency:', competency);
            return [];
          }
          const trimmed = competency.trim();
          
          // PRIORITY: Check for **Name:** pattern (markdown bold with colon)
          // This matches patterns like "**Project Leadership:** description text"
          const markdownBoldPattern = /\*\*([^*]+?)\*\*:\s*([^*]+?)(?=\s*\*\*|$)/g;
          const markdownMatches = [];
          let match;
          
          while ((match = markdownBoldPattern.exec(trimmed)) !== null) {
            const competencyName = match[1].trim();
            const competencyDesc = match[2].trim().replace(/\s+/g, ' ');
            const fullCompetency = `${competencyName}: ${competencyDesc}`;
            markdownMatches.push(fullCompetency);
          }
          
          if (markdownMatches.length > 0) {
            console.log(`✅ Extracted ${markdownMatches.length} markdown-formatted competencies`);
            return markdownMatches;
          }
          
          // If this is a very long competency (likely a paragraph), split it intelligently
          if (trimmed.length > 200) {
            console.log('📝 Long competency detected, attempting to split:', trimmed.substring(0, 100));
            
            // Try splitting by periods followed by capital letters (sentence boundaries)
            const sentences = trimmed.split(/\.\s+(?=[A-Z])/).map(s => s.trim()).filter(s => s.length > 15);
            if (sentences.length > 1) {
              console.log(`✂️ Split into ${sentences.length} sentences`);
              return sentences.map(s => s.endsWith('.') ? s : s + '.');
            }
            
            // Try splitting by common separators
            const parts = trimmed.split(/[;•·]\s*/).map(s => s.trim()).filter(s => s.length > 15);
            if (parts.length > 1) {
              console.log(`✂️ Split into ${parts.length} parts`);
              return parts;
            }
            
            // If can't split, return as-is but it will be formatted better
            return [trimmed];
          }
          
          if (trimmed.length < 10) {
            console.log('⚠️ Skipping short competency:', trimmed);
            return [];
          }
          return [trimmed];
        })
        .filter((comp): comp is string => comp !== null && comp.length > 0)
        .map((competency, index) => (
          <View key={index} style={styles.bulletContainer}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.bulletText}>{competency}</Text>
          </View>
        ))}
    </View>
  );

  // Education section matching HTML exactly
  const educationSection = safeEducation.length > 0 && (
    <View style={styles.section} key="education">
      <Text style={styles.sectionTitle}>EDUCATION</Text>
      {safeEducation.map((edu, index) => (
        <View key={index} style={styles.educationItem}>
          <View style={styles.educationHeader}>
            <Text style={styles.degree}>
              {edu.major ? `${edu.degree} in ${edu.major}` : edu.degree}
            </Text>
            <Text style={styles.graduationDate}>{edu.dates || edu.graduationDate}</Text>
          </View>
          <Text style={styles.school}>{edu.school}</Text>
          {edu.gpa && <Text style={styles.gpa}>GPA: {edu.gpa}</Text>}
          
          {/* Relevant Coursework */}
          {edu.coursework && edu.coursework.length > 0 && (
            <View style={styles.coursework}>
              <Text style={styles.courseworkLabel}>Relevant Coursework:</Text>
              <Text style={styles.courseworkText}> {Array.isArray(edu.coursework) ? edu.coursework.join(', ') : edu.coursework}</Text>
            </View>
          )}
          
          {/* Honors */}
          {edu.honors && edu.honors.length > 0 && (
            <View style={styles.coursework}>
              <Text style={styles.courseworkLabel}>Honors:</Text>
              <Text style={styles.courseworkText}> {Array.isArray(edu.honors) ? edu.honors.join(', ') : edu.honors}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  // Key Projects section matching HTML exactly  
  const keyProjectsSection = (
    <View style={styles.section} key="key-projects">
      <Text style={styles.sectionTitle}>KEY PROJECTS</Text>
      {safeProjects.map((project, index) => (
        <View key={index} style={styles.projectItem}>
          <View style={styles.projectHeader}>
            <Text style={styles.projectTitle}>{project.name || project.title}</Text>
            <Text style={styles.projectDate}>{project.duration || '2024'}</Text>
          </View>
          <Text style={styles.projectDescription}>{project.description}</Text>
          
          {/* Project Achievements */}
          {project.achievements && project.achievements.length > 0 && (
            <View style={styles.projectAchievementsList}>
              {project.achievements
                .filter((achievement: string) => achievement && achievement.trim().length > 0) // Filter empty achievements
                .map((achievement: string, achIndex: number) => (
                  <View key={achIndex} style={styles.bulletContainer}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.projectAchievement}>{achievement}</Text>
                  </View>
                ))}
            </View>
          )}

          {/* Technologies */}
          {project.technologies && (
            <View style={styles.projectTechnologies}>
              <Text style={styles.projectTechLabel}>Technologies:</Text>
              <Text style={styles.projectTechText}> {project.technologies || project.techStack}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  // Certifications section matching HTML exactly
  const certificationsSection = certificationsData.length > 0 && (
    <View style={styles.section} key="certifications">
      <Text style={styles.sectionTitle}>CERTIFICATIONS</Text>
      {certificationsData.map((cert, index) => (
        <View key={index} style={styles.certificationItem}>
          <View style={styles.certificationInfo}>
            <Text style={styles.certificationName}>{cert.name}</Text>
            <Text style={styles.certificationIssuer}>{cert.issuer}</Text>
          </View>
          <View style={styles.certificationDates}>
            <Text style={styles.certificationIssued}>Issued: {cert.issued}</Text>
            <Text style={styles.certificationExpires}>Expires: {cert.expires}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  // Awards & Recognition section - ALWAYS SHOW (even if empty)
  const awardsSection = (
    <View style={styles.section} key="awards">
      <Text style={styles.sectionTitle}>AWARDS & RECOGNITION</Text>
      {awardsData.length > 0 ? (
        awardsData.map((award, index) => (
          <View key={index} style={styles.awardItem}>
            <View style={styles.awardHeader}>
              <Text style={styles.awardName}>{award.name}</Text>
              <Text style={styles.awardDate}>{award.date}</Text>
            </View>
            <Text style={styles.awardIssuer}>{award.issuer}</Text>
            {award.description && (
              <Text style={styles.awardDescription}>{award.description}</Text>
            )}
          </View>
        ))
      ) : (
        <Text style={styles.placeholderText}>
          Add your awards, honors, and recognitions here to showcase your achievements.
        </Text>
      )}
    </View>
  );

  // Volunteer Experience section matching HTML exactly
  const volunteerSection = volunteerData.length > 0 && (
    <View style={styles.section} key="volunteer">
      <Text style={styles.sectionTitle}>VOLUNTEER EXPERIENCE</Text>
      {volunteerData.map((volunteer, index) => (
        <View key={index} style={styles.volunteerItem}>
          <View style={styles.volunteerHeader}>
            <Text style={styles.volunteerTitle}>{volunteer.title}</Text>
            <Text style={styles.volunteerDate}>{volunteer.date}</Text>
          </View>
          <Text style={styles.volunteerOrganization}>{volunteer.organization}</Text>
          <Text style={styles.volunteerDescription}>{volunteer.description}</Text>
          
          {/* Volunteer Achievements */}
          {volunteer.achievements && volunteer.achievements.length > 0 && (
            <View style={styles.volunteerAchievementsList}>
              {volunteer.achievements
                .filter((achievement: string) => achievement && achievement.trim().length > 0) // Filter empty achievements
                .map((achievement: string, achIndex: number) => (
                  <View key={achIndex} style={styles.bulletContainer}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.volunteerAchievement}>{achievement}</Text>
                  </View>
                ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );

  const experienceSection = !simpleMode && safeExperience.length > 0 && (
    <View key="experience" style={styles.section}>
      <Text style={styles.sectionTitle}>PROFESSIONAL EXPERIENCE</Text>
      {safeExperience.map((exp, index) => (
        <View key={index} style={styles.experienceItem}>
          <View style={styles.jobTitleRow}>
            <Text style={styles.jobTitle}>{exp.title}</Text>
            <Text style={styles.jobDates}>{exp.dates}</Text>
          </View>
          <View style={styles.companyRow}>
            <Text style={styles.companyName}>{exp.company}</Text>
            {exp.location && <Text style={styles.jobLocation}>{exp.location}</Text>}
          </View>
          
          {/* Key Responsibilities Section */}
          {exp.responsibilities && exp.responsibilities.length > 0 && (
            <View style={styles.responsibilitySection}>
              <Text style={styles.responsibilityLabel}>Key Responsibilities:</Text>
              <View style={styles.responsibilityList}>
                {exp.responsibilities
                  .filter((resp: string) => resp && resp.trim().length > 0)
                  .map((resp: string, respIndex: number) => (
                    <View key={respIndex} style={styles.bulletContainer}>
                      <Text style={styles.bulletPoint}>•</Text>
                      {renderBulletSegments(resp)}
                    </View>
                  ))}
              </View>
            </View>
          )}
          
          {/* Key Achievements Section */}
          {exp.achievements && exp.achievements.length > 0 && (
            <View style={styles.responsibilitySection}>
              <Text style={styles.responsibilityLabel}>Key Achievements:</Text>
              <View style={styles.achievementsList}>
                {exp.achievements
                  .filter((ach: string) => ach && ach.trim().length > 0)
                  .map((ach: string, achIndex: number) => (
                    <View key={achIndex} style={styles.bulletContainer}>
                      <Text style={styles.bulletPoint}>•</Text>
                      <Text style={styles.achievement}>{ach}</Text>
                    </View>
                  ))}
              </View>
            </View>
          )}
          
          {/* Technologies Used Section */}
          {exp.technologies_used && (
            <View style={styles.technologiesSection}>
              <Text style={styles.technologiesLabel}>Technologies: </Text>
              <Text style={styles.technologiesText}>
                {Array.isArray(exp.technologies_used) 
                  ? exp.technologies_used.join(', ') 
                  : exp.technologies_used}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  // Build the document sections in order
  const doc = (
    <Document>
      <Page size="A4" style={styles.page} key={0} wrap>
        {headerSection}
        {summarySection}
        {technicalSkillsSection}
        {coreCompetenciesSection}
        {experienceSection}
        {educationSection}
        {keyProjectsSection}
        {certificationsSection}
        {awardsSection}
        {volunteerSection}
        <Text style={styles.pageNumber}>1</Text>
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ATS-Optimized Resume•Tailored for Professional Excellence•{new Date().toLocaleDateString()}
          </Text>
        </View>
      </Page>
    </Document>
  );
  return doc;
};

interface ResumeTemplateProps {
  profile: UserProfileData;
  resumeHtml: string;
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

const ResumeTemplate: React.FC<ResumeTemplateProps> = ({
  profile,
  resumeHtml,
  jobKeywords,
  twoColumnSkills,
  emphasizeMetrics,
  simpleMode,
  maxProjects,
  maxProjectBullets,
  locale,
  projectKeywordHighlight,
  allowSecondPage,
  projectsFirst,
  educationBulletize
}) => (
  <PerfectHTMLToPDF
    htmlContent={resumeHtml}
    profile={profile}
    jobKeywords={jobKeywords}
    twoColumnSkills={twoColumnSkills}
    emphasizeMetrics={emphasizeMetrics}
    simpleMode={simpleMode}
    maxProjects={maxProjects}
    maxProjectBullets={maxProjectBullets}
    locale={locale}
    projectKeywordHighlight={projectKeywordHighlight}
    allowSecondPage={allowSecondPage}
    projectsFirst={projectsFirst}
    educationBulletize={educationBulletize}
  />
);

export default ResumeTemplate;
export { PerfectHTMLToPDF };

