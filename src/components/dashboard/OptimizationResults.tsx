import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Download, FileText, CheckCircle, Target, TrendingUp, Award, Brain, Copy, Check, ChevronDown, ChevronUp, AlertCircle, Eye } from 'lucide-react';
import { PDFViewer, PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

import ResumeTemplate, { PerfectHTMLToPDF } from './ResumeTemplate';
import { PDFToDocxService } from '../../services/pdfToDocxService';
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

// Resume PDF Document Component with structured data from results
const ResumePDFDocument: React.FC<{ content: string; jobDetails: any; resultsData?: any }> = ({ content, jobDetails, resultsData }) => {
  // Extract data from the results object instead of parsing HTML
  const extractStructuredData = () => {
    if (!resultsData) {
      return {
        name: 'Professional Name',
        contactInfo: 'email@example.com',
        sections: []
      };
    }

    // Get profile and user data
    const profile = resultsData.detailedUserProfile || {};
    const authUser = resultsData.user || {};
    const parsedPersonal = resultsData.parsedResume?.personal || {};

    const name =
      (profile.fullName && profile.fullName.trim()) ||
      authUser.displayName ||
      (parsedPersonal.name && parsedPersonal.name.trim()) ||
      'Professional Name';

    const email =
      (profile.email && profile.email.trim()) ||
      authUser.email ||
      (parsedPersonal.email && parsedPersonal.email.trim()) ||
      'email@example.com';

    const phone =
      (profile.phone && profile.phone.trim()) ||
      (parsedPersonal.phone && parsedPersonal.phone.trim()) ||
      '';

    const location =
      (profile.location && profile.location.trim()) ||
      (parsedPersonal.location && parsedPersonal.location.trim()) ||
      '';

    const contactInfo = [email, phone, location].filter(Boolean).join(' • ');

    // Get structured sections data
    const sections = resultsData.aiEnhancements?.detailedResumeSections || {};

    const structuredSections = [];

    // Professional Summary
    if (sections.professional_summary || resultsData.aiEnhancements?.enhancedSummary) {
      structuredSections.push({
        title: 'PROFESSIONAL SUMMARY',
        type: 'paragraph',
        data: sections.professional_summary || resultsData.aiEnhancements?.enhancedSummary || ''
      });
    }

    // Technical Skills
    if (sections.technical_skills || resultsData.skillsOptimization?.technicalSkills) {
      structuredSections.push({
        title: 'TECHNICAL SKILLS',
        type: 'skills',
        data: sections.technical_skills || resultsData.skillsOptimization?.technicalSkills || []
      });
    }

    // Core Competencies
    if (sections.soft_skills || resultsData.skillsOptimization?.softSkills) {
      structuredSections.push({
        title: 'CORE COMPETENCIES',
        type: 'competencies',
        data: sections.soft_skills || resultsData.skillsOptimization?.softSkills || []
      });
    }

    // Professional Experience
    if (sections.experience) {
      structuredSections.push({
        title: 'PROFESSIONAL EXPERIENCE',
        type: 'experience',
        data: sections.experience
      });
    }

    // Education
    if (sections.education) {
      structuredSections.push({
        title: 'EDUCATION',
        type: 'education',
        data: sections.education
      });
    }

    // Projects
    if (sections.projects) {
      structuredSections.push({
        title: 'KEY PROJECTS',
        type: 'projects',
        data: sections.projects
      });
    }

    // Certifications
    if (sections.certifications) {
      structuredSections.push({
        title: 'CERTIFICATIONS',
        type: 'certifications',
        data: sections.certifications
      });
    }

    // Awards
    if (sections.awards) {
      structuredSections.push({
        title: 'AWARDS & RECOGNITION',
        type: 'awards',
        data: sections.awards
      });
    }

    // Volunteer Work
    if (sections.volunteer_work) {
      structuredSections.push({
        title: 'VOLUNTEER EXPERIENCE',
        type: 'volunteer',
        data: sections.volunteer_work
      });
    }

    return {
      name,
      contactInfo,
      sections: structuredSections
    };
  };

  const structuredData = extractStructuredData();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{structuredData.name}</Text>
          <Text style={styles.contactInfo}>{structuredData.contactInfo}</Text>
        </View>

        {/* Render sections with proper formatting */}
        {structuredData.sections.map((section: any, index: number) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {renderSectionContent(section)}
          </View>
        ))}

        <View style={styles.compactSection}>
          <Text style={styles.sectionTitle}>Document Information</Text>
          <Text style={styles.smallText}>Generated: {new Date().toLocaleDateString()}</Text>
          <Text style={styles.smallText}>Position: {jobDetails.title}</Text>
          <Text style={styles.smallText}>Company: {jobDetails.company}</Text>
        </View>
      </Page>
    </Document>
  );
};

// Helper function to render different section types
const renderSectionContent = (section: any) => {
  switch (section.type) {
    case 'skills':
      return (
        <View style={styles.flexWrap}>
          {section.data.map((skill: string, index: number) => (
            <Text key={index} style={styles.skillBox}>
              {skill}
            </Text>
          ))}
        </View>
      );

    case 'competencies':
      return (
        <View style={styles.flexWrap}>
          {section.data.map((skill: string, index: number) => (
            <Text key={index} style={styles.competencyBox}>
              {skill}
            </Text>
          ))}
        </View>
      );

    case 'experience':
      return section.data.map((exp: any, expIndex: number) => (
        <View key={expIndex} style={styles.sectionItem}>
          <View style={styles.flexRow}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2563eb' }}>{exp.position}</Text>
            <Text style={{ fontSize: 10, color: '#000000' }}>{exp.duration}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#000000' }}>{exp.company}</Text>
            <Text style={{ fontSize: 10, color: '#000000' }}>{exp.location}</Text>
          </View>
          {exp.responsibilities.map((resp: string, respIndex: number) => (
            <Text key={respIndex} style={styles.bulletPoint}>
              • {resp}
            </Text>
          ))}
        </View>
      ));

    case 'education':
      return section.data.map((edu: any, eduIndex: number) => (
        <View key={eduIndex} style={styles.sectionItem}>
          <View style={styles.flexRow}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#2563eb' }}>{edu.degree}</Text>
            <Text style={{ fontSize: 10, color: '#000000' }}>{edu.graduationDate}</Text>
          </View>
          <Text style={{ fontSize: 10, color: '#000000', marginBottom: 2 }}>{edu.institution}</Text>
          {edu.gpa && <Text style={{ fontSize: 9, color: '#000000' }}>GPA: {edu.gpa}</Text>}
        </View>
      ));

    case 'projects':
      return section.data.map((project: any, projectIndex: number) => (
        <View key={projectIndex} style={styles.sectionItem}>
          <View style={styles.flexRow}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#2563eb' }}>{project.name}</Text>
            <Text style={{ fontSize: 9, color: '#000000' }}>{project.duration}</Text>
          </View>
          <Text style={{ fontSize: 10, lineHeight: 1.4, color: '#000000', marginBottom: 4 }}>{project.description}</Text>
          {project.achievements.map((achievement: string, achIndex: number) => (
            <Text key={achIndex} style={styles.bulletPoint}>
              • {achievement}
            </Text>
          ))}
          {project.technologies && (
            <Text style={{ fontSize: 9, color: '#000000', marginTop: 2 }}>
              Technologies: {project.technologies}
            </Text>
          )}
        </View>
      ));

    case 'certifications':
      return section.data.map((cert: any, certIndex: number) => (
        <View key={certIndex} style={{ marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#000000' }}>{cert.name}</Text>
            <Text style={{ fontSize: 9, color: '#000000' }}>{cert.organization}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 9, color: '#000000' }}>Issued: {cert.issueDate}</Text>
            {cert.expirationDate && <Text style={{ fontSize: 9, color: '#000000' }}>Expires: {cert.expirationDate}</Text>}
          </View>
        </View>
      ));

    case 'awards':
      return section.data.map((award: any, awardIndex: number) => (
        <View key={awardIndex} style={styles.sectionItem}>
          <View style={styles.flexRow}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#000000' }}>{award.title}</Text>
            <Text style={{ fontSize: 9, color: '#000000' }}>{award.date}</Text>
          </View>
          <Text style={{ fontSize: 9, color: '#000000', marginBottom: 2 }}>{award.organization}</Text>
          {award.description && <Text style={{ fontSize: 9, lineHeight: 1.3, color: '#000000' }}>{award.description}</Text>}
        </View>
      ));

    case 'volunteer':
      return section.data.map((vol: any, volIndex: number) => (
        <View key={volIndex} style={styles.sectionItem}>
          <View style={styles.flexRow}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#000000' }}>{vol.role}</Text>
            <Text style={{ fontSize: 9, color: '#000000' }}>{vol.duration}</Text>
          </View>
          <Text style={{ fontSize: 9, color: '#000000', marginBottom: 2 }}>{vol.organization}</Text>
          <Text style={{ fontSize: 9, lineHeight: 1.3, color: '#000000', marginBottom: 2 }}>{vol.description}</Text>
          {vol.achievements.map((achievement: string, achIndex: number) => (
            <Text key={achIndex} style={styles.bulletPoint}>
              • {achievement}
            </Text>
          ))}
        </View>
      ));

    default:
      return <Text style={styles.text}>{section.data}</Text>;
  }
};

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

const OptimizationResults: React.FC<OptimizationResultsProps> = ({ results, jobDetails, analysisData, onBack }) => {
  const [copiedResume, setCopiedResume] = useState(false);
  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);
  const [activeDocument, setActiveDocument] = useState<'resume' | 'cover-letter'>('resume');
  const [showPDFPreview, setShowPDFPreview] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

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

  const copyToClipboard = async (text: string, type: 'resume' | 'cover') => {
    try {
      const plainText = text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      await navigator.clipboard.writeText(plainText);

      if (type === 'resume') {
        setCopiedResume(true);
        setTimeout(() => setCopiedResume(false), 2000);
      } else {
        setCopiedCoverLetter(true);
        setTimeout(() => setCopiedCoverLetter(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const downloadAsText = (content: string, filename: string) => {
    const plainText = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
// Helper: extract minimal profile info from the rendered HTML so ResumeTemplate gets real values
const extractProfileFromHtml = (html: string) => {
  try {
    const temp = document.createElement('div');
    temp.innerHTML = html || '';
    const text = (temp.textContent || temp.innerText || '').replace(/\r/g, '');
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const name = lines[0] || '';
    const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const phoneMatch = text.match(/(\+?\d[\d\-\s]{6,}\d)/);
    const linkedinMatch = text.match(/(https?:\/\/)?(www\.)?linkedin\.com\/[^\s)]+/i);
    const locationLine = lines.find(l => /\b[A-Z][a-z]+,\s*[A-Z]{2,}|\b(?:(City|State|India|USA|United Kingdom))\b/i) || '';

    return {
      fullName: name,
      email: emailMatch?.[0] || '',
      phone: phoneMatch?.[0] || '',
      location: locationLine,
      linkedin: linkedinMatch?.[0] || '',
      github: '',
      portfolio: ''
    };
  } catch (e) {
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
const modifyHtmlWithProfile = (htmlContent: string, profile: any) => {
  if (!profile?.fullName) return htmlContent;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // Replace any placeholder names in h1 tags
  const h1Elements = tempDiv.querySelectorAll('h1');
  h1Elements.forEach(h1 => {
    const text = h1.textContent?.trim();
    if (text && (text === 'Professional Name' || text === 'Your Name' || text.length < 3)) {
      h1.textContent = profile.fullName;
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
          div.textContent = profile.fullName;
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

          {/* Document Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left: Text Content */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {activeDocument === 'resume' ? 'Resume Content' : 'Cover Letter Content'}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(
                      activeDocument === 'resume' ? modifiedResumeHtml : modifiedCoverLetterHtml,
                      activeDocument === 'resume' ? 'resume' : 'cover'
                    )}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Copy content"
                  >
                    {(activeDocument === 'resume' ? copiedResume : copiedCoverLetter) ?
                      <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600">
                <div
                  className={`prose prose-sm dark:prose-invert max-w-none leading-relaxed ${activeDocument === 'resume' ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}
                  dangerouslySetInnerHTML={{
                    __html: activeDocument === 'resume' ? modifiedResumeHtml : modifiedCoverLetterHtml
                  }}
                />
              </div>

              {/* Download Options */}
              <div className="mt-4 space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => downloadAsText(
                      activeDocument === 'resume' ? modifiedResumeHtml : modifiedCoverLetterHtml,
                      activeDocument === 'resume' ? 'ai-enhanced-resume.txt' : 'ai-enhanced-cover-letter.txt'
                    )}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download size={16} />
                    Download TXT
                  </button>
                  <button
                    onClick={() => downloadAsDocx(
                      activeDocument === 'resume' ? modifiedResumeHtml : modifiedCoverLetterHtml,
                      activeDocument === 'resume' ? 'ai-enhanced-resume.docx' : 'ai-enhanced-cover-letter.docx'
                    )}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileText size={16} />
                    Download Word DOC
                  </button>
                </div>

                {/* PDF Download Links */}
                <div className="flex gap-3">
                  <PDFDownloadLink
                    document={
                      activeDocument === 'resume' ?
                        <PerfectHTMLToPDF
                          htmlContent={modifiedResumeHtml}
                          profile={resumeProfile as any}
                          jobKeywords={analysisData?.keywordAnalysis?.coveredKeywords || []}
                        /> :
                        <CoverLetterPDFDocument content={modifiedCoverLetterHtml} jobDetails={jobDetails} resultsData={results} />
                    }
                    fileName={activeDocument === 'resume' ?
                      `ai-enhanced-resume-${jobDetails.company.replace(/\s+/g, '-')}.pdf` :
                      `ai-enhanced-cover-letter-${jobDetails.company.replace(/\s+/g, '-')}.pdf`
                    }
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    {({ blob, url, loading, error }) => (
                      <>
                        <Download size={16} />
                        {loading ? 'Generating Professional PDF...' : 'Download Professional PDF'}
                      </>
                    )}
                  </PDFDownloadLink>
                </div>
              </div>
            </div>

            {/* Right: PDF Preview */}
            {showPDFPreview && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">PDF Preview</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="h-96 bg-white rounded border">
                    <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
                      {activeDocument === 'resume' ?
                        <PerfectHTMLToPDF
                          htmlContent={modifiedResumeHtml}
                          profile={resumeProfile as any}
                          jobKeywords={analysisData?.keywordAnalysis?.coveredKeywords || []}
                        /> :
                        <CoverLetterPDFDocument content={modifiedCoverLetterHtml} jobDetails={jobDetails} resultsData={results} />
                      }
                    </PDFViewer>
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
                downloadAsDocx(modifiedResumeHtml, 'ai-enhanced-resume.docx');
                downloadAsDocx(modifiedCoverLetterHtml, 'ai-enhanced-cover-letter.docx');
              }}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-all hover:shadow-lg flex items-center gap-2"
            >
              <Download size={16} />
              Download Both as Word DOC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationResults;