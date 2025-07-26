import React, { useState, useMemo } from 'react';
import { ArrowLeft, Download, FileText, CheckCircle, Target, TrendingUp, Award, Brain, Copy, Check, ChevronDown, ChevronUp, AlertCircle, Eye } from 'lucide-react';
import { PDFViewer, PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

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

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #2563eb',
    paddingBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  title: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  contactInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 10,
    color: '#6b7280',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    borderLeft: '4 solid #2563eb',
    paddingLeft: 8,
  },
  text: {
    fontSize: 10,
    lineHeight: 1.4,
    color: '#374151',
    marginBottom: 5,
  },
  bulletPoint: {
    fontSize: 10,
    lineHeight: 1.4,
    color: '#374151',
    marginBottom: 3,
    marginLeft: 10,
  },
});

// Resume PDF Document Component
const ResumePDFDocument: React.FC<{ content: string; jobDetails: any }> = ({ content, jobDetails }) => {
  // Parse HTML content to plain text for PDF
  const plainTextContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>AI-Enhanced Resume</Text>
          <Text style={styles.title}>Optimized for {jobDetails.title} at {jobDetails.company}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI-Enhanced Content</Text>
          <Text style={styles.text}>{plainTextContent}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Target Position</Text>
          <Text style={styles.text}>Position: {jobDetails.title}</Text>
          <Text style={styles.text}>Company: {jobDetails.company}</Text>
        </View>
      </Page>
    </Document>
  );
};

// Cover Letter PDF Document Component  
const CoverLetterPDFDocument: React.FC<{ content: string; jobDetails: any }> = ({ content, jobDetails }) => {
  const plainTextContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>AI-Generated Cover Letter</Text>
          <Text style={styles.title}>For {jobDetails.title} at {jobDetails.company}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.text}>{new Date().toLocaleDateString()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.text}>Dear Hiring Manager,</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.text}>{plainTextContent}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.text}>Sincerely,</Text>
          <Text style={styles.text}>Your Name</Text>
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

  const downloadAsDocx = (content: string, filename: string) => {
    // Simple DOCX generation - create RTF format which can be opened by Word
    const plainText = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}} \\f0\\fs24 ${plainText.replace(/\n/g, '\\par ')}}`;

    const blob = new Blob([rtfContent], { type: 'application/rtf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace('.docx', '.rtf');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Eye size={16} />
                  {showPDFPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>
            </div>

            {/* Document Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
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
                      activeDocument === 'resume' ? results.resume_html : results.cover_letter_html,
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
                  className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: activeDocument === 'resume' ? results.resume_html : results.cover_letter_html
                  }}
                />
              </div>

              {/* Download Options */}
              <div className="mt-4 space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => downloadAsText(
                      activeDocument === 'resume' ? results.resume_html : results.cover_letter_html,
                      activeDocument === 'resume' ? 'ai-enhanced-resume.txt' : 'ai-enhanced-cover-letter.txt'
                    )}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download size={16} />
                    Download TXT
                  </button>
                  <button
                    onClick={() => downloadAsDocx(
                      activeDocument === 'resume' ? results.resume_html : results.cover_letter_html,
                      activeDocument === 'resume' ? 'ai-enhanced-resume.docx' : 'ai-enhanced-cover-letter.docx'
                    )}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileText size={16} />
                    Download RTF/Word
                  </button>
                </div>

                {/* PDF Download Links */}
                <div className="flex gap-3">
                  <PDFDownloadLink
                    document={
                      activeDocument === 'resume' ?
                        <ResumePDFDocument content={results.resume_html} jobDetails={jobDetails} /> :
                        <CoverLetterPDFDocument content={results.cover_letter_html} jobDetails={jobDetails} />
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
                        {loading ? 'Generating PDF...' : 'Download PDF'}
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
                        <ResumePDFDocument content={results.resume_html} jobDetails={jobDetails} /> :
                        <CoverLetterPDFDocument content={results.cover_letter_html} jobDetails={jobDetails} />
                      }
                    </PDFViewer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Keyword Analysis */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
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
                      className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-sm font-medium"
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
                      className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full text-sm font-medium"
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
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 text-center">
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
                downloadAsText(results.resume_html, 'ai-enhanced-resume.txt');
                downloadAsText(results.cover_letter_html, 'ai-enhanced-cover-letter.txt');
              }}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-all hover:shadow-lg flex items-center gap-2"
            >
              <Download size={16} />
              Download Both Documents
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationResults;