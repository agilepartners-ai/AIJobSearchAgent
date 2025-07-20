import React from 'react';
import { X, Download, FileText, CheckCircle, AlertCircle, Target, TrendingUp, Award, Brain, Eye } from 'lucide-react';
import { UserProfileData } from '../../services/profileService';
import { User } from '@supabase/supabase-js';
import { useAuth } from '../../hooks/useAuth';

interface OptimizationResultsProps {
  results: {
    matchScore: number;
    summary: string;
    strengths: string[];
    gaps: string[];
    suggestions: string[];
    optimizedResumeUrl: string;
    optimizedCoverLetterUrl: string;
    keywordAnalysis: {
      coverageScore: number;
      coveredKeywords: string[];
      missingKeywords: string[];
    };
    experienceOptimization: {
      company: string;
      position: string;
      relevanceScore: number;
      included: boolean;
      reasoning?: string;
    }[];
    skillsOptimization: {
      technicalSkills: string[];
      softSkills: string[];
      missingSkills: string[];
    };
    parsedResume?: any;
    extractionMetadata?: {
      documentId: string;
      extractedTextLength: number;
      processingTime: number;
      modelUsed: string;
      apiBaseUrl: string;
      sectionsAnalyzed?: string[];
    };
    aiEnhancements?: {
      enhancedSummary: string;
      enhancedExperienceBullets: string[];
      coverLetterOutline: {
        opening: string;
        body: string;
        closing: string;
      };
      sectionRecommendations: {
        skills: string;
        experience: string;
        education: string;
      };
    };
    rawAIResponse?: any;
    // Job application context for PDF generation
    jobDescription?: string;
    applicationData?: {
      position: string;
      company_name: string;
      location?: string;
    };
    // User profile data for cover letter generation
    detailedUserProfile?: UserProfileData | null;
    user?: User | null;
    extractedText?: string;
    optimizedResumeText?: string;
  };
  onClose: () => void;
}

const OptimizationResults: React.FC<OptimizationResultsProps> = ({ results, onClose }) => {
  const [showResumePreview, setShowResumePreview] = React.useState(false);
  const [showCoverLetterPreview, setShowCoverLetterPreview] = React.useState(false);
  const [generatedResumeContent, setGeneratedResumeContent] = React.useState('');
  const [generatedCoverLetterContent, setGeneratedCoverLetterContent] = React.useState('');

  const { user } = useAuth();

  // Generate optimized resume content locally
  React.useEffect(() => {
    if (results.aiEnhancements && results.parsedResume) {
      generateOptimizedResumeContent();
      generateOptimizedCoverLetterContent();
    }
  }, [results]);

  const generateOptimizedResumeContent = () => {
    const personalInfo = results.parsedResume?.personal || {};
    const experiences = results.experienceOptimization || [];
    const skills = results.skillsOptimization || {};
    const enhancements = results.aiEnhancements;

    // Use real user data instead of mock data
    const realPersonalInfo = {
      name: results.detailedUserProfile?.fullName || personalInfo.name || 'Your Name',
      email: user?.email || personalInfo.email || 'your.email@example.com',
      phone: results.detailedUserProfile?.phone || personalInfo.phone || 'Your Phone',
      location: results.detailedUserProfile?.location || personalInfo.location || ''
    };

    let resumeContent = '';

    // Header with real user data
    resumeContent += `${realPersonalInfo.name}\n`;
    resumeContent += `${realPersonalInfo.email} | ${realPersonalInfo.phone}\n`;
    if (realPersonalInfo.location) {
      resumeContent += `${realPersonalInfo.location}\n`;
    }
    resumeContent += '\n';

    // Professional Summary
    if (enhancements?.enhancedSummary) {
      resumeContent += 'PROFESSIONAL SUMMARY\n';
      resumeContent += '===================\n';
      resumeContent += `${enhancements.enhancedSummary}\n\n`;
    }

    // Core Competencies/Skills
    if (skills.technicalSkills?.length > 0 || skills.softSkills?.length > 0) {
      resumeContent += 'CORE COMPETENCIES\n';
      resumeContent += '=================\n';

      if (skills.technicalSkills?.length > 0) {
        resumeContent += `Technical Skills: ${skills.technicalSkills.join(', ')}\n`;
      }
      if (skills.softSkills?.length > 0) {
        resumeContent += `Professional Skills: ${skills.softSkills.join(', ')}\n`;
      }
      resumeContent += '\n';
    }

    // Professional Experience
    const includedExperiences = experiences.filter(exp => exp.included);
    if (includedExperiences.length > 0) {
      resumeContent += 'PROFESSIONAL EXPERIENCE\n';
      resumeContent += '=======================\n';

      includedExperiences.forEach(exp => {
        resumeContent += `${exp.position} | ${exp.company}\n`;
        resumeContent += `Relevance Score: ${exp.relevanceScore}%\n`;
        if (exp.reasoning) {
          resumeContent += `${exp.reasoning}\n`;
        }
        resumeContent += '\n';
      });
    }

    // AI-Enhanced Experience Bullets
    if (enhancements?.enhancedExperienceBullets && enhancements.enhancedExperienceBullets.length > 0) {
      resumeContent += 'KEY ACHIEVEMENTS\n';
      resumeContent += '================\n';
      enhancements.enhancedExperienceBullets.forEach(bullet => {
        resumeContent += `• ${bullet}\n`;
      });
      resumeContent += '\n';
    }

    // Section Recommendations
    if (enhancements?.sectionRecommendations) {
      const recommendations = enhancements.sectionRecommendations;
      if (recommendations.skills || recommendations.experience || recommendations.education) {
        resumeContent += 'AI OPTIMIZATION RECOMMENDATIONS\n';
        resumeContent += '================================\n';

        if (recommendations.skills) {
          resumeContent += `Skills Section: ${recommendations.skills}\n`;
        }
        if (recommendations.experience) {
          resumeContent += `Experience Section: ${recommendations.experience}\n`;
        }
        if (recommendations.education) {
          resumeContent += `Education Section: ${recommendations.education}\n`;
        }
        resumeContent += '\n';
      }
    }

    // Keyword Analysis Summary
    if (results.keywordAnalysis) {
      resumeContent += 'KEYWORD OPTIMIZATION SUMMARY\n';
      resumeContent += '============================\n';
      resumeContent += `Keyword Coverage: ${results.keywordAnalysis.coverageScore}%\n`;
      if (results.keywordAnalysis.coveredKeywords.length > 0) {
        resumeContent += `Covered Keywords: ${results.keywordAnalysis.coveredKeywords.join(', ')}\n`;
      }
      if (results.keywordAnalysis.missingKeywords.length > 0) {
        resumeContent += `Missing Keywords to Add: ${results.keywordAnalysis.missingKeywords.join(', ')}\n`;
      }
    }

    setGeneratedResumeContent(resumeContent);
  };

  const generateOptimizedCoverLetterContent = () => {
    const personalInfo = results.parsedResume?.personal || {};
    const jobData = results.applicationData;
    const coverLetterOutline = results.aiEnhancements?.coverLetterOutline;

    // Use real user data instead of mock data
    const realPersonalInfo = {
      name: results.detailedUserProfile?.fullName || personalInfo.name || 'Your Name',
      email: user?.email || personalInfo.email || 'your.email@example.com',
      phone: results.detailedUserProfile?.phone || personalInfo.phone || 'Your Phone',
      location: results.detailedUserProfile?.location || personalInfo.location || ''
    };

    let coverLetterContent = '';

    // Header with real user data
    coverLetterContent += `${realPersonalInfo.name}\n`;
    coverLetterContent += `${realPersonalInfo.email}\n`;
    coverLetterContent += `${realPersonalInfo.phone}\n`;
    if (realPersonalInfo.location) {
      coverLetterContent += `${realPersonalInfo.location}\n`;
    }
    coverLetterContent += '\n';

    // Date
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    coverLetterContent += `${currentDate}\n\n`;

    // Employer Information
    coverLetterContent += `Hiring Manager\n`;
    coverLetterContent += `${jobData?.company_name || 'Company Name'}\n`;
    if (jobData?.location) {
      coverLetterContent += `${jobData.location}\n`;
    }
    coverLetterContent += '\n';

    // Subject Line
    coverLetterContent += `Re: Application for ${jobData?.position || 'Position'}\n\n`;

    // Salutation
    coverLetterContent += 'Dear Hiring Manager,\n\n';

    // Opening Paragraph
    if (coverLetterOutline?.opening) {
      coverLetterContent += `${coverLetterOutline.opening}\n\n`;
    } else {
      coverLetterContent += `I am writing to express my strong interest in the ${jobData?.position || 'position'} role at ${jobData?.company_name || 'your company'}. With my background and skills, I am confident I would be a valuable addition to your team.\n\n`;
    }

    // Body Paragraph
    if (coverLetterOutline?.body) {
      coverLetterContent += `${coverLetterOutline.body}\n\n`;
    } else {
      // Use AI analysis data
      if (results.strengths?.length > 0) {
        coverLetterContent += 'My key strengths that align with this role include:\n';
        results.strengths.forEach(strength => {
          coverLetterContent += `• ${strength}\n`;
        });
        coverLetterContent += '\n';
      }

      // Include match score context
      coverLetterContent += `Based on my analysis, my background shows a ${results.matchScore}% match with your requirements. `;

      if (results.keywordAnalysis?.coveredKeywords.length > 0) {
        coverLetterContent += `I have experience with key technologies and skills you're seeking, including ${results.keywordAnalysis.coveredKeywords.slice(0, 5).join(', ')}.`;
      }
      coverLetterContent += '\n\n';
    }

    // Additional Value Proposition
    if (results.aiEnhancements?.enhancedExperienceBullets && results.aiEnhancements.enhancedExperienceBullets.length > 0) {
      coverLetterContent += 'Some of my notable achievements include:\n';
      results.aiEnhancements.enhancedExperienceBullets.slice(0, 3).forEach(bullet => {
        coverLetterContent += `• ${bullet}\n`;
      });
      coverLetterContent += '\n';
    }

    // Closing Paragraph
    if (coverLetterOutline?.closing) {
      coverLetterContent += `${coverLetterOutline.closing}\n\n`;
    } else {
      coverLetterContent += `I am excited about the opportunity to contribute to ${jobData?.company_name || 'your organization'} and would welcome the chance to discuss how my skills and experience can benefit your team. Thank you for considering my application.\n\n`;
    }

    // Sign-off with real name
    coverLetterContent += 'Sincerely,\n';
    coverLetterContent += `${realPersonalInfo.name}`;

    setGeneratedCoverLetterContent(coverLetterContent);
  };

  const downloadAsDocx = (content: string, filename: string) => {
    // Simple DOCX-like format (actually RTF which can be opened by Word)
    const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}} \\f0\\fs24 ${content.replace(/\n/g, '\\par ')}}`;

    const blob = new Blob([rtfContent], { type: 'application/rtf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.rtf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAsPdf = (content: string, filename: string) => {
    // Create a simple PDF using HTML to PDF conversion
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${filename}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
              h1 { color: #333; border-bottom: 2px solid #333; }
              h2 { color: #666; border-bottom: 1px solid #666; }
              pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
            </style>
          </head>
          <body>
            <pre>${content}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const downloadAsText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) {
      return {
        className: "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200",
        icon: <Target className="text-green-600" size={24} />,
        label: "Excellent Match",
        color: "text-green-600"
      };
    } else if (score >= 70) {
      return {
        className: "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200",
        icon: <CheckCircle className="text-blue-600" size={24} />,
        label: "Good Match",
        color: "text-blue-600"
      };
    } else if (score >= 50) {
      return {
        className: "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-200",
        icon: <TrendingUp className="text-yellow-600" size={24} />,
        label: "Fair Match",
        color: "text-yellow-600"
      };
    } else {
      return {
        className: "bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-200",
        icon: <AlertCircle className="text-red-600" size={24} />,
        label: "Needs Improvement",
        color: "text-red-600"
      };
    }
  };

  const scoreBadge = getScoreBadge(results.matchScore);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  🎯 AI Optimization Results
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Your resume and cover letter have been optimized for this position
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Score Section */}
          <div className="text-center">
            <div className={`inline-flex items-center gap-4 px-8 py-6 rounded-2xl border-2 ${scoreBadge.className}`}>
              {scoreBadge.icon}
              <div>
                <div className="text-lg font-semibold">{scoreBadge.label}</div>
                <div className={`text-3xl font-bold ${scoreBadge.color}`}>{results.matchScore}%</div>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-lg mt-4 max-w-2xl mx-auto leading-relaxed">
              {results.summary}
            </p>
          </div>

          {/* Generated Documents Section */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="text-blue-600 dark:text-blue-400" size={24} />
              AI-Generated Documents
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your optimized resume and cover letter have been generated locally using AI analysis.
            </p>

            <div className="space-y-6">
              {/* Optimized Resume */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="text-blue-600 dark:text-blue-400" size={20} />
                    Optimized Resume
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowResumePreview(!showResumePreview)}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                    >
                      <Eye size={16} />
                      {showResumePreview ? 'Hide' : 'Preview'}
                    </button>
                    <div className="relative group">
                      <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors flex items-center gap-1">
                        <Download size={16} />
                        Download
                      </button>
                      <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <div className="p-2 space-y-1 min-w-[120px]">
                          <button
                            onClick={() => downloadAsText(generatedResumeContent, 'Optimized_Resume')}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                          >
                            Download as TXT
                          </button>
                          <button
                            onClick={() => downloadAsDocx(generatedResumeContent, 'Optimized_Resume')}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                          >
                            Download as DOC
                          </button>
                          <button
                            onClick={() => downloadAsPdf(generatedResumeContent, 'Optimized_Resume')}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                          >
                            Print as PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {showResumePreview && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
                      {generatedResumeContent}
                    </pre>
                  </div>
                )}

                <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  📄 Generated based on {results.matchScore}% job match analysis with AI optimizations
                </div>
              </div>

              {/* Optimized Cover Letter */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="text-purple-600 dark:text-purple-400" size={20} />
                    Optimized Cover Letter
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowCoverLetterPreview(!showCoverLetterPreview)}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                    >
                      <Eye size={16} />
                      {showCoverLetterPreview ? 'Hide' : 'Preview'}
                    </button>
                    <div className="relative group">
                      <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors flex items-center gap-1">
                        <Download size={16} />
                        Download
                      </button>
                      <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <div className="p-2 space-y-1 min-w-[120px]">
                          <button
                            onClick={() => downloadAsText(generatedCoverLetterContent, 'Optimized_Cover_Letter')}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                          >
                            Download as TXT
                          </button>
                          <button
                            onClick={() => downloadAsDocx(generatedCoverLetterContent, 'Optimized_Cover_Letter')}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                          >
                            Download as DOC
                          </button>
                          <button
                            onClick={() => downloadAsPdf(generatedCoverLetterContent, 'Optimized_Cover_Letter')}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                          >
                            Print as PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {showCoverLetterPreview && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
                      {generatedCoverLetterContent}
                    </pre>
                  </div>
                )}

                <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  💌 Personalized for {results.applicationData?.position} at {results.applicationData?.company_name}
                </div>
              </div>
            </div>
          </div>

          {/* Extracted Text Display */}
          {results.extractedText && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="text-gray-600 dark:text-gray-400" size={20} />
                Extracted Resume Text
              </h3>
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 max-h-80 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
                  {results.extractedText}
                </pre>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span>📝 Characters: {results.extractedText.length}</span>
                <span>📊 Words: ~{results.extractedText.split(/\s+/).length}</span>
                <span>🔧 Model: {results.extractionMetadata?.modelUsed || 'gpt-4o'}</span>
              </div>
            </div>
          )}

          {/* Keyword Analysis */}
          {results.keywordAnalysis && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                🔍 Keyword Analysis
              </h3>
              <div className="mb-6">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {results.keywordAnalysis.coverageScore}% Keyword Coverage
                </span>
              </div>

              {results.keywordAnalysis.coveredKeywords.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-green-700 dark:text-green-400 mb-3">✅ Covered Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {results.keywordAnalysis.coveredKeywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-sm font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {results.keywordAnalysis.missingKeywords.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 dark:text-red-400 mb-3">❌ Missing Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {results.keywordAnalysis.missingKeywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full text-sm font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Experience Optimization */}
          {results.experienceOptimization && results.experienceOptimization.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                💼 Experience Selection
              </h3>
              <div className="space-y-4">
                {results.experienceOptimization.map((exp, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${exp.included
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {exp.included ? '✅' : '❌'} {exp.company} - {exp.position}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${exp.relevanceScore >= 70
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        {exp.relevanceScore}% relevance
                      </span>
                    </div>
                    {exp.reasoning && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{exp.reasoning}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills Optimization */}
          {results.skillsOptimization && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                🔧 Skills Optimization
              </h3>
              <div className="space-y-6">
                {results.skillsOptimization.technicalSkills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Technical Skills (Selected)</h4>
                    <div className="flex flex-wrap gap-2">
                      {results.skillsOptimization.technicalSkills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {results.skillsOptimization.softSkills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Soft Skills (Selected)</h4>
                    <div className="flex flex-wrap gap-2">
                      {results.skillsOptimization.softSkills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {results.skillsOptimization.missingSkills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">⚠️ Missing Important Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {results.skillsOptimization.missingSkills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analysis Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Strengths */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border-l-4 border-green-500">
              <h4 className="text-lg font-semibold text-green-800 dark:text-green-400 mb-4 flex items-center gap-2">
                💪 Strengths
              </h4>
              {results.strengths.length > 0 ? (
                <ul className="space-y-2">
                  {results.strengths.map((item, index) => (
                    <li key={index} className="text-green-700 dark:text-green-300 text-sm leading-relaxed">
                      • {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-green-600 dark:text-green-400 text-sm italic">
                  No specific strengths highlighted by the analysis.
                </p>
              )}
            </div>

            {/* Gaps */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border-l-4 border-red-500">
              <h4 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-4 flex items-center gap-2">
                🔍 Gaps to Address
              </h4>
              {results.gaps.length > 0 ? (
                <ul className="space-y-2">
                  {results.gaps.map((item, index) => (
                    <li key={index} className="text-red-700 dark:text-red-300 text-sm leading-relaxed">
                      • {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-red-600 dark:text-red-400 text-sm italic">
                  No significant gaps identified.
                </p>
              )}
            </div>

            {/* Suggestions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border-l-4 border-blue-500">
              <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-400 mb-4 flex items-center gap-2">
                💡 Improvement Suggestions
              </h4>
              {results.suggestions.length > 0 ? (
                <ul className="space-y-2">
                  {results.suggestions.map((item, index) => (
                    <li key={index} className="text-blue-700 dark:text-blue-300 text-sm leading-relaxed">
                      • {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-blue-600 dark:text-blue-400 text-sm italic">
                  No specific suggestions provided.
                </p>
              )}
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 text-center">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-2">
              🚀 Next Steps
            </h4>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your AI-optimized documents are ready! Continue to your application.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationResults;
