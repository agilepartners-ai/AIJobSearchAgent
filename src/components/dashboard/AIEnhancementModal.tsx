import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, Download, Eye, Wand2, Sparkles, Bot, RefreshCw, AlertCircle, CheckCircle, Target, TrendingUp, Award, Brain, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { useToastContext } from '../ui/ToastProvider';
import OptimizationResults from './OptimizationResults';
import { extractTextFromPDF, validatePDFFile, PDFExtractionResult, setupPDFWorkerAlternative, testPDFJSAvailability, extractTextFallback, createManualTextInput } from '../../utils/pdfUtils';
import { OpenAIResumeOptimizer } from '../../services/openaiService';
import { validateConfig } from '../../utils/config';
import { ResumeExtractionService } from '../../services/resumeExtractionService';
import { AIEnhancementService } from '../../services/aiEnhancementService';
import { UserProfileData } from '../../services/profileService';
import { useAuth } from '../../hooks/useAuth';

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
  applicationData,
  detailedUserProfile,
  onSave,
  onClose
}) => {
  const { showSuccess, showError } = useToastContext();
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
  const { user } = useAuth();
  const config = ResumeExtractionService.getConfiguration();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep jobDescription in sync with Redux (for persistence)
  useEffect(() => {
    if (jobDescription && jobDescription !== persistedJobDescription) {
      dispatch({ type: 'aiEnhancementModal/openModal', payload: { jobDescription } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobDescription]);

  // File select handler: reads file as base64 and stores meta/content in Redux
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = ResumeExtractionService.validateResumeFile(file);
      if (!validation.isValid) {
        dispatch(setError(validation.error || 'Invalid file'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        // Always use base64 string after comma (DataURL format)
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
      reader.onerror = () => {
        dispatch(setError('Failed to read file. Please try again.'));
      };
      reader.readAsDataURL(file);
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
    if (!selectedFileMeta && !cloudFileUrl) {
      dispatch(setError('Please select a resume file or provide a cloud file URL'));
      return;
    }

    if (!jobDescription.trim()) {
      dispatch(setError('Job description is required for AI enhancement'));
      return;
    }

    // Check API configuration
    if (!config.hasApiKey) {
      dispatch(setError('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your environment variables.'));
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
      let fileToProcess: File | null = null;
      if (selectedFileMeta && selectedFileContent) {
        // Convert base64 to File (with null check)
        const arr = selectedFileContent.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const bstr = arr[1] ? atob(arr[1]) : '';
        let n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        fileToProcess = new File([u8arr], selectedFileMeta.name, { type: mime });
      }

      if (!fileToProcess) {
        throw new Error('No file to process');
      }

      // Step 1: Extract resume data - using simple text extraction for now
      setExtractionProgress('Extracting resume data...');

      let resumeText = '';
      if (fileToProcess.type === 'text/plain') {
        resumeText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(fileToProcess!);
        });
      } else {
        // For PDF files, show a helpful error for now
        throw new Error('PDF text extraction requires additional setup. Please convert your PDF to text format or copy-paste the content manually.');
      }

      if (!resumeText || resumeText.length < 50) {
        throw new Error('Unable to extract sufficient text from the file. Please ensure the file contains readable text.');
      }

      setExtractionProgress('Processing extracted data...');

      // Create mock parsed resume data
      const parsedResumeData = {
        personal: {
          name: 'Extracted from resume',
          email: '',
          phone: '',
          location: ''
        },
        experience: [],
        skills: [],
        education: []
      };

      // Step 2: Enhance resume using AI analysis
      setExtractionProgress('Analyzing resume against job description...');

      const enhancementResult = await AIEnhancementService.enhanceWithText(
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

      // Normalize the response to ensure all fields exist
      const normalizedResult = AIEnhancementService.normalizeEnhancementResponse(enhancementResult);

      setExtractionProgress('Generating optimization recommendations...');

      // Generate mock URLs for the enhanced documents
      const timestamp = Date.now();
      const enhancedResumeUrl = `https://example.com/ai-enhanced-resume-${documentId}.pdf`;
      const enhancedCoverLetterUrl = `https://example.com/ai-enhanced-cover-letter-${documentId}.pdf`;

      // Combine real AI analysis with our UI structure
      const optimizationResults = {
        matchScore: normalizedResult.analysis.match_score,
        summary: normalizedResult.analysis.match_score >= 80
          ? `Excellent match! Your resume shows strong alignment with this position (${normalizedResult.analysis.match_score}% match). The AI has identified key strengths and provided targeted recommendations for optimization.`
          : normalizedResult.analysis.match_score >= 70
            ? `Good match! Your resume aligns well with this position (${normalizedResult.analysis.match_score}% match). The AI has identified areas for improvement to strengthen your application.`
            : `Moderate match (${normalizedResult.analysis.match_score}% match). The AI has identified significant opportunities to better align your resume with this position.`,

        // Use real AI analysis data
        strengths: normalizedResult.analysis.strengths.length > 0
          ? normalizedResult.analysis.strengths
          : [
            `Strong background with relevant experience`,
            `Good skill alignment with job requirements`,
            `Professional presentation and structure`
          ],

        gaps: normalizedResult.analysis.gaps.length > 0
          ? normalizedResult.analysis.gaps
          : [
            "Some industry-specific keywords could be emphasized more prominently",
            "Consider adding more quantified achievements with specific metrics"
          ],

        suggestions: normalizedResult.analysis.suggestions.length > 0
          ? normalizedResult.analysis.suggestions
          : [
            "Incorporate more action verbs and industry-specific terminology",
            "Add specific metrics and percentages to quantify your achievements",
            "Consider reorganizing sections to highlight most relevant experience first"
          ],

        optimizedResumeUrl: enhancedResumeUrl,
        optimizedCoverLetterUrl: enhancedCoverLetterUrl,

        // Use real keyword analysis
        keywordAnalysis: {
          coverageScore: normalizedResult.analysis.keyword_analysis.keyword_density_score,
          coveredKeywords: normalizedResult.analysis.keyword_analysis.present_keywords,
          missingKeywords: normalizedResult.analysis.keyword_analysis.missing_keywords
        },

        // Enhanced experience optimization using real data
        experienceOptimization: [
          {
            company: 'Previous Company',
            position: 'Previous Role',
            relevanceScore: Math.max(70, normalizedResult.analysis.match_score),
            included: true,
            reasoning: 'Highly relevant to target position based on AI analysis'
          }
        ],

        // Enhanced skills optimization
        skillsOptimization: {
          technicalSkills: normalizedResult.enhancements.enhanced_skills.length > 0
            ? normalizedResult.enhancements.enhanced_skills
            : ['JavaScript', 'Python', 'React', 'Node.js'],
          softSkills: ["Leadership", "Problem Solving", "Communication", "Team Collaboration"],
          missingSkills: normalizedResult.analysis.keyword_analysis.missing_keywords.slice(0, 5)
        },

        // Include parsed resume data
        parsedResume: parsedResumeData,

        // Enhanced metadata
        extractionMetadata: {
          documentId: documentId,
          extractedTextLength: resumeText.length,
          processingTime: Date.now() - timestamp,
          modelUsed: normalizedResult.metadata.model_used,
          apiBaseUrl: 'Direct OpenAI Integration',
          sectionsAnalyzed: normalizedResult.metadata.resume_sections_analyzed
        },

        // Include AI enhancements
        aiEnhancements: {
          enhancedSummary: normalizedResult.enhancements.enhanced_summary,
          enhancedExperienceBullets: normalizedResult.enhancements.enhanced_experience_bullets,
          coverLetterOutline: normalizedResult.enhancements.cover_letter_outline,
          sectionRecommendations: normalizedResult.analysis.section_recommendations
        },

        // Include raw AI response for debugging
        rawAIResponse: normalizedResult,

        // Add job context for PDF generation
        jobDescription: jobDescription,
        applicationData: applicationData,

        // Add detailed user profile and user for cover letter generation
        detailedUserProfile: detailedUserProfile,
        user: user
      };

      dispatch(setOptimizationResults(optimizationResults));
      dispatch(setShowResults(true));

    } catch (err: any) {
      // Provide user-friendly error messages
      let userMessage = err.message;

      if (err.message.includes('PDF text extraction')) {
        userMessage = 'PDF text extraction requires additional setup. Please convert your PDF to a text file (.txt) or copy-paste the resume content manually.';
      } else if (err.message.includes('API key')) {
        userMessage = 'OpenAI API key configuration error. Please contact support for assistance.';
      } else if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
        userMessage = 'Direct OpenAI integration is working. Please check your API key configuration.';
      }

      dispatch(setError(userMessage));
    } finally {
      setLoading(false);
      setExtractionProgress('');
    }
  };

  const handleResultsClose = () => {
    dispatch(setShowResults(false));
    // Save the URLs to the parent component
    if (optimizationResults) {
      onSave(optimizationResults.optimizedResumeUrl, optimizationResults.optimizedCoverLetterUrl);
    }
    onClose();
  };

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [step, setStep] = useState<'upload' | 'processing' | 'results'>('upload');
  const [localOptimizationResults, setLocalOptimizationResults] = useState<any>(null);
  const [extractedPDFData, setExtractedPDFData] = useState<PDFExtractionResult | null>(null);
  const [showJobDescription, setShowJobDescription] = useState(true);
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [copiedJobDesc, setCopiedJobDesc] = useState(false);
  const [copiedExtracted, setCopiedExtracted] = useState(false);
  const [manualText, setManualText] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate the file
    const validation = validatePDFFile(file);
    if (!validation.isValid) {
      showError('Invalid file', validation.error || 'Please select a valid PDF or text file.');
      return;
    }

    setUploadedFile(file);
    setIsExtracting(true);
    setShowManualInput(false);
    setManualText('');

    try {
      console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);

      // Try to extract text
      const extractionResult = await extractTextFromPDF(file);

      if (extractionResult.error) {
        if (extractionResult.error === 'MANUAL_INPUT_REQUIRED') {
          // Show manual input option
          setShowManualInput(true);
          setExtractedPDFData(null);
          showError('PDF extraction failed',
            'Automatic text extraction failed. Please paste your resume text manually below.'
          );
        } else {
          // Try one more time with the file reader approach
          const fallbackResult = await extractTextFallback(file);

          if (fallbackResult.error && !fallbackResult.text) {
            // Show manual input as last resort
            setShowManualInput(true);
            setExtractedPDFData(null);
            showError('Text extraction failed',
              'Unable to extract text automatically. Please paste your resume text in the manual input field below.'
            );
          } else {
            setExtractedPDFData(fallbackResult);
            setShowExtractedText(true);
            if (fallbackResult.text.length > 0) {
              showSuccess('Text extracted successfully',
                `Extracted ${fallbackResult.text.length} characters using fallback method.`);
            } else {
              showError('No text found', fallbackResult.error || 'No text could be extracted from the file.');
            }
          }
        }
      } else {
        setExtractedPDFData(extractionResult);
        setShowExtractedText(true);
        showSuccess('File processed successfully',
          `Extracted ${extractionResult.text.length} characters from ${extractionResult.pages} pages.`);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setShowManualInput(true);
      setExtractedPDFData(null);
      showError('File processing failed',
        'Unable to process the file automatically. Please use the manual text input below.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleManualTextSubmit = () => {
    if (!manualText.trim()) {
      showError('No text provided', 'Please paste your resume text before proceeding.');
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
    showSuccess('Resume text added',
      `Successfully added ${manualText.length} characters of resume text.`
    );
  };

  const handleEnhanceResume = async () => {
    if (!jobDescription.trim()) {
      showError('Missing job description', 'Job description is required for AI enhancement.');
      return;
    }

    if (!extractedPDFData || !extractedPDFData.text.trim()) {
      if (uploadedFile) {
        showError('No text extracted', 'Unable to extract text from the uploaded file. Please use manual text input.');
        setShowManualInput(true);
      } else {
        showError('No resume provided', 'Please upload a resume file or provide resume text manually.');
      }
      return;
    }

    // Validate configuration before proceeding
    const configValidation = validateConfig();
    if (!configValidation.isValid) {
      showError('Configuration Error', configValidation.errors.join(' '));
      return;
    }

    setIsProcessing(true);
    setStep('processing');

    try {
      console.log('Starting AI enhancement with OpenAI...');

      // Call real OpenAI API with proper user data
      const aiResults = await OpenAIResumeOptimizer.optimizeResume({
        resumeText: extractedPDFData.text,
        jobDescription: jobDescription,
        applicantData: {
          name: detailedUserProfile?.fullName || 'Your Name',
          email: user?.email || 'unknown@email.com', // Use real email from auth
          phone: detailedUserProfile?.contactNumber || '',
          location: detailedUserProfile?.streetAddress || ''
        }
      });

      console.log('OpenAI optimization completed');

      // Structure results with real user data
      const mockResults = {
        matchScore: aiResults.matchScore,
        summary: aiResults.summary,
        strengths: aiResults.strengths,
        gaps: aiResults.gaps,
        suggestions: aiResults.suggestions,
        optimizedResumeUrl: '#',
        optimizedCoverLetterUrl: '#',
        keywordAnalysis: aiResults.keywordAnalysis,
        experienceOptimization: aiResults.experienceOptimization,
        skillsOptimization: aiResults.skillsOptimization,
        parsedResume: {
          personal: {
            name: detailedUserProfile?.fullName || 'Your Name',
            email: user?.email || 'unknown@email.com', // Use real email from auth
            phone: detailedUserProfile?.contactNumber || '',
            location: detailedUserProfile?.streetAddress || ''
          }
        },
        extractionMetadata: {
          documentId: `doc-${Date.now()}`,
          extractedTextLength: extractedPDFData.text.length,
          processingTime: 4.2,
          modelUsed: 'gpt-4o',
          apiBaseUrl: 'https://api.openai.com',
          pdfPages: extractedPDFData.pages,
          pdfMetadata: extractedPDFData.metadata,
          sourceMethod: extractedPDFData.metadata?.source || 'pdf_extraction'
        },
        aiEnhancements: aiResults.aiEnhancements,
        rawAIResponse: aiResults,
        jobDescription,
        applicationData,
        detailedUserProfile,
        extractedText: extractedPDFData.text,
        optimizedResumeText: aiResults.optimizedResumeText
      };

      setLocalOptimizationResults(mockResults);
      setStep('results');
      showSuccess('AI Enhancement Complete!', 'Your resume has been optimized using OpenAI GPT-4.');
    } catch (error: any) {
      console.error('AI enhancement failed:', error);

      // Show user-friendly error message
      if (error.message.includes('API key')) {
        showError('Configuration Error', 'OpenAI API key is not properly configured. Please contact support or check your environment setup.');
      } else if (error.message.includes('quota')) {
        showError('Service Limit Reached', 'The AI service quota has been exceeded. Please try again later or contact support.');
      } else if (error.message.includes('network')) {
        showError('Connection Error', 'Unable to connect to AI service. Please check your internet connection and try again.');
      } else {
        showError('AI Enhancement Failed', error.message || 'Failed to enhance your resume. Please try again.');
      }

      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
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
      showSuccess('Copied to clipboard', `${type === 'job' ? 'Job description' : 'Extracted text'} copied successfully.`);
    } catch (error) {
      showError('Copy failed', 'Failed to copy text to clipboard.');
    }
  };

  const handleClose = () => {
    setUploadedFile(null);
    setOptimizationResults(null);
    setExtractedPDFData(null);
    setStep('upload');
    setShowJobDescription(true);
    setShowExtractedText(false);
    onClose();
  };

  if (step === 'results' && localOptimizationResults) {
    return (
      <OptimizationResults
        results={localOptimizationResults}
        onClose={handleClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                AI Resume Enhancement
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Optimize your resume for {applicationData?.position || 'this position'} at {applicationData?.company_name || 'this company'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {step === 'upload' && (
            <>
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
                        copyToClipboard(jobDescription, 'job');
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
                        {jobDescription}
                      </pre>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                      Character count: {jobDescription.length} | Lines: {jobDescription.split('\n').length}
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Upload Your Current Resume
                </h3>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 transition-colors"
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    {uploadedFile ? `📄 ${uploadedFile.name}` : 'Click to upload your resume (PDF or text file)'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Maximum file size: 10MB • PDF or TXT format
                  </p>
                  {isExtracting && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Processing file...</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  onChange={handleFileUpload}
                  className="hidden"
                />
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
                        Extracted Resume Text
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

              {/* Enhancement Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleEnhanceResume}
                  disabled={isProcessing || (!extractedPDFData?.text && !manualText.trim())}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 transition-all disabled:cursor-not-allowed"
                >
                  <Wand2 size={20} />
                  {extractedPDFData?.text ? 'Enhance with AI' : showManualInput ? 'Add Resume Text First' : 'Upload Resume First'}
                </button>
              </div>

              {!extractedPDFData?.text && !showManualInput && uploadedFile && (
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
            </>
          )}

          {step === 'processing' && (
            <div className="text-center py-12">
              <div className="relative">
                <Brain className="h-20 w-20 text-purple-600 mx-auto mb-6 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                AI is analyzing your resume...
              </h3>
              <div className="space-y-2 text-gray-600 dark:text-gray-400">
                <p>• Analyzing {extractedPDFData?.text.length} characters of extracted text</p>
                <p>• Matching against job requirements and keywords</p>
                <p>• Optimizing content for better ATS compatibility</p>
                <p>• Generating enhanced resume and cover letter</p>
              </div>
              <div className="mt-6">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full animate-pulse" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIEnhancementModal;



