import React, { useEffect } from 'react';
import { X, Download, FileText, CheckCircle, AlertCircle, Target, TrendingUp, Award, Brain, Settings, Upload, HardDrive, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import OptimizationResults from './OptimizationResults';
import { ResumeExtractionService } from '../../services/resumeExtractionService';
import { AIEnhancementService } from '../../services/aiEnhancementService';
import { UserProfileData } from '../../services/profileService';
import { useAuth } from '../../hooks/useAuth';
import { extractTextFromPDF, validatePDFFile, PDFExtractionResult, extractTextFallback } from '../../utils/pdfUtils';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setSelectedFile,
  setCloudProvider,
  setCloudFileUrl,
  setError,
  setShowResults,
  setOptimizationResults,
  resetState,
} from '../../store/aiEnhancementModalSlice';

interface AIEnhancementModalProps {
  jobDescription: string;
  applicationData?: {
    position: string;
    company_name: string;
    location?: string;
  };
  detailedUserProfile?: UserProfileData | null;
  onSave: (resumeUrl: string, coverLetterUrl: string) => void;
  onClose: () => void;
}

// Generate a random UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const AIEnhancementModal: React.FC<AIEnhancementModalProps> = ({
  jobDescription,
  applicationData = { position: '', company_name: '' },
  detailedUserProfile,
  onSave,
  onClose
}) => {
  const dispatch = useAppDispatch();
  const {
    selectedFileMeta,
    selectedFileContent,
    cloudProvider,
    cloudFileUrl,
    error,
    showResults,
    optimizationResults,
    jobDescription: persistedJobDescription,
  } = useAppSelector((state) => state.aiEnhancementModal);
  const [loading, setLoading] = React.useState(false);
  const [extractionProgress, setExtractionProgress] = React.useState<string>('');
  const [documentId] = React.useState<string>(generateUUID());
  const [extractedPDFData, setExtractedPDFData] = React.useState<PDFExtractionResult | null>(null);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [showExtractedText, setShowExtractedText] = React.useState(false);
  const [showJobDescription, setShowJobDescription] = React.useState(true);
  const [copiedJobDesc, setCopiedJobDesc] = React.useState(false);
  const [copiedExtracted, setCopiedExtracted] = React.useState(false);
  const [manualText, setManualText] = React.useState<string>('');
  const [showManualInput, setShowManualInput] = React.useState(false);

  const { user } = useAuth();
  const config = AIEnhancementService.getConfiguration(); // Use AIEnhancementService instead

  // Keep jobDescription in sync with Redux (for persistence)
  useEffect(() => {
    if (jobDescription && jobDescription !== persistedJobDescription) {
      dispatch({ type: 'aiEnhancementModal/openModal', payload: { jobDescription } });
    }
  }, [jobDescription, dispatch, persistedJobDescription]);

  // File select handler: reads file as base64 and stores meta/content in Redux, plus extracts text
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate the file
    const validation = validatePDFFile(file);
    if (!validation.isValid) {
      dispatch(setError(validation.error || 'Please select a valid PDF or text file.'));
      return;
    }

    setIsExtracting(true);
    setShowManualInput(false);
    setManualText('');
    setExtractedPDFData(null);

    try {
      console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);

      // Read file as base64 for Redux storage
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        dispatch(setSelectedFile({
          meta: {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
          },
          content: base64,
        }));
        dispatch(setError(''));
        dispatch(setCloudFileUrl(''));
      };
      reader.readAsDataURL(file);

      // Extract text for debugging
      const extractionResult = await extractTextFromPDF(file);

      if (extractionResult.error) {
        if (extractionResult.error === 'MANUAL_INPUT_REQUIRED') {
          setShowManualInput(true);
          setExtractedPDFData(null);
          dispatch(setError('Automatic text extraction failed. Please paste your resume text manually below.'));
        } else {
          // Try fallback method
          const fallbackResult = await extractTextFallback(file);

          if (fallbackResult.error && !fallbackResult.text) {
            setShowManualInput(true);
            setExtractedPDFData(null);
            dispatch(setError('Unable to extract text automatically. Please paste your resume text in the manual input field below.'));
          } else {
            setExtractedPDFData(fallbackResult);
            setShowExtractedText(true);
            if (fallbackResult.text.length > 0) {
              console.log(`Text extracted successfully: ${fallbackResult.text.length} characters using fallback method.`);
            } else {
              dispatch(setError(fallbackResult.error || 'No text could be extracted from the file.'));
            }
          }
        }
      } else {
        setExtractedPDFData(extractionResult);
        setShowExtractedText(true);
        console.log(`File processed successfully: extracted ${extractionResult.text.length} characters from ${extractionResult.pages} pages.`);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setShowManualInput(true);
      setExtractedPDFData(null);
      dispatch(setError('Unable to process the file automatically. Please use the manual text input below.'));
    } finally {
      setIsExtracting(false);
    }
  };

  const handleManualTextSubmit = () => {
    if (!manualText.trim()) {
      dispatch(setError('Please paste your resume text before proceeding.'));
      return;
    }

    const manualResult: PDFExtractionResult = {
      text: manualText.trim(),
      pages: 1,
      metadata: { source: 'manual_input' }
    };

    setExtractedPDFData(manualResult);
    setShowExtractedText(true);
    setShowManualInput(false);
    dispatch(setError(''));
    console.log(`Resume text added: successfully added ${manualText.length} characters of resume text.`);
  };

  const copyToClipboard = async (text: string, type: 'job' | 'extracted') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'job') {
        setCopiedJobDesc(true);
        setTimeout(() => setCopiedJobDesc(false), 2000);
      } else {
        setCopiedExtracted(true);
        setTimeout(() => setCopiedExtracted(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy text to clipboard:', error);
    }
  };

  const handleCloudProviderChange = (provider: string) => {
    dispatch(setCloudProvider(provider));
    // Clear local file if cloud provider is selected
    dispatch(setSelectedFile({ meta: { name: '', type: '', size: 0, lastModified: 0 }, content: '' }));
    dispatch(setCloudFileUrl(''));
  };

  const downloadFileFromUrl = async (url: string): Promise<File> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }

      const blob = await response.blob();
      const filename = url.split('/').pop() || 'resume.pdf';
      return new File([blob], filename, { type: blob.type });
    } catch (error) {
      throw new Error('Failed to download file from URL. Please check the URL and permissions.');
    }
  };

  const handleGenerateAI = async () => {
    if (!selectedFileMeta && !cloudFileUrl && !extractedPDFData?.text) {
      dispatch(setError('Please select a resume file or provide resume text'));
      return;
    }

    if (!jobDescription.trim()) {
      dispatch(setError('Job description is required for AI enhancement'));
      return;
    }

    // Check API configuration
    if (!config.hasApiKey) {
      dispatch(setError('OpenAI API key is not configured. Please set NEXT_PUBLIC_OPENAI_API_KEY in your environment variables.'));
      return;
    }

    // Validate enhancement request
    const validation = AIEnhancementService.validateEnhancementRequest(jobDescription);
    if (!validation.isValid) {
      dispatch(setError(validation.error || 'Invalid request'));
      return;
    }

    setLoading(true);
    dispatch(setError(''));
    setExtractionProgress('');

    try {
      // Ensure we have resume text to work with
      let resumeText = '';

      if (extractedPDFData && extractedPDFData.text) {
        // Use previously extracted text
        resumeText = extractedPDFData.text;
        console.log('Using previously extracted text:', resumeText.length, 'characters');
      } else if (selectedFileMeta && selectedFileContent) {
        // Try to extract from file
        setExtractionProgress('Extracting text from uploaded file...');
        const arr = selectedFileContent.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const bstr = arr[1] ? atob(arr[1]) : '';
        let n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        const fileToProcess = new File([u8arr], selectedFileMeta.name, { type: mime });

        const extractionResult = await extractTextFromPDF(fileToProcess);
        if (extractionResult.text) {
          resumeText = extractionResult.text;
          setExtractedPDFData(extractionResult);
        } else {
          throw new Error('Unable to extract text from the uploaded file');
        }
      } else {
        throw new Error('No resume text available for analysis');
      }

      if (!resumeText || resumeText.trim().length < 50) {
        throw new Error('Resume text is too short or empty. Please provide a more detailed resume.');
      }

      // Step 2: Enhance resume using OpenAI directly (like AiJobSearch-old)
      setExtractionProgress('Analyzing resume with OpenAI...');

      const enhancementResult = await AIEnhancementService.enhanceWithOpenAI(
        resumeText,
        jobDescription,
        {
          modelType: config.defaultModelType,
          model: config.defaultModel,
          fileId: documentId
        }
      );

      if (!enhancementResult.success) {
        throw new Error(enhancementResult.error || 'Failed to analyze resume. Please try again.');
      }

      setExtractionProgress('Generating optimization recommendations...');

      // Generate mock URLs for the enhanced documents
      const timestamp = Date.now();
      const enhancedResumeUrl = `https://example.com/ai-enhanced-resume-${documentId}.pdf`;
      const enhancedCoverLetterUrl = `https://example.com/ai-enhanced-cover-letter-${documentId}.pdf`;

      // Structure results using the AI analysis
      const optimizationResults = {
        matchScore: enhancementResult.analysis.match_score,
        summary: enhancementResult.analysis.match_score >= 80
          ? `Excellent match! Your resume shows strong alignment with this position (${enhancementResult.analysis.match_score}% match). The AI has identified key strengths and provided targeted recommendations for optimization.`
          : enhancementResult.analysis.match_score >= 70
            ? `Good match! Your resume aligns well with this position (${enhancementResult.analysis.match_score}% match). The AI has identified areas for improvement to strengthen your application.`
            : `Moderate match (${enhancementResult.analysis.match_score}% match). The AI has identified significant opportunities to better align your resume with this position.`,

        // Use real AI analysis data
        strengths: enhancementResult.analysis.strengths,
        gaps: enhancementResult.analysis.gaps,
        suggestions: enhancementResult.analysis.suggestions,

        optimizedResumeUrl: enhancedResumeUrl,
        optimizedCoverLetterUrl: enhancedCoverLetterUrl,

        // Use real keyword analysis
        keywordAnalysis: {
          coverageScore: enhancementResult.analysis.keyword_analysis.keyword_density_score,
          coveredKeywords: enhancementResult.analysis.keyword_analysis.present_keywords,
          missingKeywords: enhancementResult.analysis.keyword_analysis.missing_keywords
        },

        // Mock experience optimization (can be enhanced with more AI analysis)
        experienceOptimization: [],

        // Enhanced skills optimization using AI data
        skillsOptimization: {
          technicalSkills: enhancementResult.enhancements.enhanced_skills.slice(0, 8),
          softSkills: ["Leadership", "Problem Solving", "Communication", "Team Collaboration"],
          missingSkills: enhancementResult.analysis.keyword_analysis.missing_keywords.slice(0, 5)
        },

        // Include parsed resume data (mock for now)
        parsedResume: {
          personal: {
            name: detailedUserProfile?.fullName || 'John Doe',
            email: detailedUserProfile?.email || 'john.doe@email.com',
            phone: detailedUserProfile?.phone || '+1 (555) 123-4567',
            location: detailedUserProfile?.location || 'City, State'
          }
        },

        // Include AI enhancements
        aiEnhancements: {
          enhancedSummary: enhancementResult.enhancements.enhanced_summary,
          enhancedExperienceBullets: enhancementResult.enhancements.enhanced_experience_bullets,
          coverLetterOutline: enhancementResult.enhancements.cover_letter_outline,
          sectionRecommendations: enhancementResult.analysis.section_recommendations
        },

        // Enhanced metadata
        extractionMetadata: {
          documentId: documentId,
          extractedTextLength: resumeText.length,
          processingTime: Date.now() - timestamp,
          modelUsed: enhancementResult.metadata.model_used,
          apiBaseUrl: 'OpenAI Direct',
          sectionsAnalyzed: enhancementResult.metadata.resume_sections_analyzed,
          // Include PDF debug info if available
          pdfExtraction: extractedPDFData ? {
            pages: extractedPDFData.pages,
            textLength: extractedPDFData.text.length,
            metadata: extractedPDFData.metadata,
            extractionMethod: extractedPDFData.metadata?.source || 'pdf_extraction'
          } : null
        },

        // Include raw AI response for debugging
        rawAIResponse: enhancementResult,

        // Add job context for PDF generation
        jobDescription: jobDescription,
        applicationData: applicationData,

        // Add detailed user profile and user for cover letter generation
        detailedUserProfile: detailedUserProfile,
        user: user,

        // Include extracted text for debugging
        extractedText: resumeText
      };

      console.log('✅ Setting optimization results:', optimizationResults);
      console.log('✅ About to show results screen...');

      // Set results first
      dispatch(setOptimizationResults(optimizationResults));

      // Then show results screen - add a small delay to ensure state is updated
      setTimeout(() => {
        console.log('✅ Showing results screen now...');
        dispatch(setShowResults(true));
      }, 100);

    } catch (err: any) {
      console.error('AI enhancement error:', err);

      // Enhanced error handling
      let userMessage = err.message;

      if (err.message.includes('API key')) {
        userMessage = 'OpenAI API key is not configured or invalid. Please check your environment variables.';
      } else if (err.message.includes('quota') || err.message.includes('429')) {
        userMessage = 'OpenAI API quota exceeded. Please try again later or check your usage limits.';
      } else if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
        userMessage = 'Unable to connect to the AI service. Please check your internet connection and try again.';
      } else if (err.message.includes('timeout') || err.message.includes('timed out')) {
        userMessage = 'The AI processing is taking longer than expected. Please try again with a smaller file or try again later.';
      } else if (!err.message || err.message === 'Failed to generate AI-enhanced documents. Please try again.') {
        userMessage = 'The AI service is temporarily unavailable. Please try again in a few minutes or contact support if the issue persists.';
      }

      dispatch(setError(userMessage));
    } finally {
      setLoading(false);
      setExtractionProgress('');
    }
  };

  // Helper method to convert resume JSON to text
  const convertResumeJsonToText = (resumeJson: any): string => {
    let text = '';

    if (resumeJson.personal) {
      text += `PERSONAL INFORMATION:\n`;
      text += `Name: ${resumeJson.personal.name || ''}\n`;
      text += `Email: ${resumeJson.personal.email || ''}\n`;
      text += `Phone: ${resumeJson.personal.phone || ''}\n\n`;
    }

    if (resumeJson.summary) {
      text += `PROFESSIONAL SUMMARY:\n${resumeJson.summary}\n\n`;
    }

    if (resumeJson.experience) {
      text += `WORK EXPERIENCE:\n`;
      resumeJson.experience.forEach((exp: any) => {
        text += `${exp.position || ''} at ${exp.company || ''}\n`;
        if (exp.description) text += `${exp.description}\n`;
      });
      text += '\n';
    }

    if (resumeJson.skills) {
      text += `SKILLS: ${Array.isArray(resumeJson.skills) ? resumeJson.skills.join(', ') : resumeJson.skills}\n\n`;
    }

    return text;
  };

  const handleResultsClose = () => {
    dispatch(setShowResults(false));
    // Save the URLs to the parent component
    if (optimizationResults) {
      onSave(optimizationResults.optimizedResumeUrl, optimizationResults.optimizedCoverLetterUrl);
    }
    onClose();
  };

  // Add debug logging to see what's happening with the results
  React.useEffect(() => {
    console.log('🔍 showResults changed:', showResults);
    console.log('🔍 optimizationResults:', optimizationResults);
  }, [showResults, optimizationResults]);

  if (showResults && optimizationResults) {
    console.log('🎯 Rendering OptimizationResults component');
    console.log('🎯 Results data:', optimizationResults);

    const coverLetterHtml = `
      <div>
        <h3>Opening</h3>
        <p>${optimizationResults.aiEnhancements?.coverLetterOutline?.opening || 'AI-generated opening paragraph will appear here.'}</p>
        
        <h3>Body</h3>
        <p>${optimizationResults.aiEnhancements?.coverLetterOutline?.body || 'AI-generated body content will appear here.'}</p>
        
        <h3>Closing</h3>
        <p>${optimizationResults.aiEnhancements?.coverLetterOutline?.closing || 'AI-generated closing paragraph will appear here.'}</p>
      </div>
    `;

    return (
      <OptimizationResults
        results={{
          resume_html: optimizationResults.aiEnhancements?.enhancedSummary || 'AI-enhanced resume summary will appear here.',
          cover_letter_html: coverLetterHtml,
        }}
        jobDetails={{
          title: applicationData?.position || 'Position',
          company: applicationData?.company_name || 'Company',
          description: jobDescription,
        }}
        analysisData={{
          matchScore: optimizationResults.matchScore || 85,
          summary: optimizationResults.summary || 'AI analysis summary will appear here.',
          strengths: optimizationResults.strengths || [],
          gaps: optimizationResults.gaps || [],
          suggestions: optimizationResults.suggestions || [],
          keywordAnalysis: optimizationResults.keywordAnalysis || {
            coverageScore: 75,
            coveredKeywords: [],
            missingKeywords: []
          }
        }}
        onBack={handleResultsClose}
      />
    );
  }

  console.log('🔍 Rendering main modal (not results screen)');
  console.log('🔍 showResults:', showResults, 'optimizationResults:', !!optimizationResults);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Loader Overlay */}
        {loading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm transition-all rounded-lg animate-fade-in">
            <div className="flex flex-col items-center gap-6">
              {/* Animated Brain Icon with Pulse */}
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-16 w-16 rounded-full bg-blue-400 opacity-40 animate-ping"></span>
                <span className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg animate-bounce-slow">
                  <Brain className="text-white animate-spin-slow" size={36} />
                </span>
              </div>
              {/* Progress Bar */}
              <div className="w-64 h-3 bg-blue-100 dark:bg-blue-900 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-progress-bar"></div>
              </div>
              <span className="text-lg font-semibold text-blue-700 dark:text-blue-300 animate-fade-in-text">
                {extractionProgress || "Generating your AI-enhanced resume & cover letter..."}
              </span>
            </div>
            <style>{`
              @keyframes bounce-slow {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-12px); }
              }
              .animate-bounce-slow {
                animation: bounce-slow 2s infinite;
              }
              @keyframes spin-slow {
                100% { transform: rotate(360deg); }
              }
              .animate-spin-slow {
                animation: spin-slow 3s linear infinite;
              }
              @keyframes progress-bar {
                0% { width: 0%; }
                80% { width: 90%; }
                100% { width: 100%; }
              }
              .animate-progress-bar {
                animation: progress-bar 2.5s cubic-bezier(0.4,0,0.2,1) infinite;
              }
              @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              .animate-fade-in {
                animation: fade-in 0.7s ease-in;
              }
              @keyframes fade-in-text {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .animate-fade-in-text {
                animation: fade-in-text 1.2s ease-in;
              }
            `}</style>
          </div>
        )}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Brain className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                AI Enhanced Resume & Cover Letter Generator
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Document ID: {documentId.slice(0, 8)}...
                {applicationData && (
                  <span className="ml-2">• {applicationData.position} at {applicationData.company_name}</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm flex items-start gap-3">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Job Description Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
            <button
              onClick={() => setShowJobDescription(!showJobDescription)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <Target className="text-blue-600 dark:text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  Target Job Description
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(jobDescription || persistedJobDescription || '', 'job');
                  }}
                  className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded"
                  title="Copy job description"
                >
                  {copiedJobDesc ? <Check size={16} /> : <Copy size={16} />}
                </button>
                {showJobDescription ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </button>

            {showJobDescription && (
              <div className="px-4 pb-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-600 max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-sans leading-relaxed">
                    {jobDescription || persistedJobDescription || ''}
                  </pre>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                  Character count: {(jobDescription || persistedJobDescription || '').length} | Lines: {(jobDescription || persistedJobDescription || '').split('\n').length}
                </p>
              </div>
            )}
          </div>

          {/* Resume Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              <Upload size={16} className="inline mr-2" />
              Upload Your Current Resume
            </label>

            {/* Local File Upload */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 mb-4">
              <div className="text-center">
                <HardDrive className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="flex flex-col items-center">
                  <label className="cursor-pointer">
                    <span className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                      Browse Local Files
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.txt"
                      onChange={handleFileSelect}
                      key={selectedFileMeta ? selectedFileMeta.name + selectedFileMeta.lastModified : 'empty'}
                    />
                  </label>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Only PDF or Text files (max 10MB)
                  </p>
                  {isExtracting && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      <span>Extracting text from file...</span>
                    </div>
                  )}
                  {selectedFileMeta && (
                    <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                      <p className="text-sm text-green-700 dark:text-green-400">
                        Selected: {selectedFileMeta.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Manual Text Input Section */}
          {showManualInput && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="text-yellow-600 dark:text-yellow-400" size={20} />
                Manual Resume Text Input
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Since automatic text extraction failed, please paste your resume content below:
              </p>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste your resume text here..."
                className="w-full h-48 p-4 border border-gray-300 dark:border-gray-600 rounded-lg resize-none text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <div className="flex justify-between items-center mt-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Characters: {manualText.length}
                </span>
                <button
                  onClick={handleManualTextSubmit}
                  disabled={!manualText.trim()}
                  className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Use This Text
                </button>
              </div>
            </div>
          )}

          {/* Extracted Text Debug Section */}
          {extractedPDFData && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowExtractedText(!showExtractedText)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <FileText className="text-gray-600 dark:text-gray-400" size={20} />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Extracted Resume Text (Debug)
                  </h3>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-xs font-medium">
                    {extractedPDFData.pages} pages • {extractedPDFData.text.length} chars
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {extractedPDFData.text && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(extractedPDFData.text, 'extracted');
                      }}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      title="Copy extracted text"
                    >
                      {copiedExtracted ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  )}
                  {showExtractedText ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {showExtractedText && (
                <div className="px-4 pb-4">
                  {extractedPDFData.error ? (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertCircle size={16} />
                        <span className="font-medium">Extraction Error</span>
                      </div>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {extractedPDFData.error}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 max-h-80 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
                          {extractedPDFData.text || 'No text extracted from PDF'}
                        </pre>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>📄 Pages: {extractedPDFData.pages}</span>
                        <span>📝 Characters: {extractedPDFData.text.length}</span>
                        <span>📊 Words: ~{extractedPDFData.text.split(/\s+/).length}</span>
                        {extractedPDFData.metadata && (
                          <span>📋 Source: {extractedPDFData.metadata.source || 'pdf_extraction'}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Generate Button */}
          <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleGenerateAI}
              disabled={loading || (!selectedFileMeta && !cloudFileUrl) || !(jobDescription || persistedJobDescription || '').trim() || !config.hasApiKey}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-6 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {extractionProgress || 'Processing...'}
                </>
              ) : (
                <>
                  <Brain size={20} />
                  Generate using AI - Resume & Cover Letter
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
          </div>

          {!extractedPDFData?.text && !showManualInput && selectedFileMeta && (
            <div className="text-center">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                ⚠️ If text extraction is taking too long, you can use manual text input instead.
              </p>
              <button
                onClick={() => setShowManualInput(true)}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Switch to manual text input
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIEnhancementModal;
