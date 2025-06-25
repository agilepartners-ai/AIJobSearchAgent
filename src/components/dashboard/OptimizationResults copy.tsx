import React from 'react';
import { X, Download, FileText, CheckCircle, AlertCircle, Target, TrendingUp, Award, Brain } from 'lucide-react';
import ResumeTemplateForm from './ResumeTemplateForm';

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
    parsedResume?: any; // Add parsed resume data
  };
  onClose: () => void;
}

const OptimizationResults: React.FC<OptimizationResultsProps> = ({ results, onClose }) => {
  const [showTemplateForm, setShowTemplateForm] = React.useState(false);

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

  const handleContinueToApplication = () => {
    // Mock parsed resume data - in real implementation, this would come from the backend
    const mockParsedResume = {
      personal: {
        name: "John Doe",
        email: "john.doe@email.com",
        phone: "+1 (555) 123-4567",
        location: "San Francisco, CA",
        linkedin: "https://linkedin.com/in/johndoe",
        website: "https://johndoe.dev"
      },
      education: [
        {
          school: "University of California, Berkeley",
          degree: "Bachelor of Science",
          field: "Computer Science",
          gpa: "3.8",
          start_date: "2018-08",
          end_date: "2022-05",
          location: "Berkeley, CA"
        }
      ],
      experience: [
        {
          company: "Tech Solutions Inc",
          position: "Senior Software Developer",
          start_date: "2022-06",
          end_date: "Present",
          location: "San Francisco, CA",
          highlights: [
            "Led development of microservices architecture serving 1M+ users",
            "Improved application performance by 40% through optimization",
            "Mentored 3 junior developers and conducted code reviews"
          ]
        },
        {
          company: "StartupXYZ",
          position: "Full Stack Developer",
          start_date: "2021-01",
          end_date: "2022-05",
          location: "Remote",
          highlights: [
            "Built responsive web applications using React and Node.js",
            "Implemented CI/CD pipelines reducing deployment time by 60%",
            "Collaborated with design team to improve user experience"
          ]
        }
      ],
      skills: ["JavaScript", "React", "Node.js", "Python", "AWS", "MongoDB", "Git", "Docker", "Kubernetes"],
      projects: [],
      certifications: [],
      awards: [],
      languages: []
    };

    setShowTemplateForm(true);
  };

  const handleTemplateFormClose = () => {
    setShowTemplateForm(false);
  };

  const handleTemplateFormGenerate = (formData: any) => {
    console.log('Generating PDF with data:', formData);
    // Here you would make the API call to generate the PDF
    setShowTemplateForm(false);
    onClose();
  };

  if (showTemplateForm) {
    return (
      <ResumeTemplateForm
        parsedResume={results.parsedResume || {
          personal: {
            name: "John Doe",
            email: "john.doe@email.com",
            phone: "+1 (555) 123-4567",
            location: "San Francisco, CA",
            linkedin: "https://linkedin.com/in/johndoe",
            website: "https://johndoe.dev"
          },
          education: [
            {
              school: "University of California, Berkeley",
              degree: "Bachelor of Science",
              field: "Computer Science",
              gpa: "3.8",
              start_date: "2018-08",
              end_date: "2022-05",
              location: "Berkeley, CA"
            }
          ],
          experience: [
            {
              company: "Tech Solutions Inc",
              position: "Senior Software Developer",
              start_date: "2022-06",
              end_date: "Present",
              location: "San Francisco, CA",
              highlights: [
                "Led development of microservices architecture serving 1M+ users",
                "Improved application performance by 40% through optimization",
                "Mentored 3 junior developers and conducted code reviews"
              ]
            }
          ],
          skills: ["JavaScript", "React", "Node.js", "Python", "AWS", "MongoDB"],
          projects: [],
          certifications: [],
          awards: [],
          languages: []
        }}
        onClose={handleTemplateFormClose}
        onGenerate={handleTemplateFormGenerate}
      />
    );
  }

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

          {/* Download Section */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="text-blue-600 dark:text-blue-400" size={24} />
              AI-Enhanced Documents Ready
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your optimized resume and cover letter have been generated and are ready for download.
            </p>
            <div className="flex gap-4 flex-wrap">
              <a
                href={results.optimizedResumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all hover:shadow-lg"
              >
                <Download size={20} />
                Download Optimized Resume
              </a>
              <a
                href={results.optimizedCoverLetterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all hover:shadow-lg"
              >
                <FileText size={20} />
                Download Cover Letter
              </a>
            </div>
          </div>

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
                    className={`p-4 rounded-lg border-l-4 ${
                      exp.included
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {exp.included ? '✅' : '❌'} {exp.company} - {exp.position}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        exp.relevanceScore >= 70 
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
              Your AI-optimized documents are ready! Continue to create a professional PDF resume or return to your application.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={handleContinueToApplication}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all hover:shadow-lg"
              >
                Continue to Application
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
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