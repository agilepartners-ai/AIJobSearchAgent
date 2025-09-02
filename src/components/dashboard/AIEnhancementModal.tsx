import React, { useEffect, useState } from 'react';
import { X, Download, FileText, CheckCircle, AlertCircle, Target, TrendingUp, Award, Brain, Settings, Upload, HardDrive, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import OptimizationResults from './OptimizationResults';
import { ResumeExtractionService } from '../../services/resumeExtractionService';
import { AIEnhancementService } from '../../services/aiEnhancementService';
import { UserProfileData, ProfileService } from '../../services/profileService';
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
    id: string;
    position: string;
    company_name: string;
    location?: string;
  };
  detailedUserProfile?: UserProfileData | null;
  onSave: (resumeUrl: string, coverLetterUrl: string) => void;
  onClose: () => void;
}
/** Minimal focused types to reduce `any` usage in this file */
type AIKeywordAnalysis = {
  coverageScore?: number;
  present_keywords?: string[];
  missing_keywords?: string[];
};

type AIEnhancements = {
  detailed_resume_sections?: Record<string, any>;
  detailed_cover_letter?: Record<string, any>;
  enhanced_summary?: string;
  enhanced_experience_bullets?: any[];
};

type AIOptimizationResults = {
  aiEnhancements?: AIEnhancements;
  skillsOptimization?: { technicalSkills?: string[]; softSkills?: string[] };
  strengths?: string[];
  gaps?: string[];
  suggestions?: string[];
  keywordAnalysis?: AIKeywordAnalysis;
  parsedResume?: { personal?: { name?: string; email?: string; phone?: string; location?: string } };
  detailedUserProfile?: UserProfileData | null;
  user?: { email?: string; displayName?: string };
  extractedText?: string;
  optimizedResumeUrl?: string;
  optimizedCoverLetterUrl?: string;
  matchScore?: number;
  analysis?: Record<string, any>;
  enhancements?: Record<string, any>;
  rawAIResponse?: any;
};

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
  applicationData = { id: '', position: '', company_name: '' },
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
  // NEW: additional instructions for AI
  const [additionalPrompt, setAdditionalPrompt] = React.useState<string>('');
  // NEW: editable full AI prompt (user prompt)
  const [aiPrompt, setAiPrompt] = React.useState<string>('');

  // NEW: editable AI system prompt
  const [systemPrompt, setSystemPrompt] = React.useState<string>('');
  // NEW: track if user edited prompts to avoid resetting them
  const [aiPromptEdited, setAiPromptEdited] = React.useState<boolean>(false);
  const [systemPromptEdited, setSystemPromptEdited] = React.useState<boolean>(false);
  // DEBUG toggle for advanced options (used by several conditional sections)
  const [showDebugOptions, setShowDebugOptions] = React.useState<boolean>(false);


  const { user } = useAuth();
  const config = AIEnhancementService.getConfiguration();

  // NEW: resolve user profile (prop -> fetched)
  const [resolvedProfile, setResolvedProfile] = React.useState<UserProfileData | null>(detailedUserProfile ?? null);

  useEffect(() => {
    if (detailedUserProfile) setResolvedProfile(detailedUserProfile);
  }, [detailedUserProfile]);

  useEffect(() => {
    // fetch only if not provided by props
    if (!resolvedProfile && user?.id) {
      ProfileService.getUserProfile(user.id)
        .then((p) => p && setResolvedProfile(p))
        .catch(() => {/* ignore */ });
    }
  }, [resolvedProfile, user?.id]);

  // Keep jobDescription in sync with Redux (for persistence)
  useEffect(() => {
    if (jobDescription && jobDescription !== persistedJobDescription) {
      dispatch({ type: 'aiEnhancementModal/openModal', payload: { jobDescription } });
    }
  }, [jobDescription, dispatch, persistedJobDescription]);

  // Initialize prompts with defaults only if not edited
  useEffect(() => {
    const resumeText =
      extractedPDFData?.text ||
      manualText ||
      '';
    const jd = jobDescription || persistedJobDescription || '';

    const defaultHeader = AIEnhancementService['createUserSystemPrompt'](resumeText, jd);
    const defaultSystem = AIEnhancementService['createDetailedSystemPrompt']();

    if (!aiPromptEdited) setAiPrompt(defaultHeader);
    if (!systemPromptEdited) setSystemPrompt(defaultSystem);
  }, [
    extractedPDFData?.text,
    manualText,
    jobDescription,
    persistedJobDescription,
    aiPromptEdited,
    systemPromptEdited
  ]);

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
    if (!selectedFileMeta && !cloudFileUrl && !extractedPDFData?.text && !manualText.trim()) {
      dispatch(setError('Please select a resume file or provide resume text'));
      return;
    }

    // Replace whole (header) prompt with text box value
    if (!aiPrompt.trim()) {
      dispatch(setError('AI prompt is required.'));
      return;
    }

    setUploadComplete(false);

    // Check API configuration
    const isGemini = config.defaultModelType.toLowerCase() === 'gemini' || config.defaultModelType.toLowerCase() === 'gemnin';
    if (isGemini ? !config.hasGeminiApiKey : !config.hasApiKey) {
      dispatch(setError(
        isGemini
          ? 'Gemini API key is not configured. Please set NEXT_PUBLIC_GEMINI_API_KEY in your environment variables.'
          : 'OpenAI API key is not configured. Please set NEXT_PUBLIC_OPENAI_API_KEY in your environment variables.'
      ));
      return;
    }

    // Remove job description validation; the user header is authoritative
    // (no validateEnhancementRequest call here)

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

      // Step 2: Enhance resume using AI with strict prompt overrides
      setExtractionProgress('Analyzing resume with AI...');

      const enhancementResult = await AIEnhancementService.enhanceWithOpenAI(
        resumeText,
        jobDescription || persistedJobDescription || '',
        {
          modelType: config.defaultModelType,
          model: config.defaultModel,
          fileId: documentId,
          userPromptOverride: aiPrompt,       // header only; service will append fixed context
          systemPromptOverride: systemPrompt  // full replacement if edited
        }
      );

      if (!enhancementResult.success) {
        throw new Error(enhancementResult.error || 'Failed to analyze resume. Please try again.');
      }

      setExtractionProgress('Generating optimization recommendations...');

      // Generate mock URLs for the enhanced documents
      const timestamp = Date.now();
      const enhancedResumeUrl = FinalResumeUrl;
      const enhancedCoverLetterUrl = FinalCoverLetterUrl;

      // Structure results using the detailed AI analysis
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
          technicalSkills: enhancementResult.enhancements.detailed_resume_sections?.technical_skills || enhancementResult.enhancements.enhanced_skills.slice(0, 8),
          softSkills: enhancementResult.enhancements.detailed_resume_sections?.soft_skills || ["Leadership", "Problem Solving", "Communication", "Team Collaboration"],
          missingSkills: enhancementResult.analysis.keyword_analysis.missing_keywords.slice(0, 5)
        },

        // Include parsed resume data BUT WITHOUT placeholders (avoid polluting fallbacks)
        parsedResume: {
          personal: {
            name: resolvedProfile?.fullName || '',
            email: resolvedProfile?.email || user?.email || '',
            phone: resolvedProfile?.phone || '',
            location: resolvedProfile?.location || ''
          }
        },

        // Include detailed AI enhancements
        aiEnhancements: {
          enhancedSummary: enhancementResult.enhancements.enhanced_summary,
          enhancedExperienceBullets: enhancementResult.enhancements.enhanced_experience_bullets,
          coverLetterOutline: enhancementResult.enhancements.cover_letter_outline,
          sectionRecommendations: enhancementResult.analysis.section_recommendations,
          // Add detailed sections
          detailedResumeSections: enhancementResult.enhancements.detailed_resume_sections || {},
          detailedCoverLetter: enhancementResult.enhancements.detailed_cover_letter || {}
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
        detailedUserProfile: resolvedProfile, // ensure profile is available to HTML generators
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

  React.useEffect(() => {
    console.log('🔍 showResults changed:', showResults);
    console.log('🔍 optimizationResults:', optimizationResults);
  }, [showResults, optimizationResults]);

  const [uploadComplete, setUploadComplete] = useState(false);
  const [FinalResumeUrl, setFinalResumeUrl] = useState<string | null>(null);
  const [FinalCoverLetterUrl, setFinalCoverLetterUrl] = useState<string | null>(null);

  React.useEffect(() => {
    const shouldUpload =
      showResults &&
      optimizationResults &&
      applicationData?.id &&
      typeof window !== 'undefined' &&
      !uploadComplete &&
      (!FinalResumeUrl || !FinalCoverLetterUrl); // <-- key check

    if (!shouldUpload) return;

    const detailedResumeHtml = generateDetailedResumeHTML(optimizationResults);
    const detailedCoverLetterHtml = generateDetailedCoverLetterHTML(optimizationResults);

    const uploadPDFs = async () => {
      try {
        const response = await fetch('/api/save-generated-pdfs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            jobApplicationId: applicationData.id,
            resumeHtml: detailedResumeHtml,
            coverLetterHtml: detailedCoverLetterHtml,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to upload PDFs');
        }

        console.log('✅ PDFs uploaded:', result);

        setFinalResumeUrl(result.resumeUrl);
        setFinalCoverLetterUrl(result.coverLetterUrl);
        setUploadComplete(true); // ✅ prevent re-upload

      } catch (error) {
        console.error('❌ Error uploading PDFs:', error);
      }
    };

    uploadPDFs();
  }, [showResults, optimizationResults, applicationData?.id]);

  React.useEffect(() => {
    if (
      !uploadComplete ||
      !FinalResumeUrl ||
      !FinalCoverLetterUrl ||
      !optimizationResults
    ) return;

    const alreadyUpdated = optimizationResults.optimizedResumeUrl === FinalResumeUrl &&
      optimizationResults.optimizedCoverLetterUrl === FinalCoverLetterUrl;

    if (alreadyUpdated) return; // ✅ Prevent unnecessary updates

    const updatedResults = {
      ...optimizationResults,
      optimizedResumeUrl: FinalResumeUrl,
      optimizedCoverLetterUrl: FinalCoverLetterUrl
    };

    dispatch(setOptimizationResults(updatedResults));
    console.log('✅ optimizationResults updated with Final URLs');
  }, [uploadComplete, FinalResumeUrl, FinalCoverLetterUrl, optimizationResults]);


  if (showResults && optimizationResults) {
    console.log('🎯 Rendering OptimizationResults component with detailed content');
    console.log('🎯 Results data:', optimizationResults);

    const detailedResumeHtml = generateDetailedResumeHTML(optimizationResults);
    const detailedCoverLetterHtml = generateDetailedCoverLetterHTML(optimizationResults);

    return (
      <OptimizationResults
        results={{
          resume_html: detailedResumeHtml,
          cover_letter_html: detailedCoverLetterHtml,
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
            missingKeywords: [],
          },
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

        {/* Loading Screen - positioned below header and above content */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
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

        {/* Main Content - hidden during loading */}
        {!loading && (
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


          {/* Editable AI System Prompt Section */}
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              AI System Prompt (replace the entire system prompt sent to the AI)
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => {
                setSystemPrompt(e.target.value);
                setSystemPromptEdited(true);
              }}
              placeholder="Edit the full system prompt sent to the AI here..."
              className="w-full h-28 p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-y text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              If edited, the system prompt will completely replace the default system instructions.
            </p>
          </div>

          {/* Editable AI User Prompt Section */}
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              AI User Prompt Header (only this part is editable; context is auto-appended)
            </label>
            <textarea
              value={aiPrompt}
              onChange={(e) => {
                setAiPrompt(e.target.value);
                setAiPromptEdited(true);
              }}
              placeholder="Edit the user prompt header. Job description and resume context will be appended automatically."
              className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-y text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The following is always appended and cannot be edited here:
              "Use this for context: JOB DESCRIPTION: ${'{jobDescription}'} CURRENT RESUME: ${'{resumeText}'}"
            </p>
          </div>

          {/* Editable AI Prompt Section */}
          {showDebugOptions && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                AI Prompt (edit the full prompt sent to the AI)
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Edit the full prompt sent to the AI here..."
                className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-y text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                You can fully customize the prompt sent to the AI. This will override any additional instructions.
              </p>
            </div>
          )}

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
          {showDebugOptions && extractedPDFData && (
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
              disabled={
                loading ||
                // allow if we have a file OR extracted/manual text
                (!selectedFileMeta && !cloudFileUrl && !extractedPDFData?.text && !manualText.trim()) ||
                (
                  config.defaultModelType.toLowerCase() === 'gemini' || config.defaultModelType.toLowerCase() === 'gemnin'
                    ? !config.hasGeminiApiKey
                    : !config.hasApiKey
                )
              }
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
              className="px-6 py-3 bg-red-600 dark:bg-red-700 text-white rounded-lg font-medium hover:bg-red-700 dark:hover:bg-red-800 transition-all"
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
        )}

        {/* Action Buttons - Always visible */}
        <div className="flex gap-4 p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            type="button"
            onClick={handleGenerateAI}
            disabled={
              loading ||
              (!selectedFileMeta && !cloudFileUrl) ||
              !(jobDescription || persistedJobDescription || '').trim() ||
              (
                config.defaultModelType.toLowerCase() === 'gemini' || config.defaultModelType.toLowerCase() === 'gemnin'
                  ? !config.hasGeminiApiKey
                  : !config.hasApiKey
              )
            }
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
            className="px-6 py-3 bg-red-600 dark:bg-red-700 text-white rounded-lg font-medium hover:bg-red-700 dark:hover:bg-red-800 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIEnhancementModal;

// Helper functions to generate detailed HTML content with better formatting
const generateDetailedResumeHTML = (results: any): string => {
  const sections = results.aiEnhancements?.detailedResumeSections || {};
  // prefer profile -> auth user -> parsed resume -> placeholder
  const profile = results.detailedUserProfile || {};
  const authUser = results.user || {};
  const parsedPersonal = results.parsedResume?.personal || {};

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

  return `
    <div style="font-family: 'Arial', sans-serif; line-height: 1.4; color: #000000; background-color: #ffffff; max-width: 800px; margin: 20px auto; padding: 20px;">
      <!-- Header Section -->
      <header style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; background-color: #ffffff;">
        <h1 style="font-size: 26px; margin-bottom: 8px; color: #2563eb; font-weight: 700;">${name}</h1>
        <div style="font-size: 13px; color: #000000; margin-bottom: 5px;">
          <span>${email}</span>${phone ? ` • <span>${phone}</span>` : ''}${location ? ` • <span>${location}</span>` : ''}
        </div>
      </header>

      <!-- Professional Summary -->
      <section style="margin-bottom: 20px; background-color: #ffffff;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600; background-color: #ffffff;">PROFESSIONAL SUMMARY</h2>
        <p style="text-align: justify; line-height: 1.6; font-size: 13px; margin: 0; color: #000000; background-color: #ffffff;">
          ${sections.professional_summary || results.aiEnhancements?.enhancedSummary || 'AI-enhanced professional summary highlighting relevant experience, key skills, and value proposition tailored to the target position. This comprehensive summary demonstrates alignment with job requirements and showcases unique qualifications that make the candidate an ideal fit for the role.'}
        </p>
      </section>

      <!-- Technical Skills -->
      <section style="margin-bottom: 20px; background-color: #ffffff;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600; background-color: #ffffff;">TECHNICAL SKILLS</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 6px; margin-bottom: 8px; background-color: #ffffff;">
          ${(sections.technical_skills || results.skillsOptimization?.technicalSkills || []).map((skill: string) =>
    `<span style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #000000; border: 1px solid #e5e7eb;">${skill}</span>`
  ).join('')}
        </div>
      </section>

      <!-- Core Competencies -->
      <section style="margin-bottom: 20px; background-color: #ffffff;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600; background-color: #ffffff;">CORE COMPETENCIES</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 6px; background-color: #ffffff;">
          ${(sections.soft_skills || results.skillsOptimization?.softSkills || []).map((skill: string) =>
    `<span style="background: #e0f2fe; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #000000; border: 1px solid #b3e5fc;">${skill}</span>`
  ).join('')}
        </div>
      </section>

      <!-- Professional Experience -->
      <section style="margin-bottom: 20px; background-color: #ffffff;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600; background-color: #ffffff;">PROFESSIONAL EXPERIENCE</h2>
        ${(sections.experience || []).map((exp: any) => `
          <div style="margin-bottom: 18px; page-break-inside: avoid; background-color: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; background-color: #ffffff;">
              <h3 style="font-size: 14px; font-weight: 600; margin: 0; color: #2563eb;">${exp.position || 'Job Title'}</h3>
              <span style="font-size: 12px; color: #000000; font-weight: 500;">${exp.duration || 'Start - End'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; background-color: #ffffff;">
              <span style="font-size: 13px; color: #000000; font-weight: 500;">${exp.company || 'Company Name'}</span>
              <span style="font-size: 12px; color: #000000;">${exp.location || 'City, State'}</span>
            </div>

            ${exp.key_responsibilities?.length ? `
              <div style="margin-bottom: 8px; background-color: #ffffff;">
                <strong style="font-size: 12px; color: #000000;">Key Responsibilities:</strong>
                <ul style="margin: 3px 0 0 15px; padding: 0;">
                  ${exp.key_responsibilities.map((resp: string) => `<li style="margin-bottom: 3px; font-size: 12px; line-height: 1.4; color: #000000;">${resp}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            ${exp.achievements?.length ? `
              <div style="margin-bottom: 8px; background-color: #ffffff;">
                <strong style="font-size: 12px; color: #000000;">Key Achievements:</strong>
                <ul style="margin: 3px 0 0 15px; padding: 0;">
                  ${exp.achievements.map((achievement: string) => `<li style="margin-bottom: 3px; font-size: 12px; line-height: 1.4; color: #000000;">${achievement}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            ${exp.technologies_used?.length ? `
              <div style="margin-top: 5px; background-color: #ffffff;">
                <strong style="font-size: 11px; color: #000000;">Technologies:</strong>
                <span style="font-size: 11px; color: #000000;"> ${exp.technologies_used.join(', ')}</span>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </section>

      <!-- Education -->
      ${sections.education?.length ? `
        <section style="margin-bottom: 20px; background-color: #ffffff;">
          <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600; background-color: #ffffff;">EDUCATION</h2>
          ${sections.education.map((edu: any) => `
            <div style="margin-bottom: 12px; background-color: #ffffff;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; background-color: #ffffff;">
                <h3 style="font-size: 13px; font-weight: 600; margin: 0; color: #2563eb;">${edu.degree || 'Degree'} in ${edu.field_of_study || 'Field'}</h3>
                <span style="font-size: 12px; color: #000000;">${edu.graduation_date || 'Year'}</span>
              </div>
              <div style="font-size: 12px; color: #000000; margin-bottom: 3px;">${edu.institution || 'Institution Name'}</div>
              ${edu.gpa ? `<div style="font-size: 11px; color: #000000;">GPA: ${edu.gpa}</div>` : ''}
              ${edu.relevant_coursework?.length ? `
                <div style="margin-top: 3px; background-color: #ffffff;">
                  <strong style="font-size: 11px; color: #000000;">Relevant Coursework:</strong>
                  <span style="font-size: 11px; color: #000000;"> ${edu.relevant_coursework.join(', ')}</span>
                </div>
              ` : ''}
              ${edu.honors?.length ? `
                <div style="margin-top: 3px; background-color: #ffffff;">
                  <strong style="font-size: 11px; color: #000000;">Honors:</strong>
                  <span style="font-size: 11px; color: #000000;"> ${edu.honors.join(', ')}</span>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </section>
      ` : ''}

      <!-- Projects -->
      ${sections.projects?.length ? `
        <section style="margin-bottom: 20px; background-color: #ffffff;">
          <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600; background-color: #ffffff;">KEY PROJECTS</h2>
          ${sections.projects.map((project: any) => `
            <div style="margin-bottom: 15px; page-break-inside: avoid; background-color: #ffffff;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; background-color: #ffffff;">
                <h3 style="font-size: 13px; font-weight: 600; margin: 0; color: #2563eb;">${project.name || 'Project Name'}</h3>
                <span style="font-size: 11px; color: #000000;">${project.duration || 'Duration'}</span>
              </div>
              <p style="font-size: 12px; margin-bottom: 5px; line-height: 1.4; color: #000000;">${project.description || 'Project description'}</p>
              ${project.achievements?.length ? `
                <ul style="margin: 5px 0 0 15px; padding: 0;">
                  ${project.achievements.map((achievement: string) => `<li style="margin-bottom: 2px; font-size: 12px; color: #000000;">${achievement}</li>`).join('')}
                </ul>
              ` : ''}
              ${project.technologies?.length ? `
                <div style="margin-top: 5px; background-color: #ffffff;">
                  <strong style="font-size: 11px; color: #000000;">Technologies:</strong>
                  <span style="font-size: 11px; color: #000000;"> ${project.technologies.join(', ')}</span>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </section>
      ` : ''}

      <!-- Certifications -->
      ${sections.certifications?.length ? `
        <section style="margin-bottom: 20px; background-color: #ffffff;">
          <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600; background-color: #ffffff;">CERTIFICATIONS</h2>
          ${sections.certifications.map((cert: any) => `
            <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; background-color: #ffffff;">
              <div>
                <strong style="font-size: 12px; color: #000000;">${cert.name || 'Certification Name'}</strong>
                <div style="font-size: 11px; color: #000000;">${cert.issuing_organization || 'Issuing Organization'}</div>
              </div>
              <div style="text-align: right; font-size: 11px; color: #000000;">
                <div>Issued: ${cert.issue_date || 'Date'}</div>
                ${cert.expiration_date ? `<div>Expires: ${cert.expiration_date}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </section>
      ` : ''}

      <!-- Awards -->
      ${sections.awards?.length ? `
        <section style="margin-bottom: 20px; background-color: #ffffff;">
          <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600; background-color: #ffffff;">AWARDS & RECOGNITION</h2>
          ${sections.awards.map((award: any) => `
            <div style="margin-bottom: 8px; background-color: #ffffff;">
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <strong style="font-size: 12px; color: #000000;">${award.title || 'Award Title'}</strong>
                <span style="font-size: 11px; color: #000000;">${award.date || 'Date'}</span>
              </div>
              <div style="font-size: 11px; color: #000000;">${award.issuing_organization || 'Organization'}</div>
              ${award.description ? `<p style="font-size: 11px; margin-top: 2px; line-height: 1.3; color: #000000;">${award.description}</p>` : ''}
            </div>
          `).join('')}
        </section>
      ` : ''}

      <!-- Volunteer Work -->
      ${sections.volunteer_work?.length ? `
        <section style="margin-bottom: 20px; background-color: #ffffff;">
          <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600; background-color: #ffffff;">VOLUNTEER EXPERIENCE</h2>
          ${sections.volunteer_work.map((vol: any) => `
            <div style="margin-bottom: 12px; background-color: #ffffff;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px;">
                <strong style="font-size: 12px; color: #000000;">${vol.role || 'Volunteer Role'}</strong>
                <span style="font-size: 11px; color: #000000;">${vol.duration || 'Duration'}</span>
              </div>
              <div style="font-size: 11px; color: #000000; margin-bottom: 3px;">${vol.organization || 'Organization Name'}</div>
              <p style="font-size: 11px; line-height: 1.3; margin-bottom: 3px; color: #000000;">${vol.description || 'Description of volunteer work'}</p>
              ${vol.achievements?.length ? `
                <ul style="margin: 3px 0 0 15px; padding: 0;">
                  ${vol.achievements.map((achievement: string) => `<li style="margin-bottom: 2px; font-size: 11px; color: #000000;">${achievement}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </section>
      ` : ''}

      <!-- Publications -->
      ${sections.publications?.length ? `
        <section style="margin-bottom: 20px; background-color: #ffffff;">
          <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600; background-color: #ffffff;">PUBLICATIONS</h2>
          ${sections.publications.map((pub: any) => `
            <div style="margin-bottom: 10px; background-color: #ffffff;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
                <strong style="font-size: 12px; color: #000000;">${pub.title || 'Publication Title'}</strong>
                <span style="font-size: 11px; color: #000000;">${pub.date || 'Date'}</span>
              </div>
              <div style="font-size: 11px; color: #000000; font-style: italic; margin-bottom: 2px;">${pub.publication || 'Publication Name'}</div>
              ${pub.authors?.length ? `<div style="font-size: 10px; color: #000000;">Authors: ${pub.authors.join(', ')}</div>` : ''}
              ${pub.description ? `<p style="font-size: 11px; margin-top: 3px; line-height: 1.3; color: #000000;">${pub.description}</p>` : ''}
            </div>
          `).join('')}
        </section>
      ` : ''}
    </div>
  `;
};

const generateDetailedCoverLetterHTML = (results: any): string => {
  const coverLetter = results.aiEnhancements?.detailedCoverLetter || {};
  const jobDetails = results.applicationData || {};
  // prefer profile -> auth user -> parsed resume -> placeholder
  const profile = results.detailedUserProfile || {};
  const authUser = results.user || {};
  const parsedPersonal = results.parsedResume?.personal || {};

  const name =
    (profile.fullName && profile.fullName.trim()) ||
    authUser.displayName ||
    (parsedPersonal.name && parsedPersonal.name.trim()) ||
    'Your Name';

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

  return `
    <div style="font-family: 'Arial', sans-serif; line-height: 1.5; color: #000000; background-color: #ffffff; max-width: 700px; margin: 20px auto; padding: 20px;">
      <!-- Header -->
      <header style="text-align: center; margin-bottom: 30px; background-color: #ffffff;">
        <h1 style="font-size: 22px; margin-bottom: 8px; color: #2563eb; font-weight: 600;">${name}</h1>
        <div style="font-size: 13px; color: #000000;">
          <div>${email}${phone ? ` • ${phone}` : ''}</div>
          ${location ? `<div>${location}</div>` : ''}
        </div>
      </header>

      <!-- Date -->
      <div style="margin-bottom: 25px; text-align: right; background-color: #ffffff;">
        <p style="font-size: 13px; color: #000000; margin: 0;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <!-- Employer Info -->
      <div style="margin-bottom: 25px; background-color: #ffffff;">
        <p style="font-size: 13px; color: #000000; margin: 0; line-height: 1.4;">
          Hiring Manager<br>
          ${jobDetails.company_name || 'Company Name'}<br>
          ${jobDetails.location || 'Company Location'}
        </p>
      </div>

      <!-- Subject Line -->
      <div style="margin-bottom: 20px; background-color: #ffffff;">
        <p style="font-size: 13px; color: #000000; margin: 0;">
          <strong>Re: Application for ${jobDetails.position || 'Position Title'}</strong>
        </p>
      </div>

      <!-- Salutation -->
      <div style="margin-bottom: 15px; background-color: #ffffff;">
        <p style="font-size: 13px; color: #000000; margin: 0;">Dear Hiring Manager,</p>
      </div>

      <!-- Opening Paragraph -->
      <div style="margin-bottom: 20px; background-color: #ffffff;">
        <p style="font-size: 13px; line-height: 1.6; text-align: justify; color: #000000; margin: 0;">
          ${coverLetter.opening_paragraph ||
    `I am writing to express my strong interest in the ${jobDetails.position || 'Position Title'} role at ${jobDetails.company_name || 'Company Name'}. With my comprehensive background in relevant technologies and proven track record of delivering exceptional results, I am excited about the opportunity to contribute to your team's continued success. My experience aligns perfectly with your requirements, and I am particularly drawn to this position because of its potential for professional growth and the company's reputation for innovation. Having researched your organization extensively, I am confident that my skills and passion make me an ideal candidate for this role.`
    }
        </p>
      </div>

      <!-- Body Paragraph -->
      <div style="margin-bottom: 20px; background-color: #ffffff;">
        <p style="font-size: 13px; line-height: 1.6; text-align: justify; color: #000000; margin: 0;">
          ${coverLetter.body_paragraph ||
    `Throughout my career, I have developed extensive expertise in key areas that directly align with your job requirements. In my previous roles, I have successfully led cross-functional teams, implemented innovative solutions that improved efficiency by significant percentages, and consistently delivered projects on time and within budget. My technical skills encompass the full range of technologies mentioned in your job posting, and I have applied these in real-world scenarios to drive measurable business outcomes. For example, I spearheaded initiatives that resulted in substantial cost savings, improved user satisfaction scores, and enhanced system performance metrics. I am particularly excited about the opportunity to bring my passion for problem-solving and my collaborative approach to your dynamic team, where I can contribute to achieving your organization's strategic objectives while continuing to grow professionally. My experience in stakeholder management, agile methodologies, and continuous improvement positions me well to make an immediate impact in this role.`
    }
        </p>
      </div>

      <!-- Closing Paragraph -->
      <div style="margin-bottom: 25px; background-color: #ffffff;">
        <p style="font-size: 13px; line-height: 1.6; text-align: justify; color: #000000; margin: 0;">
          ${coverLetter.closing_paragraph ||
    `I am eager to discuss how my background, skills, and enthusiasm can contribute to ${jobDetails.company_name || 'your company'}'s continued success. I would welcome the opportunity to speak with you about how I can add value to your team and help achieve your business goals. Thank you for your time and consideration. I look forward to hearing from you soon and am available at your convenience for an interview.`
    }
        </p>
      </div>

      <!-- Sign-off -->
      <div style="margin-bottom: 15px; background-color: #ffffff;">
        <p style="font-size: 13px; color: #000000; margin: 0;">
          Sincerely,<br><br>
          ${name}
        </p>
      </div>

      <!-- Footer -->
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; background-color: #ffffff;">
        <p style="font-size: 11px; color: #000000; margin: 0;">
          This cover letter was AI-enhanced and personalized for the ${jobDetails.position || 'target position'} at ${jobDetails.company_name || 'the company'}.
        </p>
      </div>
    </div>
  `;
};