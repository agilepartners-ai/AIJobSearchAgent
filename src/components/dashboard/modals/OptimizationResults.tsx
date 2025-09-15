import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Download, FileText, Target, Brain, Eye } from 'lucide-react';
import DOMPurify from 'dompurify';
import ResumeGenerationService from '../../../services/resumeGenerationService';

interface OptimizationResultsProps {
  results: {
    resume_pdf_url: string;
    cover_letter_pdf_url: string;
    resume_data?: any;
    cover_letter_data?: any;
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

const OptimizationResults: React.FC<OptimizationResultsProps> = ({ results, jobDetails, analysisData, onBack }) => {
  const [activeDocument, setActiveDocument] = useState<'resume' | 'cover-letter'>('resume');
  const [docHtml, setDocHtml] = useState<string>('');
  const [isLoadingDocx, setIsLoadingDocx] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    console.log('[OptimizationResults] mounted', { results, jobDetails });
  }, []);

  useEffect(() => {
    const url = activeDocument === 'resume' ? results.resume_pdf_url : results.cover_letter_pdf_url;
    console.log('[OptimizationResults] active url', { activeDocument, url });

    if (!url || typeof url !== 'string' || url.trim() === '') {
      setDocHtml('');
      return;
    }

    // Treat blob: object URLs as DOCX as well (generated DOCX blobs are typically blob: URLs)
    const isDocx = url.startsWith('blob:') || url.endsWith('.docx') || url.includes('vnd.openxmlformats-officedocument');
    if (!isDocx) {
      console.log('[OptimizationResults] active url is not a DOCX; skipping DOCX preview');
      setDocHtml('');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setIsLoadingDocx(true);
        console.log('[OptimizationResults] fetching DOCX for preview', url);
        const resp = await fetch(url);
        // use arrayBuffer for mammoth
        // Defensive: if fetch returns non-OK (404, 500, or CORS preflight failure that returns a non-OK),
        // log detailed info and bail early so UI shows "No DOCX available for preview."
        if (!resp.ok) {
          const textPreview = await resp.text().catch(() => '<no-body>');
          console.error('[OptimizationResults] fetch returned non-OK response for DOCX preview', {
            url,
            status: resp.status,
            statusText: resp.statusText,
            bodyPreview: String(textPreview).slice(0, 200)
          });
          // ensure we stop processing and surface no preview
          setDocHtml('');
          setIsLoadingDocx(false);
          return;
        }
        const arrayBuffer = await resp.arrayBuffer();
        const mammoth = await import('mammoth');
        const res = await mammoth.convertToHtml({ arrayBuffer });
        if (cancelled) return;
        const sanitized = DOMPurify.sanitize(res.value || '', { ADD_ATTR: ['target', 'rel', 'style'] });
        setDocHtml(sanitized);
        console.log('[OptimizationResults] DOCX converted and sanitized for preview');
      } catch (err) {
        console.error('[OptimizationResults] failed to convert DOCX to HTML', err);
        setDocHtml('');
      } finally {
        setIsLoadingDocx(false);
      }
    })();

    return () => { cancelled = true; };
  }, [results, activeDocument]);

  const saveChanges = () => {
    const el = editorRef.current;
    const html = el ? el.innerHTML : docHtml;
    setDocHtml(html);
    console.log('[OptimizationResults] changes saved to preview buffer', { length: html.length });
    alert('Changes saved to preview buffer. Use Download DOCX to download the edited content as HTML-in-DOCX (conversion not applied).');
  };

  const downloadDocx = () => {
    const url = activeDocument === 'resume' ? results.resume_pdf_url : results.cover_letter_pdf_url;
    if (!url || typeof url !== 'string' || url.trim() === '') {
      alert('No document available for download.');
      return;
    }

    if (url.startsWith('blob:') || url.endsWith('.docx') || url.includes('vnd.openxmlformats-officedocument')) {
      const a = document.createElement('a');
      a.href = url;
      const proposed = activeDocument === 'resume' ? 'ai-enhanced-resume.docx' : 'ai-enhanced-cover-letter.docx';
      a.download = ResumeGenerationService.sanitizeFilename(proposed);
      document.body.appendChild(a);
      a.click();
      a.remove();
      console.log('[OptimizationResults] triggered direct download of DOCX', a.download);
      return;
    }

    (async () => {
      try {
        console.log('[OptimizationResults] fetching document for download', url);
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to fetch document: ${resp.status}`);
        const blob = await resp.blob();
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        const proposed = activeDocument === 'resume' ? 'ai-enhanced-resume.docx' : 'ai-enhanced-cover-letter.docx';
        a.download = ResumeGenerationService.sanitizeFilename(proposed);
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objUrl);
        console.log('[OptimizationResults] downloaded fetched DOCX');
      } catch (err) {
        console.error('[OptimizationResults] download failed', err);
        alert('Download failed: ' + String(err));
      }
    })();
  };

  const analysisResults = analysisData || {
    matchScore: 85,
    summary: 'AI analysis summary will appear here.',
    strengths: [],
    gaps: [],
    suggestions: [],
    keywordAnalysis: { coverageScore: 75, coveredKeywords: [], missingKeywords: [] }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 text-gray-400 hover:text-gray-600">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold">🎯 Resume Enhancement Results</h1>
                <p className="text-sm text-gray-600">Optimized for {jobDetails.title} at {jobDetails.company}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Enhanced Documents</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveDocument('resume')} className={`px-3 py-2 ${activeDocument === 'resume' ? 'bg-white text-gray-900' : 'text-gray-600'}`}>
                  <FileText className="inline mr-2" /> Resume
                </button>
                <button onClick={() => setActiveDocument('cover-letter')} className={`px-3 py-2 ${activeDocument === 'cover-letter' ? 'bg-white text-gray-900' : 'text-gray-600'}`}>
                  <FileText className="inline mr-2" /> Cover Letter
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={downloadDocx} className="bg-blue-600 text-white px-4 py-2 rounded">Download DOCX</button>
              <button onClick={() => { console.log('[OptimizationResults] preview toggle clicked'); }} className="bg-gray-100 px-3 py-2 rounded">Toggle Preview</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            <div>
              <h4 className="font-semibold">{activeDocument === 'resume' ? 'Resume' : 'Cover Letter'}</h4>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="font-medium">{activeDocument === 'resume' ? 'AI-Enhanced Resume' : 'AI-Enhanced Cover Letter'}</p>
                <p className="text-sm text-gray-600">Generated from DOCX template • Preview & edit below</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Preview / Editor</h4>
              <div className="bg-gray-50 rounded-lg p-4 border">
                {isLoadingDocx ? (
                  <div>Converting DOCX for preview...</div>
                ) : (
                  docHtml ? (
                    <div>
                      <div className="mb-2 text-sm text-gray-600">DOCX Preview</div>
                      <div ref={editorRef} contentEditable className="prose max-h-96 overflow-y-auto p-3 bg-white rounded" dangerouslySetInnerHTML={{ __html: docHtml }} />
                      <div className="mt-3 flex gap-2">
                        <button onClick={saveChanges} className="px-3 py-2 bg-green-600 text-white rounded">Save Changes</button>
                        <button onClick={downloadDocx} className="px-3 py-2 bg-blue-600 text-white rounded">Download DOCX</button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-96 bg-white rounded border flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <FileText size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-sm">No DOCX available for preview.</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border">
          <h4 className="text-xl font-semibold">🚀 Next Steps</h4>
          <p className="text-gray-600 mt-4">Your AI-optimized DOCX is ready. Edit in the DOC editor on the right and use Download DOCX to save the file.</p>
          <div className="flex gap-4 justify-center mt-6">
            <button onClick={onBack} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg">Back to Application</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationResults;
