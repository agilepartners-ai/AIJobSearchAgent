import React from 'react';
import { X, Download, FileText, CheckCircle, AlertCircle, Target, TrendingUp, Award, Brain, ArrowLeft, ExternalLink } from 'lucide-react';

interface OptimizedResultsPageProps {
  results: {
    matchScore: number;
    summary: string;
    strengths: string[];
    gaps: string[];
    suggestions: string[];
    optimizedResumeText: string;
    tweakedText: string;
    optimizedResumeUrl: string;
    optimizedCoverLetterUrl: string;
    djangoUserId: number;
    firebaseUid: string;
    optimizationSuccessful: boolean;
    explanation?: string;
    keywordAnalysis?: {
      coverageScore: number;
      coveredKeywords: string[];
      missingKeywords: string[];
    };
    experienceOptimization?: {
      company: string;
      position: string;
      relevanceScore: number;
      included: boolean;
      reasoning?: string;
    }[];
    skillsOptimization?: {
      technicalSkills: string[];
      softSkills: string[];
      missingSkills: string[];
    };
  };
  onClose: () => void;
  onBackToDashboard: () => void;
}

const OptimizedResultsPage: React.FC<OptimizedResultsPageProps> = ({ 
  results, 
  onClose, 
  onBackToDashboard 
}) => {
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

  const handleDownloadOptimizedText = () => {
    const textToDownload = results.optimizedResumeText || results.tweakedText;
    if (!textToDownload) return;
    
    const blob = new Blob([textToDownload], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'optimized-resume.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-50 overflow-y-auto">
      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={onBackToDashboard}
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
                      📊 Resume Optimization Results
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      AI-powered analysis and optimization complete
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Success Banner */}
          {results.optimizationSuccessful && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
                    ✅ Optimization Successful!
                  </h3>
                  <p className="text-green-700 dark:text-green-400">
                    Your resume has been successfully analyzed and optimized using AI. User ID: {results.djangoUserId}
                  </p>
                </div>
              </div>
            </div>
          )}

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

          {/* Optimized Resume Text */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="text-blue-600 dark:text-blue-400" size={24} />
                📝 AI-Optimized Resume Content
              </h3>
              <button
                onClick={handleDownloadOptimizedText}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Download size={16} />
                Download Text
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed max-h-96 overflow-y-auto">
                {results.optimizedResumeText || results.tweakedText}
              </pre>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
              💡 This optimized content has been tailored to match the job requirements and improve ATS compatibility.
            </p>
          </div>

          {/* Download Section */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="text-blue-600 dark:text-blue-400" size={24} />
              📄 Download Optimized Documents
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your AI-optimized resume and cover letter are ready for download in professional PDF format.
            </p>
            <div className="flex gap-4 flex-wrap">
              <a
                href={results.optimizedResumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all hover:shadow-lg"
              >
                <Download size={20} />
                Download Optimized Resume PDF
                <ExternalLink size={16} />
              </a>
              <a
                href={results.optimizedCoverLetterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all hover:shadow-lg"
              >
                <FileText size={20} />
                Download Cover Letter PDF
                <ExternalLink size={16} />
              </a>
            </div>
          </div>

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

          {/* Analysis Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Strengths */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border-l-4 border-green-500">
              <h4 className="text-lg font-semibold text-green-800 dark:text-green-400 mb-4 flex items-center gap-2">
                💪 Strengths
              </h4>
              {results.strengths && results.strengths.length > 0 ? (
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
              {results.gaps && results.gaps.length > 0 ? (
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
              {results.suggestions && results.suggestions.length > 0 ? (
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

          {/* Explanation (if available) */}
          {results.explanation && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📝 Analysis Explanation
              </h4>
              <p className="text-gray-700 dark:text-gray-300">
                {results.explanation}
              </p>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 text-center">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-2">
              🚀 Next Steps
            </h4>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your AI-optimized documents are ready! Use them for your job applications or continue optimizing for other positions.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={onBackToDashboard}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all hover:shadow-lg"
              >
                Return to Dashboard
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Close Results
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizedResultsPage;