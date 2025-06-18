import React, { useState } from 'react';
import { X, Upload, FileText, Sparkles, Cloud, HardDrive } from 'lucide-react';
import OptimizationResults from './OptimizationResults';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cloudProvider, setCloudProvider] = useState<string>('');
  const [cloudFileUrl, setCloudFileUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<any>(null);

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
    }
  };

  const handleCloudProviderChange = (provider: string) => {
    setCloudProvider(provider);
    setSelectedFile(null); // Clear local file if cloud provider is selected
    setCloudFileUrl('');
  };

  const handleGenerateAI = async () => {
    if (!selectedFile && !cloudFileUrl) {
      setError('Please select a resume file or provide a cloud file URL');
      return;
    }

    if (!jobDescription.trim()) {
      setError('Job description is required for AI enhancement');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate mock URLs for the enhanced documents
      const timestamp = Date.now();
      const enhancedResumeUrl = `https://example.com/ai-enhanced-resume-${timestamp}.pdf`;
      const enhancedCoverLetterUrl = `https://example.com/ai-enhanced-cover-letter-${timestamp}.pdf`;
      
      // Generate mock optimization results
      const mockResults = {
        matchScore: 85,
        summary: "Your resume shows strong alignment with this position, with excellent technical skills and relevant experience. The AI optimization has enhanced keyword density and improved content structure for better ATS compatibility.",
        strengths: [
          "Strong technical background in required technologies",
          "Relevant industry experience with measurable achievements",
          "Good educational background aligned with job requirements",
          "Demonstrated leadership and project management skills"
        ],
        gaps: [
          "Missing some specific certifications mentioned in job posting",
          "Could emphasize cloud computing experience more prominently",
          "Limited mention of agile methodology experience"
        ],
        suggestions: [
          "Add specific metrics to quantify your achievements",
          "Include more industry-specific keywords throughout the resume",
          "Highlight collaborative projects and team leadership examples",
          "Consider adding a professional summary section"
        ],
        optimizedResumeUrl: enhancedResumeUrl,
        optimizedCoverLetterUrl: enhancedCoverLetterUrl,
        keywordAnalysis: {
          coverageScore: 78,
          coveredKeywords: ["JavaScript", "React", "Node.js", "AWS", "Git", "Agile", "Team Leadership"],
          missingKeywords: ["Docker", "Kubernetes", "CI/CD", "Microservices"]
        },
        experienceOptimization: [
          {
            company: "Tech Solutions Inc",
            position: "Senior Developer",
            relevanceScore: 92,
            included: true
          },
          {
            company: "StartupXYZ",
            position: "Full Stack Developer",
            relevanceScore: 85,
            included: true
          },
          {
            company: "Local Restaurant",
            position: "Server",
            relevanceScore: 15,
            included: false,
            reasoning: "Not relevant to software development position"
          }
        ],
        skillsOptimization: {
          technicalSkills: ["JavaScript", "React", "Node.js", "Python", "AWS", "MongoDB"],
          softSkills: ["Team Leadership", "Problem Solving", "Communication", "Project Management"],
          missingSkills: ["Docker", "Kubernetes", "GraphQL", "TypeScript"]
        }
      };

      setOptimizationResults(mockResults);
      setShowResults(true);
      
    } catch (err: any) {
      setError('Failed to generate AI-enhanced documents. Please try again.');
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
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
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
                        Selected: {selectedFile.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cloud Provider Options */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Or select from cloud storage:</span>
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

          {/* Generate Button */}
          <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleGenerateAI}
              disabled={loading || (!selectedFile && !cloudFileUrl) || !jobDescription.trim()}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-6 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating AI Enhanced Documents...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
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