import React, { useState } from 'react';
import { X, Upload, FileText, Sparkles, Cloud, HardDrive, Link as LinkIcon, ExternalLink, Database, Zap, AlertTriangle } from 'lucide-react';
import OptimizedResultsPage from './OptimizedResultsPage';
import { PDFExtractionService } from '../../services/pdfExtractionService';
import { ResumeOptimizationService } from '../../services/resumeOptimizationService';
import { useAuth } from '../../hooks/useAuth';

interface AIEnhancementModalProps {
  jobDescription: string;
  onSave: (resumeUrl: string, coverLetterUrl: string) => void;
  onClose: () => void;
}

const AIEnhancementModal: React.FC<AIEnhancementModalProps> = ({ 
  jobDescription, 
  onSave, 
  onClose 
}) => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cloudProvider, setCloudProvider] = useState<string>('');
  const [cloudFileUrl, setCloudFileUrl] = useState<string>('');
  const [pdfDirectLink, setPdfDirectLink] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<any>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [currentStep, setCurrentStep] = useState<'extract' | 'optimize'>('extract');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a PDF or Word document');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      setError('');
      setCloudFileUrl(''); // Clear cloud URL if local file is selected
      setPdfDirectLink(''); // Clear direct PDF link
      setExtractedText(''); // Clear extracted text
    }
  };

  const handleCloudProviderChange = (provider: string) => {
    setCloudProvider(provider);
    setSelectedFile(null); // Clear local file if cloud provider is selected
    setCloudFileUrl('');
    setPdfDirectLink(''); // Clear direct PDF link
    setExtractedText(''); // Clear extracted text
  };

  const handlePdfDirectLinkChange = (url: string) => {
    setPdfDirectLink(url);
    setSelectedFile(null); // Clear local file
    setCloudFileUrl(''); // Clear cloud URL
    setCloudProvider(''); // Clear cloud provider
    setExtractedText(''); // Clear extracted text
  };

  const validatePdfUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return url.toLowerCase().includes('.pdf') || 
             urlObj.pathname.toLowerCase().endsWith('.pdf') ||
             url.includes('drive.google.com') ||
             url.includes('dropbox.com') ||
             url.includes('onedrive.live.com');
    } catch {
      return false;
    }
  };

  const handleExtractText = async () => {
    const hasFile = selectedFile || cloudFileUrl || pdfDirectLink;
    
    if (!hasFile) {
      setError('Please select a resume file, provide a cloud file URL, or enter a direct PDF link');
      return;
    }

    if (!jobDescription.trim()) {
      setError('Job description is required for optimization');
      return;
    }

    if (pdfDirectLink && !validatePdfUrl(pdfDirectLink)) {
      setError('Please enter a valid PDF URL');
      return;
    }

    setLoading(true);
    setError('');
    setCurrentStep('extract');

    try {
      console.log('📄 Starting PDF text extraction...');
      
      let extractionResult;
      
      if (selectedFile) {
        // Extract from local file
        extractionResult = await PDFExtractionService.extractTextFromFile(selectedFile);
      } else if (pdfDirectLink) {
        // Extract from direct PDF link
        extractionResult = await PDFExtractionService.extractTextFromUrl(pdfDirectLink);
      } else if (cloudFileUrl) {
        // Extract from cloud URL
        extractionResult = await PDFExtractionService.extractTextFromUrl(cloudFileUrl);
      } else {
        throw new Error('No valid PDF source provided');
      }

      if (!extractionResult.text || extractionResult.text.trim().length < 100) {
        throw new Error('Extracted text is too short or empty. Please ensure the PDF contains readable text.');
      }

      setExtractedText(extractionResult.text);
      setCurrentStep('optimize');
      
      console.log('✅ Text extraction completed:', {
        textLength: extractionResult.text.length,
        pageCount: extractionResult.pageCount
      });
      
    } catch (err: any) {
      console.error('❌ PDF extraction error:', err);
      setError(err.message || 'Failed to extract text from PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!extractedText) {
      setError('Please extract text from PDF first');
      return;
    }

    if (!user) {
      setError('User authentication required');
      return;
    }

    setLoading(true);
    setError('');
    setCurrentStep('optimize');

    try {
      console.log('🤖 Starting AI optimization...');
      
      // Validate request data
      const validation = ResumeOptimizationService.validateOptimizationRequest(
        user.uid,
        extractedText,
        jobDescription
      );

      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Send optimization request to API
      const apiResponse = await ResumeOptimizationService.optimizeResume(
        user.uid,
        extractedText,
        jobDescription
      );

      // Transform API response to our format
      const transformedResults = ResumeOptimizationService.transformApiResponse(apiResponse);

      setOptimizationResults(transformedResults);
      setShowResults(true);
      
      console.log('✅ AI optimization completed successfully');
      
    } catch (err: any) {
      console.error('❌ AI optimization error:', err);
      setError(err.message || 'Failed to generate AI-enhanced documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResultsClose = () => {
    setShowResults(false);
    // Save the URLs to the parent component
    if (optimizationResults) {
      onSave(optimizationResults.optimizedResumeUrl, optimizationResults.optimizedCoverLetterUrl);
    }
    onClose();
  };

  const handleBackToDashboard = () => {
    setShowResults(false);
    onClose();
  };

  if (showResults && optimizationResults) {
    return (
      <OptimizedResultsPage
        results={optimizationResults}
        onClose={handleResultsClose}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="text-white" size={20} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              AI Enhanced Resume & Cover Letter Generator
            </h2>
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
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {/* Job Description - First Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText size={16} className="inline mr-2" />
              Job Description
            </label>
            <textarea
              value={jobDescription}
              readOnly
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              placeholder="Job description will be analyzed by AI to optimize your resume..."
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              📊 This job description will be used to tailor your resume for maximum compatibility
            </p>
          </div>

          {/* Resume Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              <Upload size={16} className="inline mr-2" />
              Upload Your Current Resume (PDF)
            </label>
            
            {/* Direct PDF Link Input */}
            <div className="mb-4 p-4 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-3 mb-3">
                <LinkIcon className="text-blue-600 dark:text-blue-400" size={20} />
                <h4 className="font-medium text-blue-800 dark:text-blue-300">Direct PDF Link (Recommended)</h4>
              </div>
              <input
                type="url"
                value={pdfDirectLink}
                onChange={(e) => handlePdfDirectLinkChange(e.target.value)}
                placeholder="https://example.com/your-resume.pdf"
                className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                📄 Enter a direct link to your PDF resume (Google Drive, Dropbox, OneDrive, or any public PDF URL)
              </p>
              {pdfDirectLink && (
                <div className="mt-2 flex items-center gap-2">
                  <ExternalLink size={14} className="text-green-600" />
                  <span className="text-sm text-green-600 dark:text-green-400">PDF link detected and ready for processing</span>
                </div>
              )}
            </div>

            <div className="text-center text-gray-500 dark:text-gray-400 text-sm mb-4">
              — OR —
            </div>
            
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
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Select PDF or Word document (max 10MB)
                  </p>
                  {selectedFile && (
                    <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-400">
                        📁 Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-center text-gray-500 dark:text-gray-400 text-sm mb-4">
              — OR —
            </div>

            {/* Cloud Provider Options */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Select from cloud storage:</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Google Drive */}
                <button
                  type="button"
                  onClick={() => handleCloudProviderChange('google-drive')}
                  className={`p-4 border rounded-lg flex items-center gap-3 transition-all ${
                    cloudProvider === 'google-drive'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <Cloud size={20} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Google Drive
                  </span>
                </button>

                {/* OneDrive */}
                <button
                  type="button"
                  onClick={() => handleCloudProviderChange('onedrive')}
                  className={`p-4 border rounded-lg flex items-center gap-3 transition-all ${
                    cloudProvider === 'onedrive'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <Cloud size={20} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    OneDrive
                  </span>
                </button>

                {/* Dropbox */}
                <button
                  type="button"
                  onClick={() => handleCloudProviderChange('dropbox')}
                  className={`p-4 border rounded-lg flex items-center gap-3 transition-all ${
                    cloudProvider === 'dropbox'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <Cloud size={20} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Dropbox
                  </span>
                </button>
              </div>

              {/* Cloud File URL Input */}
              {cloudProvider && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {cloudProvider === 'google-drive' && 'Google Drive File URL'}
                    {cloudProvider === 'onedrive' && 'OneDrive File URL'}
                    {cloudProvider === 'dropbox' && 'Dropbox File URL'}
                  </label>
                  <input
                    type="url"
                    value={cloudFileUrl}
                    onChange={(e) => setCloudFileUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder={`Enter your ${cloudProvider} file URL...`}
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Make sure the file is publicly accessible or shared with appropriate permissions
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Step 1: Text Extraction */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Database className="text-green-600 dark:text-green-400 mr-2" size={20} />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Step 1: Extract Text from PDF</h3>
              </div>
              <button
                type="button"
                onClick={handleExtractText}
                disabled={loading || (!selectedFile && !cloudFileUrl && !pdfDirectLink) || !jobDescription.trim()}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all disabled:cursor-not-allowed"
              >
                {loading && currentStep === 'extract' ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Extracting Text...
                  </>
                ) : (
                  <>
                    <Database size={16} />
                    Extract Text from PDF
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              First, we'll extract readable text from your PDF resume using advanced PDF processing.
            </p>
          </div>

          {/* Extracted Text Preview */}
          {extractedText && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="text-blue-600 dark:text-blue-400" size={20} />
                  ✅ Text Extracted Successfully
                </h3>
                <button
                  onClick={() => setShowExtractedText(!showExtractedText)}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  {showExtractedText ? 'Hide Text' : 'Show Extracted Text'}
                </button>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  📊 <strong>Text Length:</strong> {extractedText.length} characters<br/>
                  📄 <strong>Status:</strong> Ready for AI optimization
                </p>
              </div>

              {showExtractedText && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Extracted Resume Text:</h4>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 max-h-64 overflow-y-auto">
                    {extractedText}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Step 2: AI Optimization */}
          {extractedText && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Sparkles className="text-blue-600 dark:text-blue-400 mr-2" size={20} />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Step 2: Generate AI-Enhanced Documents</h3>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={loading || !extractedText}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all disabled:cursor-not-allowed"
                >
                  {loading && currentStep === 'optimize' ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Generating AI Documents...
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      Generate using AI - Resume & Cover Letter
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                🤖 Now we'll send your extracted text and job description to our AI service for optimization and analysis.
              </p>
              <div className="mt-3 text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                <strong>API Endpoint:</strong> https://resumebuilder-arfb.onrender.com/api/optimize-resume/
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
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