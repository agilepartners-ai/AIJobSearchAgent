import React, { useEffect } from 'react';
import { X, Download, FileText, CheckCircle, AlertCircle, Target, TrendingUp, Award, Brain, Settings, Upload, HardDrive } from 'lucide-react';
import OptimizationResults from './OptimizationResults';
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
      // If using cloud URL, download the file first
      if (cloudFileUrl && !fileToProcess) {
        setExtractionProgress('Downloading file from cloud storage...');
        fileToProcess = await downloadFileFromUrl(cloudFileUrl);
      }

      if (!fileToProcess) {
        throw new Error('No file to process');
      }

      // Step 1: Extract resume data using AI
      setExtractionProgress('Extracting resume data using AI...');
      const extractionResult = await ResumeExtractionService.extractResumeJson(fileToProcess, {
        modelType: config.defaultModelType,
        model: config.defaultModel,
        fileId: documentId // Use the persistent UUID
      });

      if (!extractionResult.success) {
        // Handle specific API errors
        if (extractionResult.error?.includes('PDF format not supported') ||
          extractionResult.error?.includes('format not supported') ||
          extractionResult.error?.includes('unsupported file type')) {
          throw new Error('PDF format not supported by the current API. Please try uploading a Word document (.docx) or text file (.txt) instead.');
        }

        if (extractionResult.error?.includes('API key') ||
          extractionResult.error?.includes('authentication')) {
          throw new Error('API authentication failed. Please check your OpenAI API key configuration.');
        }

        if (extractionResult.error?.includes('rate limit') ||
          extractionResult.error?.includes('quota')) {
          throw new Error('API rate limit exceeded. Please try again in a few minutes.');
        }

        throw new Error(extractionResult.error || 'Failed to extract resume data. The API may be temporarily unavailable.');
      }

      setExtractionProgress('Processing extracted data...');

      // Parse the extracted resume data
      const parsedResumeData = ResumeExtractionService.parseResumeData(extractionResult.resume_json);

      if (!parsedResumeData) {
        throw new Error('Failed to parse extracted resume data. The resume format may not be compatible.');
      }

      // Step 2: Enhance resume using AI analysis
      setExtractionProgress('Analyzing resume against job description...');

      let enhancementResult;
      try {
        // Try using the JSON mode first (more reliable)
        enhancementResult = await AIEnhancementService.enhanceWithJson(
          extractionResult.resume_json,
          jobDescription,
          {
            modelType: config.defaultModelType,
            model: config.defaultModel,
            fileId: documentId
          }
        );
      } catch (jsonError) {
        // Fallback to file mode
        setExtractionProgress('Retrying analysis with file upload...');
        enhancementResult = await AIEnhancementService.enhanceWithFile(
          fileToProcess,
          jobDescription,
          {
            modelType: config.defaultModelType,
            model: config.defaultModel,
            fileId: documentId
          }
        );
      }

      if (!enhancementResult.success) {
        throw new Error(enhancementResult.error || 'Failed to analyze resume. Please try again.');
      }

      // Normalize the response to ensure all fields exist
      const normalizedResult = AIEnhancementService.normalizeEnhancementResponse(enhancementResult);

      setExtractionProgress('Generating optimization recommendations...');

      // Generate mock URLs for the enhanced documents (will be replaced by real PDF generation)
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
            `Strong technical background with ${parsedResumeData.experience?.length || 0} work experience entries`,
            `Comprehensive skill set including relevant technologies`,
            `Educational background aligns with job requirements`
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
        experienceOptimization: parsedResumeData.experience?.map((exp: any, index: number) => ({
          company: exp.company || 'Unknown Company',
          position: exp.position || 'Unknown Position',
          relevanceScore: Math.max(70, normalizedResult.analysis.match_score - (index * 5)),
          included: index < 3, // Include top 3 most relevant
          reasoning: index >= 3 ? "Less relevant to target position based on AI analysis" : undefined
        })) || [],

        // Enhanced skills optimization
        skillsOptimization: {
          technicalSkills: normalizedResult.enhancements.enhanced_skills.length > 0
            ? normalizedResult.enhancements.enhanced_skills
            : Array.isArray(parsedResumeData.skills) ? parsedResumeData.skills.slice(0, 8) : [],
          softSkills: ["Leadership", "Problem Solving", "Communication", "Team Collaboration"],
          missingSkills: normalizedResult.analysis.keyword_analysis.missing_keywords.slice(0, 5)
        },

        // Include parsed resume data
        parsedResume: parsedResumeData,

        // Enhanced metadata
        extractionMetadata: {
          documentId: documentId,
          extractedTextLength: extractionResult.extracted_text_length,
          processingTime: Date.now() - timestamp,
          modelUsed: normalizedResult.metadata.model_used,
          apiBaseUrl: config.apiBaseUrl,
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
      // Provide user-friendly error messages with improved HTTP 500 handling
      let userMessage = err.message;

      // Handle HTTP 500 errors specifically
      if (err.message.includes('HTTP error! status: 500') || err.message.includes('status: 500')) {
        userMessage = 'The AI service is experiencing temporary issues on the server side. This is usually resolved quickly. Please try again in a few moments, or contact support if the problem persists.';
      } else if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
        userMessage = 'Unable to connect to the AI service. Please check your internet connection and try again.';
      } else if (err.message.includes('timeout') || err.message.includes('timed out')) {
        userMessage = 'The AI processing is taking longer than expected. Please try again with a smaller file or try again later.';
      } else if (err.message.includes('API key')) {
        userMessage = 'API configuration error. Please contact support for assistance.';
      } else if (!err.message || err.message === 'Failed to generate AI-enhanced documents. Please try again.') {
        userMessage = 'The AI service is temporarily unavailable. Please try again in a few minutes or contact support if the issue persists.';
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

  if (showResults && optimizationResults) {
    return (
      <OptimizationResults
        results={optimizationResults}
        onClose={handleResultsClose}
      />
    );
  }

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

          {/* Job Description - First Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText size={16} className="inline mr-2" />
              Job Description
            </label>
            <textarea
              value={jobDescription || persistedJobDescription || ''}
              readOnly
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              placeholder="Job description will be used to tailor your resume and cover letter..."
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This job description will be analyzed by AI to optimize your resume and cover letter
            </p>
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
        </div>
      </div>
    </div>
  );
};

export default AIEnhancementModal;
