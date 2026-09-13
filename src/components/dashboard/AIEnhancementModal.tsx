import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  HardDrive,
  Target,
  Upload,
  X,
} from 'lucide-react';
import DocumentResults from './documents/DocumentResults';
import {
  DocumentServiceError,
  generateDocuments,
  type GeneratedDocuments,
} from '../../services/documentService';
import { extractTextFromPDF, validatePDFFile } from '../../utils/pdfUtils';
import type { UserProfileData } from '../../services/profileService';

/**
 * Upload a resume, generate tailored LaTeX documents.
 *
 * This used to be ~1,900 lines that also built HTML, rendered PDFs with
 * @react-pdf/renderer and uploaded them. All of that now happens server-side
 * behind /api/documents/generate; the modal's job is collecting the input.
 */

interface AIEnhancementModalProps {
  jobDescription: string;
  applicationData?: {
    id: string;
    position: string;
    company_name: string;
    location?: string;
  };
  /** Saved profile, used as ground truth for the document header. */
  detailedUserProfile?: UserProfileData | null;
  onSave: (resumeUrl: string, coverLetterUrl: string) => void;
  onClose: () => void;
}

const MIN_RESUME_CHARS = 50;

const LOADER_TIPS = [
  '💡 AI can miss details — regenerate if something looks off.',
  '📄 You will get editable LaTeX, not just a PDF.',
  '✍️ "Open in Overleaf" lets you fine-tune the design yourself.',
  '👤 Missing contact details? Add them to your profile first.',
  '🎯 A longer job description produces a sharper match.',
];

const AIEnhancementModal: React.FC<AIEnhancementModalProps> = ({
  jobDescription,
  applicationData = { id: '', position: '', company_name: '' },
  detailedUserProfile,
  onSave,
  onClose,
}) => {
  const [resumeText, setResumeText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState('');
  const [showJobDescription, setShowJobDescription] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState<GeneratedDocuments | null>(null);
  const [tip, setTip] = useState(LOADER_TIPS[0]);

  // Rotate loader tips; generation takes 10-30s so a static message gets stale.
  useEffect(() => {
    if (!generating) return;
    const id = setInterval(
      () => setTip(LOADER_TIPS[Math.floor(Math.random() * LOADER_TIPS.length)]),
      5000,
    );
    return () => clearInterval(id);
  }, [generating]);

  // Report generated URLs upward once, when they first arrive.
  const savedRef = useRef(false);
  useEffect(() => {
    if (documents && !savedRef.current) {
      savedRef.current = true;
      onSave(documents.resumeUrl, documents.coverLetterUrl);
    }
  }, [documents, onSave]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validatePDFFile(file);
    if (!validation.isValid) {
      setError(validation.error || 'Please select a valid PDF or text file.');
      return;
    }

    setExtracting(true);
    setError('');
    setShowManualInput(false);
    setManualText('');
    setFileName(file.name);

    try {
      const result = await extractTextFromPDF(file);

      if (result.error === 'MANUAL_INPUT_REQUIRED' || !result.text?.trim()) {
        setShowManualInput(true);
        setResumeText('');
        setError('We could not read text from that file. Please paste your resume below.');
        return;
      }

      setResumeText(result.text);
    } catch (err) {
      console.error('[AIEnhancementModal] Extraction failed:', err);
      setShowManualInput(true);
      setError('We could not read that file. Please paste your resume below.');
    } finally {
      setExtracting(false);
    }
  };

  const runGeneration = useCallback(
    async (text: string) => {
      setGenerating(true);
      setError('');
      setProgress('Sending your resume to the AI…');

      try {
        // Progress is coarse because the work happens in one server request.
        // Honest coarse beats a fake percentage that stalls at 90%.
        const timer = setTimeout(
          () => setProgress('Writing and compiling your documents…'),
          6000,
        );

        const result = await generateDocuments({
          resumeText: text,
          jobDescription,
          jobApplicationId: applicationData?.id || undefined,
          company_name: applicationData?.company_name,
          position: applicationData?.position,
          location: applicationData?.location,
          profile: detailedUserProfile
            ? {
                fullName: detailedUserProfile.fullName,
                email: detailedUserProfile.email,
                phone: detailedUserProfile.phone,
                location: detailedUserProfile.location,
                linkedin: detailedUserProfile.linkedin,
                github: detailedUserProfile.github,
                portfolio: detailedUserProfile.portfolio,
              }
            : undefined,
        });

        clearTimeout(timer);
        setDocuments(result);
      } catch (err) {
        console.error('[AIEnhancementModal] Generation failed:', err);
        setError(
          err instanceof DocumentServiceError
            ? err.message
            : 'Document generation failed. Please try again.',
        );
      } finally {
        setGenerating(false);
        setProgress('');
      }
    },
    [applicationData, detailedUserProfile, jobDescription],
  );

  const effectiveText = (showManualInput ? manualText : resumeText).trim();
  const canGenerate = effectiveText.length >= MIN_RESUME_CHARS && !generating && !extracting;

  if (documents) {
    return (
      <DocumentResults
        documents={documents}
        jobDetails={{
          title: applicationData?.position || 'Position',
          company: applicationData?.company_name || 'Company',
        }}
        onBack={onClose}
        onRegenerate={() => {
          setDocuments(null);
          savedRef.current = false;
          void runGeneration(effectiveText);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white dark:bg-gray-800">
        {generating && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="m-4 w-full max-w-md rounded-xl border border-gray-600 bg-gray-800 p-8 shadow-2xl">
              <div className="flex flex-col items-center gap-6">
                <span className="relative flex h-20 w-20 items-center justify-center">
                  <span className="absolute inline-flex h-20 w-20 animate-ping rounded-full bg-blue-400 opacity-30" />
                  <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                    <Brain className="text-white" size={40} />
                  </span>
                </span>

                <div className="space-y-3 text-center">
                  <h3 className="text-xl font-bold text-white">Building your documents</h3>
                  <p className="text-sm font-medium text-blue-300">{progress}</p>
                  <p className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-xs leading-relaxed text-gray-200">
                    {tip}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-purple-600">
              <Brain className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Resume &amp; Cover Letter Optimizer
              </h2>
              {applicationData?.position && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {applicationData.position} at {applicationData.company_name}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {error && (
            <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {jobDescription && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20">
              <button
                type="button"
                onClick={() => setShowJobDescription((v) => !v)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <span className="flex items-center gap-3">
                  <Target className="text-blue-600 dark:text-blue-400" size={20} />
                  <span className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    Target job description
                  </span>
                </span>
                {showJobDescription ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {showJobDescription && (
                <div className="px-4 pb-4">
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-blue-200 bg-white p-4 dark:border-blue-600 dark:bg-gray-800">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                      {jobDescription}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Upload size={16} />
              Upload your current resume
            </p>

            <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center dark:border-gray-600">
              <HardDrive className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <label className="cursor-pointer">
                <span className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700">
                  Browse local files
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt"
                  onChange={handleFileSelect}
                />
              </label>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                PDF or text, up to 10&nbsp;MB
              </p>

              {extracting && (
                <div className="mt-4 flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
                  <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-purple-600" />
                  <span>Reading your resume…</span>
                </div>
              )}

              {fileName && !extracting && resumeText && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 dark:bg-green-900/30">
                  <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-700 dark:text-green-400">
                    {fileName} — {resumeText.length.toLocaleString()} characters
                  </span>
                </div>
              )}
            </div>
          </div>

          {showManualInput && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-700 dark:bg-yellow-900/20">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <FileText className="text-yellow-600 dark:text-yellow-400" size={20} />
                Paste your resume
              </h3>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste your resume text here…"
                className="h-48 w-full resize-none rounded-lg border border-gray-300 bg-white p-4 font-mono text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {manualText.length.toLocaleString()} characters
                {manualText.trim().length > 0 && manualText.trim().length < MIN_RESUME_CHARS && (
                  <span className="text-yellow-700 dark:text-yellow-400">
                    {' '}
                    — need at least {MIN_RESUME_CHARS}
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="flex gap-4 border-t border-gray-200 pt-4 dark:border-gray-700">
            <button
              type="button"
              onClick={() => void runGeneration(effectiveText)}
              disabled={!canGenerate}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-medium text-white transition-all hover:from-blue-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
            >
              <Brain size={20} />
              Generate resume &amp; cover letter
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-red-600 px-6 py-3 font-medium text-white transition-all hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              Cancel
            </button>
          </div>

          {!showManualInput && !resumeText && fileName && !extracting && (
            <button
              type="button"
              onClick={() => setShowManualInput(true)}
              className="w-full text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              Paste your resume text instead
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIEnhancementModal;
