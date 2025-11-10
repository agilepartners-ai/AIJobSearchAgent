"use client";
// eslint-disable-next-line
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, FileText, CheckCircle, Target, TrendingUp, Award, Brain, ChevronDown, ChevronUp, AlertCircle, Eye } from 'lucide-react';
import { PDFViewer, PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

import { PerfectHTMLToPDF } from './ResumeTemplate';
import ResumePDFPreview from './ResumePDFPreview';
import { getCleanHTMLForDocs } from './HTMLResumeTemplate';
import { UserProfileData } from '../../services/profileService';
import { ProfileService } from '../../services/profileService';
import { AuthService } from '../../services/authService';

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
  onRegenerate?: (customPrompt: string) => void;
}

// PDF Styles with tighter spacing
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20, // Reduced padding
    fontFamily: 'Helvetica',
    fontSize: 10, // Smaller base font
    lineHeight: 1.2, // Tighter line height
  },
  header: {
    marginBottom: 15, // Reduced margin
    borderBottom: '1 solid #2563eb',
    paddingBottom: 8,
  },
  name: {
    fontSize: 18, // Reduced from 24
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 3, // Reduced margin
    lineHeight: 1.1,
  },
  title: {
    fontSize: 12, // Reduced from 16
    color: '#2563eb',
    fontWeight: 'bold',
    marginBottom: 6, // Reduced margin
    lineHeight: 1.1,
  },
  contactInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9, // Reduced from 10
    color: '#6b7280',
    lineHeight: 1.1,
  },
  section: {
    marginBottom: 10, // Reduced from 15
  },
  sectionTitle: {
    fontSize: 11, // Reduced from 14
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4, // Reduced from 8
    borderLeft: '2 solid #2563eb',
    paddingLeft: 6, // Reduced from 8
    lineHeight: 1.1,
  },
  text: {
    fontSize: 9, // Reduced from 10
    lineHeight: 1.3, // Tighter line height
    color: '#374151',
    marginBottom: 2, // Reduced from 5
  },
  bulletPoint: {
    fontSize: 10,
    lineHeight: 1.4,
    color: '#000000',
    marginLeft: 12,
    marginBottom: 2,
  },
  compactSection: {
    marginBottom: 8, // Even more compact for certain sections
  },
  smallText: {
    fontSize: 8,
    lineHeight: 1.2,
    color: '#6b7280',
    marginBottom: 1,
  },
  skillBox: {
    backgroundColor: '#f3f4f6',
    padding: '4 8',
    borderRadius: 4,
    fontSize: 10,
    color: '#000000',
    border: '1 solid #e5e7eb',
    margin: '2 2 2 0',
  },
  competencyBox: {
    backgroundColor: '#e0f2fe',
    padding: '4 8',
    borderRadius: 4,
    fontSize: 10,
    color: '#000000',
    border: '1 solid #b3e5fc',
    margin: '2 2 2 0',
  },
  sectionItem: {
    marginBottom: 8,
  },
  flexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  flexWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  }
});


// Cover Letter PDF Document Component with reliable HTML parsing
const CoverLetterPDFDocument: React.FC<{ content: string; jobDetails: any; resultsData?: any }> = ({ content, jobDetails, resultsData }) => {
  // Parse HTML content to extract cover letter data
  const parseCoverLetterData = (htmlContent: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    // Extract name from h1 tag
    const nameElement = tempDiv.querySelector('h1');
    const name = nameElement?.textContent?.trim() || 'Your Name';

    // Extract contact info from the content
    const text = tempDiv.textContent || '';
    const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const phoneMatch = text.match(/(\+?\d[\d\-\s]{6,}\d)/);
    const locationMatch = text.match(/\b[A-Z][a-z]+,\s*[A-Z]{2,}|\b(?:(City|State|India|USA|United Kingdom))\b/i);

    const email = emailMatch?.[0] || 'email@example.com';
    const phone = phoneMatch?.[0] || '';
    const location = locationMatch?.[0] || '';

    const contactInfo = [email, phone, location].filter(Boolean).join(' • ');

    // Extract paragraphs - look for div elements with substantial content
    const allDivs = Array.from(tempDiv.querySelectorAll('div'));
    const paragraphs = allDivs
      .filter(div => {
        const text = div.textContent?.trim() || '';
        return text.length > 20 && // Substantial content
               !div.querySelector('h1') && // Not the header
               !text.includes('Hiring Manager') && // Not employer info
               !text.includes('Re:') && // Not subject line
               !text.includes('Dear') && // Not salutation
               !text.includes('Sincerely'); // Not closing
      })
      .map(div => div.textContent?.trim())
      .filter(Boolean) as string[];

    return {
      name,
      contactInfo,
      paragraphs
    };
  };

  const coverLetterData = parseCoverLetterData(content);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{coverLetterData.name}</Text>
          <Text style={styles.contactInfo}>{coverLetterData.contactInfo}</Text>
        </View>

        {/* Date */}
        <View style={{ marginBottom: 20, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 11, color: '#000000' }}>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
        </View>

        {/* Employer Information */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 11, lineHeight: 1.4, color: '#000000' }}>
            Hiring Manager
          </Text>
          <Text style={{ fontSize: 11, lineHeight: 1.4, color: '#000000' }}>
            {jobDetails.company_name || 'Company Name'}
          </Text>
          <Text style={{ fontSize: 11, lineHeight: 1.4, color: '#000000' }}>
            {jobDetails.location || 'Company Location'}
          </Text>
        </View>

        {/* Subject Line */}
        <View style={{ marginBottom: 15 }}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#000000' }}>
            Re: Application for {jobDetails.position || 'Position Title'}
          </Text>
        </View>

        {/* Salutation */}
        <View style={{ marginBottom: 15 }}>
          <Text style={{ fontSize: 11, color: '#000000' }}>Dear Hiring Manager,</Text>
        </View>

        {/* Body Paragraphs */}
        {coverLetterData.paragraphs.map((paragraph: string, index: number) => (
          <View key={index} style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 11, lineHeight: 1.6, textAlign: 'justify', color: '#000000' }}>
              {paragraph}
            </Text>
          </View>
        ))}

        {/* Closing */}
        <View style={{ marginBottom: 15 }}>
          <Text style={{ fontSize: 11, color: '#000000' }}>Sincerely,</Text>
        </View>

        <View style={{ marginBottom: 15 }}>
          <Text style={{ fontSize: 11, color: '#000000' }}>{coverLetterData.name}</Text>
        </View>

        {/* Footer */}
        <View style={{ marginTop: 30, paddingTop: 15, borderTop: '1 solid #e5e7eb', alignItems: 'center' }}>
          <Text style={{ fontSize: 9, color: '#000000' }}>
            This cover letter was AI-enhanced and personalized for the {jobDetails.position || 'target position'} at {jobDetails.company_name || 'the company'}.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

// eslint-disable-next-line max-lines-per-function
const OptimizationResults: React.FC<OptimizationResultsProps> = ({ results, jobDetails, analysisData, onBack, onRegenerate }) => {
  const [activeDocument, setActiveDocument] = useState<'resume' | 'cover-letter'>('resume');
  const [showPDFPreview, setShowPDFPreview] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [showPromptSection, setShowPromptSection] = useState(true); // Expanded by default

  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        if (currentUser) {
          const profile = await ProfileService.getUserProfile(currentUser.id);
          if (profile) {
            setUserProfile(profile);
          } else {
            // If no profile exists, create a basic one from auth data
            setUserProfile({
              fullName: currentUser.displayName || 'Professional Name',
              email: currentUser.email || '',
              phone: '',
              location: '',
              linkedin: '',
              github: '',
              portfolio: ''
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to extracted profile if service fails
        setUserProfile(extractProfileFromHtml(results.resume_html));
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [results.resume_html]);

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

  const downloadAsHtml = (content: string, filename: string) => {
    try {
      const html = content || '';
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.endsWith('.html') ? filename : filename + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download HTML file:', error);
    }
  };

  // 🚀 NEW: Powerful DOCX generation using PDF-style parsing approach
  const downloadAsDocxPowerful = async (profile: UserProfileData | any, jobKeywords: string[] = [], filename: string) => {
    console.log('[OptimizationResults] downloadAsDocxPowerful called (PDF-style), filename=', filename);
    console.log('[OptimizationResults] Profile data received:', profile);
    
    try {
      // Use the same HTML content that PDF uses
      const htmlContent = activeDocument === 'resume' ? modifiedResumeHtml : modifiedCoverLetterHtml;
      console.log('[OptimizationResults] Using HTML content length:', htmlContent.length);
      console.log('[OptimizationResults] Using profile data:', profile);
      console.log('[OptimizationResults] Job keywords:', jobKeywords);

      // Call API with the same structure as PDF generation
      const payload = { 
        htmlContent,
        profile,
        jobKeywords,
        twoColumnSkills: true,
        emphasizeMetrics: true,
        filename 
      };
      
      console.log('[OptimizationResults] Sending PDF-style payload to API:', payload);
      
      console.log('[OptimizationResults] sending PDF-style conversion request to /api/convert-html-to-docx');
      const resp = await fetch('/api/convert-html-to-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        console.error('[OptimizationResults] PDF-style conversion API failed', resp.status, txt);
        throw new Error('PDF-style DOCX generation failed');
      }

      console.log('[OptimizationResults] PDF-style conversion API succeeded, reading blob');
      const arrayBuffer = await resp.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.endsWith('.docx') ? filename : filename + '.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('[OptimizationResults] powerful DOCX download started for', filename);
    } catch (error) {
      console.error('[OptimizationResults] Error creating powerful DOCX:', error);
      // Fallback to the old method
      console.log('[OptimizationResults] Falling back to HTML conversion...');
      const htmlContent = getCleanHTMLForDocs(results.resume_html, profile, jobKeywords);
      await downloadAsDocx(htmlContent, filename);
    }
  };

  const downloadAsDocx = async (content: string, filename: string) => {
    console.log('[OptimizationResults] downloadAsDocx called, filename=', filename);
    try {
      const payload = { html: content, filename };
      console.log('[OptimizationResults] sending conversion request to /api/convert-html-to-docx');
      const resp = await fetch('/api/convert-html-to-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        console.error('[OptimizationResults] conversion API failed', resp.status, txt);
        throw new Error('Conversion API failed');
      }

      console.log('[OptimizationResults] conversion API succeeded, reading blob');
      const arrayBuffer = await resp.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.endsWith('.docx') ? filename : filename + '.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('[OptimizationResults] download started for', filename);
    } catch (error) {
      console.error('[OptimizationResults] Error creating DOCX via server:', error);
      // Fallback to text download
      const plainText = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      const blob = new Blob([plainText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.replace('.docx', '.txt');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // 🚀 ENHANCED: Generate and download resume as Word document using powerful DocxResumeGenerator
  // Helper function to parse HTML content into docx elements
  // parseHtmlContent removed — server-side conversion now used via /api/convert-html-to-docx\n// Client no longer builds DOCX locally; server handles HTML rendering and DOCX generation.\n

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
// 🚀 Enhanced: extract comprehensive profile info from the rendered HTML for complete DOCX generation
const extractProfileFromHtml = (html: string) => {
  console.log('[DEBUG] extractProfileFromHtml called with HTML length:', html?.length);
  console.log('[DEBUG] HTML content preview:', html?.substring(0, 500));
  
  try {
    const temp = document.createElement('div');
    temp.innerHTML = html || '';
    const text = (temp.textContent || temp.innerText || '').replace(/\r/g, '');
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    console.log('[DEBUG] Extracted text lines:', lines);

    // Basic contact info
    const name = lines[0] || '';
    const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const phoneMatch = text.match(/(\+?\d[\d\-\s]{6,}\d)/);
    const linkedinMatch = text.match(/(https?:\/\/)?(www\.)?linkedin\.com\/[^\s)]+/i);
    const locationLine = lines.find(l => /\b[A-Z][a-z]+,\s*[A-Z]{2,}|\b(?:(City|State|India|USA|United Kingdom))\b/i.test(l)) || '';

    console.log('[DEBUG] Basic info extracted:', { name, email: emailMatch?.[0], phone: phoneMatch?.[0], location: locationLine });

    // Extract sections by looking for common resume section headers
    const extractSection = (sectionName: string) => {
      const regex = new RegExp(`(?:^|\\n)\\s*${sectionName}\\s*(?:\\n|$)`, 'im');
      const match = text.match(regex);
      if (!match) {
        console.log(`[DEBUG] Section "${sectionName}" not found in text`);
        return [];
      }
      
      const startIndex = match.index! + match[0].length;
      const nextSectionRegex = /(?:^|\n)\s*(?:PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EXPERIENCE|EDUCATION|SKILLS|TECHNICAL SKILLS|PROJECTS|CERTIFICATIONS|AWARDS|ACHIEVEMENTS|SUMMARY|OBJECTIVE)\s*(?:\n|$)/gim;
      nextSectionRegex.lastIndex = startIndex;
      const nextMatch = nextSectionRegex.exec(text);
      const endIndex = nextMatch ? nextMatch.index : text.length;
      
      const sectionContent = text.substring(startIndex, endIndex).trim().split('\n').map(l => l.trim()).filter(Boolean);
      console.log(`[DEBUG] Section "${sectionName}" content:`, sectionContent);
      return sectionContent;
    };

    // Parse work experience
    const experienceLines = extractSection('(?:PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EXPERIENCE)');
    const workExperience = [];
    let currentJob: { jobTitle?: string; company?: string; duration?: string; responsibilities?: string[] } = {};
    
    for (const line of experienceLines) {
      if (line.match(/^\d{4}-\d{4}|^\w+\s+\d{4}/)) {
        // Date line - likely start of new job
        if (currentJob.jobTitle) workExperience.push(currentJob);
        currentJob = { duration: line };
      } else if (line.match(/^[A-Z][^•\-\n]{10,}/) && !currentJob.jobTitle) {
        // Job title (typically first long line in caps/title case)
        currentJob.jobTitle = line;
      } else if (line.match(/^[A-Z][^•\-\n]{5,}/) && currentJob.jobTitle && !currentJob.company) {
        // Company name
        currentJob.company = line;
      } else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        // Responsibility bullet point
        if (!currentJob.responsibilities) currentJob.responsibilities = [];
        currentJob.responsibilities.push(line.replace(/^[•\-*]\s*/, ''));
      }
    }
    if (currentJob.jobTitle) workExperience.push(currentJob);

    // Parse education
    const educationLines = extractSection('EDUCATION');
    const education = [];
    let currentEdu: { degree?: string; institution?: string; graduationYear?: string } = {};
    
    for (const line of educationLines) {
      if (line.match(/^\d{4}|Bachelor|Master|PhD|Degree|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?/i)) {
        if (currentEdu.degree || currentEdu.institution) education.push(currentEdu);
        currentEdu = {};
        
        if (line.match(/Bachelor|Master|PhD|Degree|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?/i)) {
          currentEdu.degree = line;
        } else {
          currentEdu.graduationYear = line;
        }
      } else if (line.match(/University|College|Institute|School/i) && !currentEdu.institution) {
        currentEdu.institution = line;
      } else if (!currentEdu.degree && line.length > 10) {
        currentEdu.degree = line;
      }
    }
    if (currentEdu.degree || currentEdu.institution) education.push(currentEdu);

    // Parse skills
    const skillsLines = extractSection('(?:TECHNICAL SKILLS|SKILLS)');
    const skills = [];
    for (const line of skillsLines) {
      if (line.includes(',')) {
        // Comma-separated skills
        skills.push(...line.split(',').map(s => s.trim()));
      } else if (line.match(/^[A-Za-z]/)) {
        // Single skill line
        skills.push(line);
      }
    }

    // Parse projects
    const projectLines = extractSection('PROJECTS');
    const projects = [];
    let currentProject: { title?: string; description?: string; technologies?: string[] } = {};
    
    for (const line of projectLines) {
      if (line.match(/^[A-Z][^•\-\n]{5,}/) && !line.startsWith('•') && !currentProject.title) {
        if (currentProject.title) projects.push(currentProject);
        currentProject = { title: line };
      } else if (line.startsWith('•') || line.startsWith('-')) {
        if (!currentProject.description) currentProject.description = '';
        currentProject.description += (currentProject.description ? ' ' : '') + line.replace(/^[•\-]\s*/, '');
      } else if (line.match(/Technologies?:|Tech:|Stack:/i)) {
        currentProject.technologies = line.replace(/Technologies?:|Tech:|Stack:/i, '').trim().split(/[,;]/);
      }
    }
    if (currentProject.title) projects.push(currentProject);

    // Extract summary from the beginning or look for summary section
    const summaryLines = extractSection('(?:SUMMARY|OBJECTIVE|PROFILE)');
    const summary = summaryLines.length > 0 ? summaryLines.join(' ') : 
      lines.slice(2, 5).filter(l => l.length > 30).join(' '); // Fallback to lines after name/contact

    console.log('[DEBUG] Final extracted data:', { workExperience, education, skills, projects, summary });

    const result = {
      fullName: name,
      email: emailMatch?.[0] || '',
      phone: phoneMatch?.[0] || '',
      location: locationLine,
      linkedin: linkedinMatch?.[0] || '',
      github: '',
      portfolio: '',
      summary: summary,
      workExperience: workExperience,
      experience: workExperience, // Provide both formats
      education: education,
      skills: skills,
      projects: projects
    };

    console.log('[DEBUG] extractProfileFromHtml final result:', result);
    return result;
  } catch (e) {
    console.error('Error extracting profile from HTML:', e);
    return {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      portfolio: ''
    };
  }
};

// Use actual user profile data if available, otherwise fall back to extracted data
const resumeProfile = userProfile || extractProfileFromHtml(results.resume_html);

// Function to modify HTML content to include user's name
const modifyHtmlWithProfile = (htmlContent: string, profile: { fullName?: string }) => {
  if (!profile?.fullName) return htmlContent;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // Replace any placeholder names in h1 tags
  const h1Elements = tempDiv.querySelectorAll('h1');
  h1Elements.forEach(h1 => {
    const text = h1.textContent?.trim();
    if (text && (text === 'Professional Name' || text === 'Your Name' || text.length < 3)) {
      h1.textContent = profile.fullName || '';
    }
  });

  // Also check for any divs that might contain name information
  const allDivs = tempDiv.querySelectorAll('div');
  allDivs.forEach(div => {
    const text = div.textContent?.trim();
    if (text && text.length < 50) { // Likely a header/name section
      if (text.includes('Professional Name') || text.includes('Your Name') || (text.split(' ').length <= 3 && !text.includes('@'))) {
        // Replace the entire content if it looks like a name placeholder
        if (text === 'Professional Name' || text === 'Your Name') {
          div.textContent = profile.fullName || '';
        }
      }
    }
  });

  return tempDiv.innerHTML;
};

// Modify HTML content with user's profile data
const modifiedResumeHtml = modifyHtmlWithProfile(results.resume_html, resumeProfile);
const modifiedCoverLetterHtml = modifyHtmlWithProfile(results.cover_letter_html, resumeProfile);

  // Show loading state while fetching profile
  if (loadingProfile) {
    return (
      <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Brain className="text-white animate-pulse" size={20} />
          </div>
          <p className="text-gray-600 dark:text-gray-300">Loading your profile...</p>
        </div>
      </div>
    );
  }

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

        {/* Document Viewer Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Enhanced Documents</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPDFPreview(!showPDFPreview)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-700 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-00 dark:hover:bg-gray-600 transition-colors"
                >
                  <Eye size={16} />
                  {showPDFPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>
            </div>

            {/* Document Tabs */}
            <div className="flex bg-gray-700 dark:bg-gray-700 rounded-lg p-1">
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

          {/* Side-by-Side: Custom Prompt Section + PDF Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left: Custom Prompt and Actions */}
            <div className="flex flex-col h-full">
              {/* Custom Prompt Section - Expanded */}
              <div className="bg-gradient-to-r from-blue-900 to-blue-900 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl border-2 border-blue-900 dark:border-blue-700 p-5 mb-4">
                <button
                  onClick={() => setShowPromptSection(!showPromptSection)}
                  className="w-full flex items-center justify-between mb-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                      <Brain className="text-white" size={20} />
                    </div>
                    <div className="text-left">
                      <h4 className="text-base font-bold text-gray-900 dark:text-white">
                        AI User Prompt Header
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Customize your AI enhancement
                      </p>
                    </div>
                  </div>
                  {showPromptSection ? <ChevronUp size={20} className="text-gray-700 dark:text-gray-300" /> : <ChevronDown size={20} className="text-gray-700 dark:text-gray-300" />}
                </button>

                {showPromptSection && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Custom Instructions (Optional)
                      </label>
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Add specific instructions... (e.g., 'Emphasize leadership skills', 'Add more metrics')"
                        className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none text-sm font-medium shadow-sm"
                        rows={4}
                      />
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">
                        💡 Job description and resume context auto-appended
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (onRegenerate) {
                          onRegenerate(customPrompt);
                        }
                      }}
                      disabled={!onRegenerate}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-base"
                    >
                      <Brain size={20} />
                      Generate using AI - Resume & Cover Letter
                    </button>
                  </div>
                )}
              </div>

              {/* Download Options */}
              <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-600 p-5 shadow-sm">
                <h4 className="font-bold text-gray-900 dark:text-white text-base mb-4 flex items-center gap-2">
                  <Download size={18} className="text-blue-600 dark:text-blue-400" />
                  Download Options
                </h4>
                <div className="space-y-3">
                  <button
                    onClick={() => downloadAsHtml(
                      activeDocument === 'resume' ? modifiedResumeHtml : modifiedCoverLetterHtml,
                      activeDocument === 'resume' ? 'ai-enhanced-resume.html' : 'ai-enhanced-cover-letter.html'
                    )}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-sm shadow-md hover:shadow-lg"
                  >
                    <FileText size={18} />
                    Download HTML
                  </button>
                  <button
                    onClick={() => {
                      const profile = userProfile || extractProfileFromHtml(results.resume_html);
                      const jobKeywords = analysisData?.keywordAnalysis?.coveredKeywords || [];
                      const filename = activeDocument === 'resume' ? 'ai-enhanced-resume.docx' : 'ai-enhanced-cover-letter.docx';
                      
                      if (activeDocument === 'resume' && profile) {
                        downloadAsDocxPowerful(profile, jobKeywords, filename);
                      } else {
                        downloadAsDocx(
                          activeDocument === 'resume' ? modifiedResumeHtml : modifiedCoverLetterHtml,
                          filename
                        );
                      }
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-sm shadow-md hover:shadow-lg"
                  >
                    <FileText size={18} />
                    Download Word DOC
                  </button>
                  <PDFDownloadLink
                    document={
                      activeDocument === 'resume' ?
                        <PerfectHTMLToPDF
                          htmlContent={modifiedResumeHtml}
                          profile={resumeProfile}
                          jobKeywords={analysisData?.keywordAnalysis?.coveredKeywords || []}
                          twoColumnSkills
                          emphasizeMetrics
                        /> :
                        <CoverLetterPDFDocument content={modifiedCoverLetterHtml} jobDetails={jobDetails} resultsData={results} />
                    }
                    fileName={activeDocument === 'resume' ?
                      `ai-enhanced-resume-${jobDetails.company.replace(/\s+/g, '-')}.pdf` :
                      `ai-enhanced-cover-letter-${jobDetails.company.replace(/\s+/g, '-')}.pdf`
                    }
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-sm shadow-md hover:shadow-lg"
                  >
                    {({ loading }) => (
                      <>
                        <Download size={18} />
                        {loading ? 'Generating PDF...' : 'Download PDF'}
                      </>
                    )}
                  </PDFDownloadLink>
                </div>
              </div>
            </div>

            {/* Right: PDF Preview */}
            {showPDFPreview && (
              <div className="flex flex-col h-full">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4 text-base flex items-center gap-2">
                  <Eye size={18} className="text-blue-600 dark:text-blue-400" />
                  {activeDocument === 'resume' ? 'AI-Enhanced Resume Preview' : 'AI-Enhanced Cover Letter Preview'}
                </h4>
                <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border-2 border-gray-200 dark:border-gray-600 shadow-sm">
                  <div className="h-full min-h-[600px] bg-white dark:bg-gray-900 rounded border-2 border-gray-300 dark:border-gray-600 shadow-lg">
                    {activeDocument === 'resume' ? (
                      <ResumePDFPreview
                        resumeHtml={modifiedResumeHtml}
                        profile={resumeProfile}
                        jobKeywords={analysisData?.keywordAnalysis?.coveredKeywords || []}
                        twoColumnSkills
                        emphasizeMetrics
                        fallbackPdfUrl={"https://storage.googleapis.com/myjobsearchagent.firebasestorage.app/ApplicationDocuments/i4HJIfYJLZWweXDtKtA5_resume.pdf?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=firebase-adminsdk-fbsvc%40myjobsearchagent.iam.gserviceaccount.com%2F20250920%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20250920T133421Z&X-Goog-Expires=604800&X-Goog-SignedHeaders=host&X-Goog-Signature=1f1fe16a6e27a8e972a70e6ee2a9089d86b27f445d45e74c6fc44db8dc7aa03f2574a58d2717c6a394e1bd77ebf1890cbdb032ed852f01c59eaf2101a9e36fd876bd4ec77bb27c0d9d27ec43d7e58373852dc993c0f01dd14527cec50aedb22bd3db4b50e63caf6cdbd4124e5da225370452db78e4fa950b632b1d346bf78d2d1218bb92b24e3381f4b09d7888961b3647403822fbf4c590e169d96711ea57a8ff82bdb04e441c956b4d2165e93fc40bdda1d3694c2ad8101f9e5b51039d7dd23c2092eeb54568125e01b23c1db4d87849cfc91fdf64ce9318b23b876ebf5e312c2b6f9c614b6d5845bc70aa48bbd7042461423b141ce0c95ed09c09b92dfbf3"}
                        height="100%"
                      />
                    ) : (
                      <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
                        <CoverLetterPDFDocument content={modifiedCoverLetterHtml} jobDetails={jobDetails} resultsData={results} />
                      </PDFViewer>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Keyword Analysis */}
        <div className="bg-[#1f2937] rounded-xl p-6 border border-[#1f2937]">
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
                      className="px-3 py-1 bg-[rgb(22,163,74)] text-white rounded-full text-sm font-medium"
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
                      className="px-3 py-1 bg-[rgb(185,28,28)] text-white rounded-full text-sm font-medium"
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
        <div className="bg-[#1f2937] rounded-xl p-6 text-center border border-[#1f2937]">
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
                // 🚀 Use powerful DOCX generation for both documents
                console.log('[DEBUG] Download button clicked');
                console.log('[DEBUG] userProfile:', userProfile);
                console.log('[DEBUG] results.resume_html length:', results.resume_html?.length);
                
                const profile = userProfile || extractProfileFromHtml(results.resume_html);
                console.log('[DEBUG] Profile to use for DOCX:', profile);
                
                const jobKeywords = analysisData?.keywordAnalysis?.coveredKeywords || [];
                console.log('[DEBUG] Job keywords:', jobKeywords);
                
                if (profile) {
                  // Use powerful generator for resume
                  downloadAsDocxPowerful(profile, jobKeywords, 'ai-enhanced-resume-professional.docx');
                } else {
                  console.warn('[DEBUG] No profile available, falling back to HTML conversion');
                  // Fallback for resume
                  downloadAsDocx(modifiedResumeHtml, 'ai-enhanced-resume.docx');
                }
                
                // Always use HTML conversion for cover letter (for now)
                downloadAsDocx(modifiedCoverLetterHtml, 'ai-enhanced-cover-letter.docx');
              }}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-all hover:shadow-lg flex items-center gap-2"
            >
              <Download size={16} />
              Download Both as Professional Word DOC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationResults;