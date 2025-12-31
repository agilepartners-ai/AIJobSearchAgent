import React, { useEffect, useState, useRef } from 'react';
import { X, Download, FileText, CheckCircle, AlertCircle, Target, TrendingUp, Award, Brain, Settings, Upload, HardDrive, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import OptimizationResults from './OptimizationResults';
import { ResumeExtractionService } from '../../services/resumeExtractionService';
import { AIEnhancementService } from '../../services/aiEnhancementService';
import { UserProfileData, ProfileService } from '../../services/profileService';
import { useAuth } from '../../hooks/useAuth';
import { extractTextFromPDF, validatePDFFile, PDFExtractionResult, extractTextFallback } from '../../utils/pdfUtils';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import ResumeTemplate, { PerfectHTMLToPDF } from './ResumeTemplate';
import { pdf, Font } from '@react-pdf/renderer';
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
  // NEW: track developer section collapse state (closed by default)
  const [showDeveloperSection, setShowDeveloperSection] = React.useState<boolean>(false);
  // NEW: rotating informative text for loader
  const [currentLoaderText, setCurrentLoaderText] = React.useState<string>('');
  const [textFadeClass, setTextFadeClass] = React.useState<string>('animate-fade-in-text');

  const { user } = useAuth();
  const config = AIEnhancementService.getConfiguration();

  // Informative loader texts to rotate randomly
  const loaderTexts = React.useMemo(() => [
    "💡 The AI model can hallucinate, so generate another if the details are less accurate",
    "📚 Check our docs - editable files are our platform's unique feature",
    "👤 If personal details are not in your resume, please add them in your profile",
    "🎨 We have 90+ visually appealing ATS-optimized resume templates",
    "🌐 We provide HTML file output in a unique format - check it out!",
    "💬 We appreciate your feedback to improve our platform"
  ], []);

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

  // Keep jobDescription in sync with Redux (for persistence) - only update if significantly different
  const previousJobDescriptionRef = React.useRef<string>('');
  useEffect(() => {
    // Only dispatch if jobDescription has actually changed and is different from what's in Redux
    if (jobDescription &&
      jobDescription !== persistedJobDescription &&
      jobDescription !== previousJobDescriptionRef.current) {
      previousJobDescriptionRef.current = jobDescription;
      dispatch({ type: 'aiEnhancementModal/openModal', payload: { jobDescription } });
    }
  }, [jobDescription, dispatch, persistedJobDescription]);

  // Helper: convert HTML string to a PDF data URL using @react-pdf/renderer and the existing PerfectHTMLToPDF
  const htmlStringToPdfDataUrl = async (html: string): Promise<string> => {
    if (typeof window === 'undefined') throw new Error('Client-side PDF generation only');

    // Ensure we have a profile object for the ResumeTemplate
    const profile = resolvedProfile ?? { fullName: '', email: '', phone: '', location: '' } as any;

    const doc = (
      <PerfectHTMLToPDF htmlContent={html} profile={profile} jobKeywords={[]} />
    );

    const blobToDataUrl = (b: Blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(b);
    });

    const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };

    // Try to preload local fonts from /fonts and register them as data URLs to avoid fetch/caching issues
    // First, register a known-good remote Inter to reduce chance of corrupted local font causing failure
    // NOTE: Avoid registering remote WOFF2 fonts in the browser. Embedding
    // WOFF/WOFF2 in the browser-side pdfkit can cause RangeErrors while
    // encoding glyphs. Use built-in fonts (Helvetica) for browser generation
    // or perform font embedding server-side using TTF/OTF fonts.

    // Avoid preloading and registering local WOFF2 fonts as data URLs in the browser
    // because embedding WOFF/WOFF2 binaries can cause pdfkit to fail with
    // DataView/Offset errors. Rely on built-in fonts (Helvetica) for browser
    // generation stability, or use server-side TTF/OTF embedding if needed.

    // Use @react-pdf/renderer exclusively for PDF generation to preserve
    // layout, embedded fonts, and metadata. This component (`PerfectHTMLToPDF`)
    // is the Document passed to `pdf()`.
    try {
      console.info('Generating PDF using @react-pdf/renderer');
      const asPdf = pdf(doc);
      const blob: Blob = await asPdf.toBlob();
      return await blobToDataUrl(blob);
    } catch (err) {
      console.error('PDF generation failed using @react-pdf/renderer:', err);
      // Try a remote font registration retry before failing hard. This helps
      // when local font binaries cause encoding issues in some browsers.
      try {
        Font.register({
          family: 'Inter', fonts: [
            { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2', fontWeight: 'normal' },
            { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2', fontWeight: 'bold' }
          ]
        });
        const asPdf2 = pdf(doc);
        const blob2: Blob = await asPdf2.toBlob();
        return await blobToDataUrl(blob2);
      } catch (retryErr) {
        console.error('Renderer retry with remote fonts failed:', retryErr);
        throw new Error('Failed to generate PDF in the browser. See console logs for details.');
      }
    }
  };

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

  // Rotating loader text effect
  useEffect(() => {
    if (loading && loaderTexts.length > 0) {
      // Set initial text
      const randomIndex = Math.floor(Math.random() * loaderTexts.length);
      setCurrentLoaderText(loaderTexts[randomIndex]);

      const interval = setInterval(() => {
        // Fade out
        setTextFadeClass('animate-fade-out-text');

        setTimeout(() => {
          // Change text randomly
          const newRandomIndex = Math.floor(Math.random() * loaderTexts.length);
          setCurrentLoaderText(loaderTexts[newRandomIndex]);
          // Fade back in
          setTextFadeClass('animate-fade-in-text');
        }, 300); // Half second for fade out
      }, 3000); // Change every 3 seconds

      return () => clearInterval(interval);
    }
  }, [loading, loaderTexts]);

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
      // Don't block the user — use the local stub implementation instead.
      console.warn('AI provider API key not configured for selected model. Proceeding with local stubbed AI responses.');
      // Optionally show a non-blocking warning to the user
      dispatch(setError('AI provider key not configured. Using local fallback AI responses.'));
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
          enhancedSummary: ((): string => {
            const s = enhancementResult.enhancements.enhanced_summary || '';
            if (!s) return '';
            const cleaned = s.replace(/\s+/g, ' ').trim();
            const sentences = cleaned.match(/[^.!?]+[.!?]?/g) || [cleaned];
            const out = sentences.slice(0, 3).map(x => x.trim()).join(' ').trim();
            return out.length > 300 ? out.slice(0, 300).trim() : out;
          })(),
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
      // Log detailed error to console only (NEVER show technical details to users)
      console.error('❌ [AI Enhancement Modal] Error occurred (console only):', {
        message: err?.message,
        stack: err?.stack,
        timestamp: new Date().toISOString()
      });

      // IMPORTANT: Show simple, friendly message to users regardless of error type
      // All technical details stay in console logs only
      const userMessage = 'AI enhancement encountered an issue. Please try generating again.';

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

  const handleRegenerate = async (customPrompt: string) => {
    console.log('🔄 Regenerating with custom prompt:', customPrompt);

    // Go back to loading state
    dispatch(setShowResults(false));
    setLoading(true);
    setExtractionProgress('Regenerating with your custom instructions...');

    try {
      // Get the existing resume text from optimizationResults
      const resumeText = optimizationResults?.extractedText || manualText;

      if (!resumeText) {
        throw new Error('No resume text available for regeneration');
      }

      // Call AI enhancement with custom prompt
      const resolvedProfile = detailedUserProfile || (user ? await ProfileService.getUserProfile(user.id) : null);

      const enhancementResult = await AIEnhancementService.enhanceWithOpenAI(
        resumeText,
        jobDescription || persistedJobDescription || '',
        {
          modelType: config.defaultModelType,
          model: config.defaultModel,
          fileId: documentId,
          userPromptOverride: customPrompt.trim() || aiPrompt,
          systemPromptOverride: systemPrompt
        }
      );

      if (!enhancementResult.success) {
        throw new Error(enhancementResult.error || 'Failed to regenerate. Please try again.');
      }

      // Build optimization results (same as handleGenerateAI)
      const newOptimizationResults = {
        matchScore: enhancementResult.analysis.match_score,
        summary: `Your resume has been optimized for ${applicationData?.position || 'this position'}`,
        strengths: enhancementResult.analysis.strengths,
        gaps: enhancementResult.analysis.gaps,
        suggestions: enhancementResult.analysis.suggestions,
        keywordAnalysis: {
          coverageScore: enhancementResult.analysis.keyword_analysis?.keyword_density_score || 0,
          coveredKeywords: enhancementResult.analysis.keyword_analysis?.present_keywords || [],
          missingKeywords: enhancementResult.analysis.keyword_analysis?.missing_keywords || [],
        },
        enhancements: enhancementResult.enhancements,
        extractedText: resumeText,
        detailedUserProfile: resolvedProfile,
        optimizedResumeUrl: '',
        optimizedCoverLetterUrl: '',
      };

      dispatch(setOptimizationResults(newOptimizationResults));
      dispatch(setShowResults(true));
      setLoading(false);
      console.log('✅ Regeneration complete');
    } catch (error: any) {
      console.error('❌ Regeneration failed:', error);
      setLoading(false);
      dispatch(setError(error.message || 'Failed to regenerate'));
    }
  };

  // Removed excessive debug logging

  const [uploadComplete, setUploadComplete] = useState(false);
  const [FinalResumeUrl, setFinalResumeUrl] = useState<string | null>(null);
  const [FinalCoverLetterUrl, setFinalCoverLetterUrl] = useState<string | null>(null);

  // Guard to prevent repeated PDF generation and uploads
  const pdfUploadAttemptedRef = useRef(false);

  React.useEffect(() => {
    const shouldUpload =
      showResults &&
      optimizationResults &&
      applicationData?.id &&
      typeof window !== 'undefined' &&
      !uploadComplete &&
      !pdfUploadAttemptedRef.current && // Prevent duplicate attempts
      (!FinalResumeUrl || !FinalCoverLetterUrl); // <-- key check

    if (!shouldUpload) return;

    if (!user?.id) {
      console.warn('[uploadPDFs] No authenticated user id available; skipping PDF upload');
      return;
    }

    // Mark that we've attempted upload to prevent re-entry
    pdfUploadAttemptedRef.current = true;

    const detailedResumeHtml = generateDetailedResumeHTML(optimizationResults);
    const detailedCoverLetterHtml = generateDetailedCoverLetterHTML(optimizationResults);

    const uploadPDFs = async () => {
      try {
        // Convert generated HTML to PDF client-side and send base64 data URLs to the API
        const resumeDataUrl = await htmlStringToPdfDataUrl(detailedResumeHtml);
        const coverDataUrl = await htmlStringToPdfDataUrl(detailedCoverLetterHtml);

        const response = await fetch('/api/save-generated-pdfs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            jobApplicationId: applicationData.id,
            resumePdfBase64: resumeDataUrl,
            coverLetterPdfBase64: coverDataUrl,
          }),
        });

        let result: any = null;
        try {
          result = await response.json().catch(() => null);
        } catch {
          // ignore
        }

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          const serverMessage = (result && result.error) || text || `HTTP ${response.status}`;
          console.error('[uploadPDFs] Upload failed:', serverMessage, { status: response.status, body: result || text });
          // Reset flag on failure to allow retry
          pdfUploadAttemptedRef.current = false;
          throw new Error(serverMessage || 'Failed to upload PDFs');
        }

        if (!result || (!result.resumeUrl && !result.coverLetterUrl)) {
          console.error('[uploadPDFs] Unexpected API response shape:', result);
          pdfUploadAttemptedRef.current = false;
          throw new Error('Upload succeeded but server response is missing URLs');
        }

        console.log('✅ PDFs uploaded:', result);

        setFinalResumeUrl(result.resumeUrl || null);
        setFinalCoverLetterUrl(result.coverLetterUrl || null);
        setUploadComplete(true); // ✅ prevent re-upload

      } catch (error) {
        console.error('❌ Error uploading PDFs:', error);
        // Flag is reset above on known errors; keep it set for unknown errors to avoid infinite loops
      }
    };

    uploadPDFs();
  }, [showResults, optimizationResults, applicationData?.id, user?.id, uploadComplete, FinalResumeUrl, FinalCoverLetterUrl]);

  // ✅ FIX: Use ref to track last updated URLs to prevent infinite loop
  const lastUpdatedUrlsRef = useRef<{ resume: string | null, cover: string | null }>({ resume: null, cover: null });

  React.useEffect(() => {
    if (
      !uploadComplete ||
      !FinalResumeUrl ||
      !FinalCoverLetterUrl ||
      !optimizationResults
    ) return;

    // ✅ Check if we already updated with these exact URLs
    if (lastUpdatedUrlsRef.current.resume === FinalResumeUrl &&
      lastUpdatedUrlsRef.current.cover === FinalCoverLetterUrl) {
      return; // Already updated, skip
    }

    const alreadyUpdated = optimizationResults.optimizedResumeUrl === FinalResumeUrl &&
      optimizationResults.optimizedCoverLetterUrl === FinalCoverLetterUrl;

    if (alreadyUpdated) {
      // Mark as updated even if already in state
      lastUpdatedUrlsRef.current = { resume: FinalResumeUrl, cover: FinalCoverLetterUrl };
      return;
    }

    const updatedResults = {
      ...optimizationResults,
      optimizedResumeUrl: FinalResumeUrl,
      optimizedCoverLetterUrl: FinalCoverLetterUrl
    };

    dispatch(setOptimizationResults(updatedResults));
    lastUpdatedUrlsRef.current = { resume: FinalResumeUrl, cover: FinalCoverLetterUrl };
    console.log('✅ optimizationResults updated with Final URLs');
  }, [uploadComplete, FinalResumeUrl, FinalCoverLetterUrl, optimizationResults, dispatch]);


  if (showResults && optimizationResults) {
    // Removed excessive debug logs


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
        onRegenerate={handleRegenerate}
      />
    );
  }


  // Minimal logging for debugging (removed excessive logs)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Enhanced Loader Overlay with Translucent Background */}
        {loading && (
          <div className="fixed inset-0 z-[60] bg-white/70 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-600 dark:border-gray-500 p-8 m-4 max-w-md w-full animate-fade-in">
              <div className="flex flex-col items-center gap-6">
                {/* Animated Brain Icon with Pulse */}
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-20 w-20 rounded-full bg-blue-400 opacity-30 animate-ping"></span>
                  <span className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg animate-bounce-slow">
                    <Brain className="text-white animate-spin-slow" size={40} />
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-progress-bar"></div>
                </div>

                {/* Status Text */}
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-bold text-white animate-fade-in-text">
                    AI Enhancement in Progress
                  </h3>
                  <p className="text-sm font-medium text-blue-300 animate-fade-in-text">
                    {extractionProgress || "Preparing your tailored resume and cover letter..."}
                  </p>

                  {/* Rotating Informative Text - Dark Grey Box */}
                  {currentLoaderText && (
                    <div className="mt-6">
                      <p className={`text-xs text-gray-200 leading-relaxed px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 shadow-lg ${textFadeClass}`}>
                        {currentLoaderText}
                      </p>
                    </div>
                  )}

                  {/* Cancel Button */}
                  <div className="mt-6">
                    <button
                      onClick={() => {
                        setLoading(false);
                        setExtractionProgress('');
                        onClose();
                      }}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CSS Animations */}
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
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
              }
              .animate-fade-in {
                animation: fade-in 0.5s ease-out;
              }
              @keyframes fade-in-text {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .animate-fade-in-text {
                animation: fade-in-text 1.2s ease-in;
              }
              @keyframes fade-out-text {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-10px); }
              }
              .animate-fade-out-text {
                animation: fade-out-text 0.3s ease-out;
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
                Resume & Cover Letter Optimizer
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

          {/* Developer Section - Collapsible */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mt-6">
            <button
              onClick={() => setShowDeveloperSection(!showDeveloperSection)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <Settings className="text-gray-600 dark:text-gray-400" size={20} />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Developer
                </h3>
              </div>
              <div className="flex items-center">
                {showDeveloperSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </button>

            {showDeveloperSection && (
              <div className="px-4 pb-4 space-y-4">
                {/* Editable AI System Prompt Section */}
                <div>
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
                <div>
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

                {/* Extracted Text Debug Section */}
                {extractedPDFData && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
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
              </div>
            )}
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

          {/* Generate Button */}
          <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleGenerateAI}
              disabled={
                loading ||
                // allow if we have a file OR extracted/manual text
                (!selectedFileMeta && !cloudFileUrl && !extractedPDFData?.text && !manualText.trim())
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

  // Helper to check if a section has content
  const hasContent = (data: any): boolean => {
    if (!data) return false;
    if (Array.isArray(data)) return data.length > 0;
    if (typeof data === 'string') return data.trim().length > 0;
    if (typeof data === 'object') return Object.keys(data).length > 0;
    return false;
  };

  // Helper to safely render skills (handles both string and object formats)
  const renderSkills = (skills: any[]): string[] => {
    return skills
      .map((skill: any) => {
        if (typeof skill === 'string') return skill.trim();
        if (skill && typeof skill === 'object' && skill.name) return skill.name.trim();
        return null;
      })
      .filter((skill: string | null): skill is string => skill !== null && skill.length > 0);
  };

  return `
    <div style="font-family: 'Arial', sans-serif; line-height: 1.4; color: #333; max-width: 800px;">
      <!-- Header Section -->
      <header style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="font-size: 26px; margin-bottom: 8px; color: #1f2937; font-weight: 700;">${name}</h1>
        <div style="font-size: 13px; color: #6b7280; margin-bottom: 5px;">
          <span>${email}</span>${phone ? ` • <span>${phone}</span>` : ''}${location ? ` • <span>${location}</span>` : ''}
        </div>
      </header>

      <!-- Career Objective (if present) -->
      ${hasContent(sections.objective) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">CAREER OBJECTIVE</h2>
        <p style="text-align: justify; line-height: 1.6; font-size: 13px; margin: 0;">${sections.objective}</p>
      </section>
      ` : ''}

      <!-- Professional Summary -->
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">PROFESSIONAL SUMMARY</h2>
        <p style="text-align: justify; line-height: 1.6; font-size: 13px; margin: 0;">
          ${results.aiEnhancements?.enhancedSummary || sections.professional_summary || 'Professional summary highlighting relevant experience, key skills, and value proposition tailored to the target position.'}
        </p>
      </section>

      <!-- Technical Skills -->
      ${(() => {
      const skills = renderSkills(sections.technical_skills || results.skillsOptimization?.technicalSkills || []);
      if (skills.length === 0) return '';
      return `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">TECHNICAL SKILLS</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 6px; margin-bottom: 8px;">
          ${skills.map((skill: string) =>
        `<span style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px; border: 1px solid #e5e7eb;">${skill}</span>`
      ).join('')}
        </div>
      </section>`;
    })()}

      <!-- Core Competencies / Soft Skills -->
      ${(() => {
      const skills = renderSkills(sections.soft_skills || results.skillsOptimization?.softSkills || []);
      if (skills.length === 0) return '';
      return `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">CORE COMPETENCIES</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 6px;">
          ${skills.map((skill: string) =>
        `<span style="background: #e0f2fe; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #0277bd; border: 1px solid #b3e5fc;">${skill}</span>`
      ).join('')}
        </div>
      </section>`;
    })()}

      <!-- Professional Experience -->
      ${hasContent(sections.experience) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">PROFESSIONAL EXPERIENCE</h2>
        ${(sections.experience || []).map((exp: any) => `
          <div style="margin-bottom: 18px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
              <h3 style="font-size: 14px; font-weight: 600; margin: 0; color: #1f2937;">${exp.position || 'Job Title'}</h3>
              <span style="font-size: 12px; color: #6b7280; font-weight: 500;">${exp.duration || ''}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 13px; color: #4b5563; font-weight: 500;">${exp.company || 'Company Name'}</span>
              <span style="font-size: 12px; color: #6b7280;">${exp.location || ''}</span>
            </div>
            ${hasContent(exp.key_responsibilities) ? `
              <div style="margin-bottom: 8px;">
                <strong style="font-size: 12px; color: #374151;">Key Responsibilities:</strong>
                <ul style="margin: 3px 0 0 15px; padding: 0;">
                  ${exp.key_responsibilities.map((resp: string) => `<li style="margin-bottom: 3px; font-size: 12px; line-height: 1.4;">${resp}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            ${hasContent(exp.achievements) ? `
              <div style="margin-bottom: 8px;">
                <strong style="font-size: 12px; color: #374151;">Key Achievements:</strong>
                <ul style="margin: 3px 0 0 15px; padding: 0;">
                  ${exp.achievements.map((achievement: string) => `<li style="margin-bottom: 3px; font-size: 12px; line-height: 1.4; color: #059669;">${achievement}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            ${hasContent(exp.technologies_used) ? `
              <div style="margin-top: 5px;">
                <strong style="font-size: 11px; color: #6b7280;">Technologies:</strong>
                <span style="font-size: 11px; color: #6b7280;"> ${exp.technologies_used.join(', ')}</span>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </section>
      ` : ''}

      <!-- Education -->
      ${hasContent(sections.education) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">EDUCATION</h2>
        ${sections.education.map((edu: any) => `
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <h3 style="font-size: 13px; font-weight: 600; margin: 0; color: #1f2937;">${edu.degree || 'Degree'}${edu.field_of_study ? ` in ${edu.field_of_study}` : ''}</h3>
              <span style="font-size: 12px; color: #6b7280;">${edu.graduation_date || ''}</span>
            </div>
            <div style="font-size: 12px; color: #4b5563; margin-bottom: 3px;">${edu.institution || ''}</div>
            ${edu.gpa ? `<div style="font-size: 11px; color: #6b7280;">GPA: ${edu.gpa}</div>` : ''}
            ${hasContent(edu.relevant_coursework) ? `
              <div style="margin-top: 3px;">
                <strong style="font-size: 11px;">Relevant Coursework:</strong>
                <span style="font-size: 11px; color: #6b7280;"> ${edu.relevant_coursework.join(', ')}</span>
              </div>
            ` : ''}
            ${hasContent(edu.honors) ? `
              <div style="margin-top: 3px;">
                <strong style="font-size: 11px;">Honors:</strong>
                <span style="font-size: 11px; color: #059669;"> ${edu.honors.join(', ')}</span>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </section>
      ` : ''}

      <!-- Projects -->
      ${hasContent(sections.projects) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">KEY PROJECTS</h2>
        ${sections.projects.map((project: any) => `
          <div style="margin-bottom: 15px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px;">
              <h3 style="font-size: 13px; font-weight: 600; margin: 0; color: #1f2937;">${project.name || 'Project Name'}</h3>
              <span style="font-size: 11px; color: #6b7280;">${project.duration || ''}</span>
            </div>
            <p style="font-size: 12px; margin-bottom: 5px; line-height: 1.4;">${project.description || ''}</p>
            ${hasContent(project.achievements) ? `
              <ul style="margin: 5px 0 0 15px; padding: 0;">
                ${project.achievements.map((achievement: string) => `<li style="margin-bottom: 2px; font-size: 12px; color: #059669;">${achievement}</li>`).join('')}
              </ul>
            ` : ''}
            ${hasContent(project.technologies) ? `
              <div style="margin-top: 5px;">
                <strong style="font-size: 11px; color: #6b7280;">Technologies:</strong>
                <span style="font-size: 11px; color: #6b7280;"> ${project.technologies.join(', ')}</span>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </section>
      ` : ''}

      <!-- Certifications -->
      ${hasContent(sections.certifications) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">CERTIFICATIONS</h2>
        ${sections.certifications.map((cert: any) => `
          <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="font-size: 12px; color: #1f2937;">${cert.name || ''}</strong>
              <div style="font-size: 11px; color: #6b7280;">${cert.issuing_organization || ''}</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #6b7280;">
              ${cert.issue_date ? `<div>Issued: ${cert.issue_date}</div>` : ''}
              ${cert.expiration_date ? `<div>Expires: ${cert.expiration_date}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </section>
      ` : ''}

      <!-- Licenses -->
      ${hasContent(sections.licenses) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">PROFESSIONAL LICENSES</h2>
        ${sections.licenses.map((license: any) => `
          <div style="margin-bottom: 8px;">
            <strong style="font-size: 12px; color: #1f2937;">${license.name || ''}</strong>
            <div style="font-size: 11px; color: #6b7280;">${license.issuing_authority || ''} ${license.license_number ? `• #${license.license_number}` : ''}</div>
            ${license.expiration_date ? `<div style="font-size: 11px; color: #6b7280;">Valid until: ${license.expiration_date}</div>` : ''}
          </div>
        `).join('')}
      </section>
      ` : ''}

      <!-- Awards -->
      ${hasContent(sections.awards) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">AWARDS & RECOGNITION</h2>
        ${sections.awards.map((award: any) => `
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <strong style="font-size: 12px; color: #1f2937;">${award.title || ''}</strong>
              <span style="font-size: 11px; color: #6b7280;">${award.date || ''}</span>
            </div>
            <div style="font-size: 11px; color: #6b7280;">${award.issuing_organization || ''}</div>
            ${award.description ? `<p style="font-size: 11px; margin-top: 2px; line-height: 1.3;">${award.description}</p>` : ''}
          </div>
        `).join('')}
      </section>
      ` : ''}

      <!-- Key Achievements (standalone section) -->
      ${hasContent(sections.achievements) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">KEY ACHIEVEMENTS</h2>
        <ul style="margin: 0 0 0 15px; padding: 0;">
          ${sections.achievements.map((achievement: any) => {
      const text = typeof achievement === 'string' ? achievement : achievement.description || '';
      return text ? `<li style="margin-bottom: 5px; font-size: 12px; line-height: 1.4; color: #059669;">${text}</li>` : '';
    }).join('')}
        </ul>
      </section>
      ` : ''}

      <!-- Languages -->
      ${hasContent(sections.languages) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">LANGUAGES</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px;">
          ${sections.languages.map((lang: any) => {
      const name = typeof lang === 'string' ? lang : lang.name || '';
      const level = typeof lang === 'object' ? lang.proficiency || lang.level || '' : '';
      return name ? `
              <div style="background: #f3f4f6; padding: 6px 10px; border-radius: 4px; font-size: 12px; border: 1px solid #e5e7eb;">
                <strong>${name}</strong>${level ? ` - ${level}` : ''}
              </div>
            ` : '';
    }).join('')}
        </div>
      </section>
      ` : ''}

      <!-- Training & Development -->
      ${hasContent(sections.training) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">TRAINING & DEVELOPMENT</h2>
        ${sections.training.map((training: any) => `
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <strong style="font-size: 12px; color: #1f2937;">${training.name || training.title || ''}</strong>
              <span style="font-size: 11px; color: #6b7280;">${training.date || training.year || ''}</span>
            </div>
            <div style="font-size: 11px; color: #6b7280;">${training.provider || training.organization || ''}</div>
          </div>
        `).join('')}
      </section>
      ` : ''}

      <!-- Courses -->
      ${hasContent(sections.courses) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">RELEVANT COURSES</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 6px;">
          ${sections.courses.map((course: any) => {
      const name = typeof course === 'string' ? course : course.name || course.title || '';
      return name ? `<span style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px; border: 1px solid #e5e7eb;">${name}</span>` : '';
    }).join('')}
        </div>
      </section>
      ` : ''}

      <!-- Professional Memberships -->
      ${hasContent(sections.memberships) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">PROFESSIONAL MEMBERSHIPS</h2>
        ${sections.memberships.map((membership: any) => `
          <div style="margin-bottom: 8px;">
            <strong style="font-size: 12px; color: #1f2937;">${membership.organization || membership.name || ''}</strong>
            ${membership.role ? `<span style="font-size: 11px; color: #6b7280;"> - ${membership.role}</span>` : ''}
            ${membership.since || membership.year ? `<div style="font-size: 11px; color: #6b7280;">Member since ${membership.since || membership.year}</div>` : ''}
          </div>
        `).join('')}
      </section>
      ` : ''}

      <!-- Volunteer Work -->
      ${hasContent(sections.volunteer_work) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">VOLUNTEER EXPERIENCE</h2>
        ${sections.volunteer_work.map((vol: any) => `
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px;">
              <strong style="font-size: 12px; color: #1f2937;">${vol.role || ''}</strong>
              <span style="font-size: 11px; color: #6b7280;">${vol.duration || ''}</span>
            </div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 3px;">${vol.organization || ''}</div>
            ${vol.description ? `<p style="font-size: 11px; line-height: 1.3; margin-bottom: 3px;">${vol.description}</p>` : ''}
            ${hasContent(vol.achievements) ? `
              <ul style="margin: 3px 0 0 15px; padding: 0;">
                ${vol.achievements.map((achievement: string) => `<li style="margin-bottom: 2px; font-size: 11px; color: #059669;">${achievement}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </section>
      ` : ''}

      <!-- Extracurricular Activities -->
      ${hasContent(sections.extracurricular) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">EXTRACURRICULAR ACTIVITIES</h2>
        ${sections.extracurricular.map((activity: any) => `
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <strong style="font-size: 12px; color: #1f2937;">${activity.name || activity.activity || ''}</strong>
              <span style="font-size: 11px; color: #6b7280;">${activity.duration || activity.year || ''}</span>
            </div>
            ${activity.role ? `<div style="font-size: 11px; color: #6b7280;">${activity.role}</div>` : ''}
            ${activity.description ? `<p style="font-size: 11px; line-height: 1.3; margin-top: 2px;">${activity.description}</p>` : ''}
          </div>
        `).join('')}
      </section>
      ` : ''}

      <!-- Military Service -->
      ${hasContent(sections.military) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">MILITARY SERVICE</h2>
        ${sections.military.map((service: any) => `
          <div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <strong style="font-size: 12px; color: #1f2937;">${service.rank || ''} ${service.branch ? `- ${service.branch}` : ''}</strong>
              <span style="font-size: 11px; color: #6b7280;">${service.duration || service.years || ''}</span>
            </div>
            ${service.specialty || service.role ? `<div style="font-size: 11px; color: #6b7280;">${service.specialty || service.role}</div>` : ''}
            ${hasContent(service.achievements) ? `
              <ul style="margin: 3px 0 0 15px; padding: 0;">
                ${service.achievements.map((a: string) => `<li style="margin-bottom: 2px; font-size: 11px;">${a}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </section>
      ` : ''}

      <!-- Publications -->
      ${hasContent(sections.publications) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">PUBLICATIONS</h2>
        ${sections.publications.map((pub: any) => `
          <div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
              <strong style="font-size: 12px; color: #1f2937;">${pub.title || ''}</strong>
              <span style="font-size: 11px; color: #6b7280;">${pub.date || pub.year || ''}</span>
            </div>
            <div style="font-size: 11px; color: #6b7280; font-style: italic; margin-bottom: 2px;">${pub.publication || pub.journal || ''}</div>
            ${hasContent(pub.authors) ? `<div style="font-size: 10px; color: #6b7280;">Authors: ${pub.authors.join(', ')}</div>` : ''}
            ${pub.description ? `<p style="font-size: 11px; margin-top: 3px; line-height: 1.3;">${pub.description}</p>` : ''}
          </div>
        `).join('')}
      </section>
      ` : ''}

      <!-- Patents -->
      ${hasContent(sections.patents) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">PATENTS</h2>
        ${sections.patents.map((patent: any) => `
          <div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <strong style="font-size: 12px; color: #1f2937;">${patent.title || patent.name || ''}</strong>
              <span style="font-size: 11px; color: #6b7280;">${patent.date || patent.year || ''}</span>
            </div>
            ${patent.patent_number ? `<div style="font-size: 11px; color: #6b7280;">Patent #: ${patent.patent_number}</div>` : ''}
            ${patent.description ? `<p style="font-size: 11px; line-height: 1.3; margin-top: 2px;">${patent.description}</p>` : ''}
          </div>
        `).join('')}
      </section>
      ` : ''}

      <!-- Presentations -->
      ${hasContent(sections.presentations) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">PRESENTATIONS & SPEAKING</h2>
        ${sections.presentations.map((pres: any) => `
          <div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <strong style="font-size: 12px; color: #1f2937;">${pres.title || ''}</strong>
              <span style="font-size: 11px; color: #6b7280;">${pres.date || ''}</span>
            </div>
            <div style="font-size: 11px; color: #6b7280;">${pres.event || pres.venue || ''}</div>
            ${pres.description ? `<p style="font-size: 11px; line-height: 1.3; margin-top: 2px;">${pres.description}</p>` : ''}
          </div>
        `).join('')}
      </section>
      ` : ''}

      <!-- Portfolio -->
      ${hasContent(sections.portfolio) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">PORTFOLIO</h2>
        ${sections.portfolio.map((item: any) => `
          <div style="margin-bottom: 10px;">
            <strong style="font-size: 12px; color: #1f2937;">${item.title || item.name || ''}</strong>
            ${item.url ? `<div style="font-size: 11px; color: #2563eb;">${item.url}</div>` : ''}
            ${item.description ? `<p style="font-size: 11px; line-height: 1.3; margin-top: 2px;">${item.description}</p>` : ''}
          </div>
        `).join('')}
      </section>
      ` : ''}

      <!-- Interests -->
      ${hasContent(sections.interests) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">INTERESTS & HOBBIES</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${sections.interests.map((interest: any) => {
      const text = typeof interest === 'string' ? interest : interest.name || '';
      return text ? `<span style="background: #f3f4f6; padding: 4px 10px; border-radius: 12px; font-size: 12px; border: 1px solid #e5e7eb;">${text}</span>` : '';
    }).join('')}
        </div>
      </section>
      ` : ''}

      <!-- References -->
      ${hasContent(sections.references) ? `
      <section style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; color: #2563eb; border-left: 4px solid #2563eb; padding-left: 8px; margin-bottom: 10px; font-weight: 600;">REFERENCES</h2>
        ${typeof sections.references === 'string' ? `
          <p style="font-size: 12px; color: #6b7280; font-style: italic;">${sections.references}</p>
        ` : sections.references.map((ref: any) => `
          <div style="margin-bottom: 10px;">
            <strong style="font-size: 12px; color: #1f2937;">${ref.name || ''}</strong>
            ${ref.title || ref.position ? `<div style="font-size: 11px; color: #6b7280;">${ref.title || ref.position}${ref.company ? ` at ${ref.company}` : ''}</div>` : ''}
            ${ref.email ? `<div style="font-size: 11px; color: #6b7280;">${ref.email}</div>` : ''}
            ${ref.phone ? `<div style="font-size: 11px; color: #6b7280;">${ref.phone}</div>` : ''}
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
    <div style="font-family: 'Arial', sans-serif; line-height: 1.5; color: #333; max-width: 700px; margin: 0 auto;">
      <!-- Header -->
      <header style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 22px; margin-bottom: 8px; color: #1f2937; font-weight: 600;">${name}</h1>
        <div style="font-size: 13px; color: #6b7280;">
          <div>${email}${phone ? ` • ${phone}` : ''}</div>
          ${location ? `<div>${location}</div>` : ''}
        </div>
      </header>

      <!-- Date -->
      <div style="margin-bottom: 25px; text-align: right;">
        <p style="font-size: 13px; color: #6b7280; margin: 0;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <!-- Employer Info -->
      <div style="margin-bottom: 25px;">
        <p style="font-size: 13px; color: #374151; margin: 0; line-height: 1.4;">
          Hiring Manager<br>
          ${jobDetails.company_name || 'Company Name'}<br>
          ${jobDetails.location || 'Company Location'}
        </p>
      </div>

      <!-- Subject Line -->
      <div style="margin-bottom: 20px;">
        <p style="font-size: 13px; color: #374151; margin: 0;">
          <strong>Re: Application for ${jobDetails.position || 'Position Title'}</strong>
        </p>
      </div>

      <!-- Salutation -->
      <div style="margin-bottom: 15px;">
        <p style="font-size: 13px; color: #374151; margin: 0;">Dear Hiring Manager,</p>
      </div>

      <!-- Opening Paragraph -->
      <div style="margin-bottom: 20px;">
        <p style="font-size: 13px; line-height: 1.6; text-align: justify; color: #374151; margin: 0;">
          ${coverLetter.opening_paragraph ||
    `I am writing to express my strong interest in the ${jobDetails.position || 'Position Title'} role at ${jobDetails.company_name || 'Company Name'}. With my comprehensive background in relevant technologies and proven track record of delivering exceptional results, I am excited about the opportunity to contribute to your team's continued success. My experience aligns perfectly with your requirements, and I am particularly drawn to this position because of its potential for professional growth and the company's reputation for innovation. Having researched your organization extensively, I am confident that my skills and passion make me an ideal candidate for this role.`
    }
        </p>
      </div>

      <!-- Body Paragraph -->
      <div style="margin-bottom: 20px;">
        <p style="font-size: 13px; line-height: 1.6; text-align: justify; color: #374151; margin: 0;">
          ${coverLetter.body_paragraph ||
    `Throughout my career, I have developed extensive expertise in key areas that directly align with your job requirements. In my previous roles, I have successfully led cross-functional teams, implemented innovative solutions that improved efficiency by significant percentages, and consistently delivered projects on time and within budget. My technical skills encompass the full range of technologies mentioned in your job posting, and I have applied these in real-world scenarios to drive measurable business outcomes. For example, I spearheaded initiatives that resulted in substantial cost savings, improved user satisfaction scores, and enhanced system performance metrics. I am particularly excited about the opportunity to bring my passion for problem-solving and my collaborative approach to your dynamic team, where I can contribute to achieving your organization's strategic objectives while continuing to grow professionally. My experience in stakeholder management, agile methodologies, and continuous improvement positions me well to make an immediate impact in this role.`
    }
        </p>
      </div>

      <!-- Closing Paragraph -->
      <div style="margin-bottom: 25px;">
        <p style="font-size: 13px; line-height: 1.6; text-align: justify; color: #374151; margin: 0;">
          ${coverLetter.closing_paragraph ||
    `I am eager to discuss how my background, skills, and enthusiasm can contribute to ${jobDetails.company_name || 'your company'}'s continued success. I would welcome the opportunity to speak with you about how I can add value to your team and help achieve your business goals. Thank you for your time and consideration. I look forward to hearing from you soon and am available at your convenience for an interview.`
    }
        </p>
      </div>

      <!-- Sign-off -->
      <div style="margin-bottom: 15px;">
        <p style="font-size: 13px; color: #374151; margin: 0;">
          Sincerely,<br><br>
          ${name}
        </p>
      </div>

      <!-- Footer -->
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="font-size: 11px; color: #9ca3af; margin: 0;">
          Tailored for ${jobDetails.position || 'the target position'} at ${jobDetails.company_name || 'the company'}.
        </p>
      </div>
    </div>
  `;
};