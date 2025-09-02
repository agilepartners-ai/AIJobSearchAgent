import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, EyeOff, ArrowLeft, Briefcase, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { JobApplication, FirebaseJobApplicationService } from '../../services/firebaseJobApplicationService';
import { useAuth } from '../../hooks/useAuth';
import { useToastContext } from '../ui/ToastProvider';
import DashboardHeader from './DashboardHeader';
import LeftSidebar from './LeftSidebar';

interface SavedResumePageProps {
  onBack: () => void;
  onAddApplication: () => void;
  onJobPreferences: () => void;
  onUpdateProfile: () => void;
  onFindMoreJobs?: () => void;
  onUpgrade: () => void;
  userProfile: any;
}

const SavedResumePage: React.FC<SavedResumePageProps> = ({
  onBack,
  onAddApplication,
  onJobPreferences,
  onUpdateProfile,
  onFindMoreJobs,
  onUpgrade,
  userProfile
}) => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDocumentType, setActiveDocumentType] = useState<'resume' | 'cover_letter'>('resume');
  const [previewStates, setPreviewStates] = useState<{ [key: string]: boolean }>({});
  const [resolvedUrls, setResolvedUrls] = useState<{ [appId: string]: string | null }>({});
  const [resolving, setResolving] = useState<{ [appId: string]: boolean }>({});

  const { user, loading: authLoading } = useAuth();
  const { showError } = useToastContext();

  useEffect(() => {
    console.log('[SavedResumePage] Effect: authLoading=', authLoading, 'user=', !!user);
    if (!authLoading) {
      loadSavedResumes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const logAppInspection = (app: JobApplication) => {
    console.log(`[SavedResumePage] Inspecting app ${app.id}:`, {
      resume_url: (app as any).resume_url,
      cover_letter_url: (app as any).cover_letter_url,
      resumeUrl: (app as any).resumeUrl,
      coverLetterUrl: (app as any).coverLetterUrl,
      optimizedResumeUrl: (app as any).optimizedResumeUrl,
      optimized_cover_letter_url: (app as any).optimized_cover_letter_url,
    });
  };

  const loadSavedResumes = async () => {
    console.log('[SavedResumePage] loadSavedResumes: start');
    if (authLoading) {
      console.log('[SavedResumePage] loadSavedResumes: auth still loading, abort');
      return; // Still loading authentication
    }

    if (!user) {
      console.warn('[SavedResumePage] loadSavedResumes: no user');
      setError('Please log in to view your saved resumes');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[SavedResumePage] Fetching applications for user:', user.id);
      const allApplications = await FirebaseJobApplicationService.getUserApplications(user.id);
      console.log('[SavedResumePage] Fetched applications count:', allApplications.length);

      // Filter applications that have either resume_url or cover_letter_url (accept camelCase too)
      const savedResumes = allApplications.filter(app => {
        const present = !!(
          (app as any).resume_url ||
          (app as any).cover_letter_url ||
          (app as any).resumeUrl ||
          (app as any).coverLetterUrl ||
          (app as any).optimizedResumeUrl ||
          (app as any).optimized_resume_url ||
          (app as any).optimizedCoverLetterUrl ||
          (app as any).optimized_cover_letter_url
        );
        if (present) logAppInspection(app);
        return present;
      });

      console.log('[SavedResumePage] Applications with documents:', savedResumes.map(a => a.id));
      setApplications(savedResumes);

      // Set all previews to show by default
      const defaultPreviewStates: { [key: string]: boolean } = {};
      savedResumes.forEach(app => {
        defaultPreviewStates[app.id] = true;
      });
      setPreviewStates(defaultPreviewStates);

      // Kick off URL resolution (non-blocking)
      resolveAllUrls(savedResumes);
    } catch (err: any) {
      console.error('[SavedResumePage] Error loading saved resumes:', err);
      setError(err.message || 'Failed to load saved resumes');
      showError('Error', 'Failed to load saved resumes');
    } finally {
      setLoading(false);
      console.log('[SavedResumePage] loadSavedResumes: finished');
    }
  };

  const togglePreview = (applicationId: string) => {
    setPreviewStates(prev => ({
      ...prev,
      [applicationId]: !prev[applicationId]
    }));
  };

  const getDocumentCandidates = (application: JobApplication): string[] => {
    // Order of preference: explicit saved, optimized, camelCase, snake_case
    const candidates: (string | null | undefined)[] = [
      (application as any).resume_url,
      (application as any).resumeUrl,
      (application as any).optimizedResumeUrl,
      (application as any).optimized_resume_url,
      (application as any).cover_letter_url,
      (application as any).coverLetterUrl,
      (application as any).optimizedCoverLetterUrl,
      (application as any).optimized_cover_letter_url,
    ];

    // Normalize and filter empties
    return candidates
      .filter(Boolean)
      .map(c => String(c))
      .filter(Boolean);
  };

  const tryNormalizeToHttp = (raw: string): string => {
    // eslint-disable-next-line no-useless-escape
    try {
      // If already looks like full http(s) URL, return decoded
      if (/^https?:\/\//i.test(raw)) return decodeIfNeeded(raw);

      // If gs://bucket/path -> https://storage.googleapis.com/bucket/path
      if (raw.startsWith('gs://')) {
        const without = raw.replace(/^gs:\/\//, '');
        const [bucket, ...rest] = without.split('/');
        const path = rest.join('/');
        return `https://storage.googleapis.com/${bucket}/${decodeIfNeeded(path)}`;
      }

      // If percent-encoded path like ApplicationDocuments%2Fxxx, decode and treat as object path
      const decoded = decodeIfNeeded(raw);

      // If decoded looks like an object path (contains '/'), and a bucket env exists, use it
      const bucket = (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_STORAGE_BUCKET || '');
      if (decoded && decoded.includes('/') && bucket) {
        return `https://storage.googleapis.com/${bucket.replace(/^gs:\/\/|\/$/g, '')}/${decoded}`;
      }

      // If it's just a filename or folder path and bucket exists, prefix
      if (bucket && decoded) {
        return `https://storage.googleapis.com/${bucket.replace(/^gs:\/\/|\/$/g, '')}/${decoded}`;
      }

      // As a last resort, return decoded string (may be a URL missing protocol)
      if (/^[\w\-_.]+\/.+/.test(decoded)) {
        // Looks like path/object -> try storage.googleapis.com with no bucket
        return `https://storage.googleapis.com/${decoded}`;
      }

      return decoded;
    } catch (err) {
      console.warn('[SavedResumePage] tryNormalizeToHttp error for raw:', raw, err);
      return raw;
    }
  }

  const decodeIfNeeded = (s: string) => {
    try {
      // Try decode once, if it fails return original
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };

  const checkUrlReachable = async (url: string) => {
    try {
      console.log('[SavedResumePage] checkUrlReachable HEAD', url);
      const resp = await fetch(url, { method: 'HEAD' });
      console.log('[SavedResumePage] HEAD response', url, resp.status);
      return resp.ok;
    } catch (err) {
      console.warn('[SavedResumePage] HEAD fetch failed for', url, err);
      // Some hosts may reject HEAD; fallback to GET with range or small timeout
      try {
        const r2 = await fetch(url, { method: 'GET' });
        console.log('[SavedResumePage] GET fallback response', url, r2.status);
        return r2.ok;
      } catch (err2) {
        console.warn('[SavedResumePage] GET fallback also failed for', url, err2);
        return false;
      }
    }
  };

  const resolveUrlForApplication = async (app: JobApplication) => {
    const id = app.id;
    console.log('[SavedResumePage] resolveUrlForApplication start:', id);
    setResolving(prev => ({ ...prev, [id]: true }));

    const candidates = getDocumentCandidates(app);
    console.log('[SavedResumePage] candidates for', id, candidates);

    for (const raw of candidates) {
      try {
        // Normalize candidate to HTTP URL
        const normalized = tryNormalizeToHttp(raw);
        console.log(`[SavedResumePage] trying normalized url for app ${id}:`, normalized);

        // Quick reachability check
        const ok = await checkUrlReachable(normalized);
        if (ok) {
          console.log(`[SavedResumePage] resolved URL for ${id}:`, normalized);
          setResolvedUrls(prev => ({ ...prev, [id]: normalized }));
          setResolving(prev => ({ ...prev, [id]: false }));
          return normalized;
        } else {
          console.warn(`[SavedResumePage] candidate not reachable for ${id}:`, normalized);
        }

        // Try decoded raw
        const decoded = decodeIfNeeded(raw);
        if (decoded !== normalized) {
          const ok2 = await checkUrlReachable(decoded);
          if (ok2) {
            console.log(`[SavedResumePage] resolved decoded URL for ${id}:`, decoded);
            setResolvedUrls(prev => ({ ...prev, [id]: decoded }));
            setResolving(prev => ({ ...prev, [id]: false }));
            return decoded;
          }
        }
      } catch (err) {
        console.error('[SavedResumePage] error while checking candidate', raw, err);
      }
    }

    // If none reachable, still store a best-effort URL (first candidate decoded) so iframe has something to try
    if (candidates.length > 0) {
      const best = decodeIfNeeded(candidates[0]);
      console.warn(`[SavedResumePage] No reachable candidate found for ${id}, using best-effort:`, best);
      setResolvedUrls(prev => ({ ...prev, [id]: best }));
      setResolving(prev => ({ ...prev, [id]: false }));
      return best;
    }

    console.log('[SavedResumePage] No candidates available for', id);
    setResolvedUrls(prev => ({ ...prev, [id]: null }));
    setResolving(prev => ({ ...prev, [id]: false }));
    return null;
  };

  const resolveAllUrls = async (apps: JobApplication[]) => {
    console.log('[SavedResumePage] resolveAllUrls for', apps.map(a => a.id));
    // Limit concurrency to avoid too many HEAD requests at once
    const concurrency = 4;
    let index = 0;

    const worker = async () => {
      while (index < apps.length) {
        const i = index++;
        const app = apps[i];
        await resolveUrlForApplication(app);
      }
    };

    const workers = Array.from({ length: concurrency }).map(() => worker());
    await Promise.all(workers);
    console.log('[SavedResumePage] resolveAllUrls: done', resolvedUrls);
  };

  const getDocumentUrlToUse = (application: JobApplication) => {
    // If a resolved URL exists, prefer it
    if (resolvedUrls[application.id]) {
      return resolvedUrls[application.id];
    }

    // Otherwise, fall back to candidate normalization (non-prefixed)
    const candidates = getDocumentCandidates(application);
    if (candidates.length === 0) return null;
    const first = candidates[0];
    try {
      return tryNormalizeToHttp(first);
    } catch {
      return decodeIfNeeded(first);
    }
  };

  const hasDocument = (application: JobApplication) => {
    const url = getDocumentUrlToUse(application);
    return !!url && url !== 'null' && url !== 'undefined';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Render loading or UI
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {authLoading ? 'Loading authentication...' : 'Loading saved resumes...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader
        userProfile={userProfile}
        onAddApplication={onAddApplication}
        onJobPreferences={onJobPreferences}
        onUpdateProfile={onUpdateProfile}
      />

      <LeftSidebar
        onDashboard={onBack}
        onFindMoreJobs={onFindMoreJobs}
        onAddApplication={onAddApplication}
        onSavedResume={() => {}} // Already on saved resume page
        onUpgrade={onUpgrade}
      />

      <main className="ml-64 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Saved Resumes</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                View and manage your saved resume and cover letter documents
              </p>
            </div>

            {/* Document Type Toggle */}
            <div className="flex bg-gray-900 rounded-lg p-1">
              <button
                onClick={() => setActiveDocumentType('resume')}
                className={`px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${
                  activeDocumentType === 'resume'
                    ? 'bg-gray-700'
                    : 'bg-gray-900 hover:bg-gray-800'
                }`}
              >
                Resume
              </button>
              <button
                onClick={() => setActiveDocumentType('cover_letter')}
                className={`px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${
                  activeDocumentType === 'cover_letter'
                    ? 'bg-gray-700'
                    : 'bg-gray-900 hover:bg-gray-800'
                }`}
              >
                Cover Letter
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {applications.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No saved resumes found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Generate and save resume and cover letter documents from job applications to see them here.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {applications.map((application) => {
              const docUrl = getDocumentUrlToUse(application);
              const isResolving = resolving[application.id];
              return (
              <div
                key={application.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Job Info Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg leading-tight">
                        {application.position}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 font-medium mt-1">
                        {application.company_name}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      application.status === 'applied' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                      application.status === 'interviewing' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' :
                      application.status === 'offered' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400' :
                      application.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
                      'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400'
                    }`}>
                      {application.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {application.location && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        <span>{application.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>Applied: {formatDate(application.application_date)}</span>
                    </div>
                    {application.job_posting_url && (
                      <div className="flex items-center gap-2">
                        <ExternalLink size={14} />
                        <a
                          href={application.job_posting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline truncate"
                        >
                          View Job Posting
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Section */}
                <div className="p-6">
                  {hasDocument(application) ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-gray-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {activeDocumentType === 'resume' ? 'Resume' : 'Cover Letter'}
                            {isResolving && <span className="ml-2 text-xs text-gray-500"> (resolving...)</span>}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => togglePreview(application.id)}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-green-700 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-green-900 dark:hover:bg-gray-600 transition-colors"
                          >
                            {previewStates[application.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            {previewStates[application.id] ? 'Hide Preview' : 'Show Preview'}
                          </button>
                          <a
                            href={docUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors"
                          >
                            <Download size={14} />
                            Download
                          </a>
                        </div>
                      </div>

                      {previewStates[application.id] && (
                        <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                          {docUrl ? (
                            <iframe
                              src={docUrl}
                              className="w-full h-64 bg-white"
                              title={`${activeDocumentType === 'resume' ? 'Resume' : 'Cover Letter'} Preview`}
                            />
                          ) : (
                            <div className="p-6 text-center text-sm text-gray-500">
                              Unable to preview document. Stored URL is not reachable.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText size={32} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No {activeDocumentType === 'resume' ? 'resume' : 'cover letter'} available
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}
        </div>
      </main>
    </div>
  );
};

export default SavedResumePage;