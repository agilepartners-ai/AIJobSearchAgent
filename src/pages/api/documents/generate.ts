/**
 * POST /api/documents/generate
 *
 * The single entry point for document generation. Everything that used to be
 * spread across the browser (Gemini call), /api/enhance-with-ai (quota read)
 * and /api/save-generated-pdfs (upload + quota increment) happens here, behind
 * one authenticated, quota-enforced request.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { generateDocuments, type ContactProfile } from '../../../server/ai/generateLatex';
import { GeminiError } from '../../../server/ai/gemini';
import { LatexValidationError } from '../../../server/latex/sanitize';
import { LatexCompileError } from '../../../server/latex/compile';
import { admin, getAuth, getFirestore, FirebaseConfigError } from '../../../server/firebase/admin';
import { uploadDocuments } from '../../../server/firebase/storage';
import {
  QuotaExceededError,
  refundGeneration,
  reserveGeneration,
} from '../../../server/firebase/usage';

export const config = {
  api: {
    // Resume text plus a job description; generous but bounded.
    bodyParser: { sizeLimit: '2mb' },
    // Gemini plus two compiles; Texapi may pause for its rate-limit re-check.
    responseLimit: false,
  },
};

const MIN_RESUME_CHARS = 50;
const MAX_RESUME_CHARS = 60_000;
const MAX_JOB_DESCRIPTION_CHARS = 40_000;

interface GenerateBody {
  idToken?: string;
  resumeText?: string;
  jobDescription?: string;
  jobApplicationId?: string;
  documentId?: string;
  company_name?: string;
  position?: string;
  location?: string;
  profile?: ContactProfile;
}

/**
 * Identify the caller from a Firebase ID token. The previous flow trusted a
 * `userId` field straight from the request body, so any client could spend
 * another user's quota or write into their storage prefix.
 */
async function authenticate(idToken: string | undefined): Promise<string> {
  if (!idToken) throw new Error('unauthenticated');
  const decoded = await getAuth().verifyIdToken(idToken);
  return decoded.uid;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body: GenerateBody = req.body ?? {};
  const resumeText = (body.resumeText ?? '').trim();
  const jobDescription = (body.jobDescription ?? '').trim();

  let userId: string;
  try {
    userId = await authenticate(body.idToken);
  } catch {
    return res.status(401).json({ error: 'You must be signed in to generate documents.' });
  }

  if (resumeText.length < MIN_RESUME_CHARS) {
    return res.status(400).json({
      error: 'Your resume text is too short. Upload a resume or paste its contents.',
    });
  }
  if (resumeText.length > MAX_RESUME_CHARS || jobDescription.length > MAX_JOB_DESCRIPTION_CHARS) {
    return res.status(413).json({ error: 'That resume or job description is too large to process.' });
  }

  let reserved = false;
  try {
    await reserveGeneration(userId);
    reserved = true;

    const documents = await generateDocuments(
      resumeText,
      jobDescription,
      {
        company_name: body.company_name,
        position: body.position,
        location: body.location,
      },
      body.profile ?? {},
    );

    const stored = await uploadDocuments({
      userId,
      jobApplicationId: body.jobApplicationId,
      documentId: body.documentId,
      resumePdf: documents.resumePdf,
      resumeTex: documents.resumeTex,
      coverLetterPdf: documents.coverLetterPdf,
      coverLetterTex: documents.coverLetterTex,
    });

    if (body.jobApplicationId) {
      await persistToApplication(userId, body.jobApplicationId, stored);
    }

    return res.status(200).json({
      analysis: documents.analysis,
      // Source is returned so the UI can offer "Open in Overleaf" and
      // "Download .tex" without a second round trip.
      resumeTex: documents.resumeTex,
      coverLetterTex: documents.coverLetterTex,
      resumeUrl: stored.resumePdf.url,
      coverLetterUrl: stored.coverLetterPdf.url,
      resumePath: stored.resumePdf.path,
      coverLetterPath: stored.coverLetterPdf.path,
      resumeTexUrl: stored.resumeTex.url,
      coverLetterTexUrl: stored.coverLetterTex.url,
    });
  } catch (error) {
    if (reserved) await refundGeneration(userId);
    return respondToError(error, res);
  }
}

async function persistToApplication(
  userId: string,
  jobApplicationId: string,
  stored: Awaited<ReturnType<typeof uploadDocuments>>,
): Promise<void> {
  await getFirestore()
    .collection('users')
    .doc(userId)
    .collection('jobApplications')
    .doc(jobApplicationId)
    .set(
      {
        resume_url: stored.resumePdf.url,
        cover_letter_url: stored.coverLetterPdf.url,
        // Paths do not expire, unlike the signed URLs above. Keeping them is
        // what lets /api/documents/url revive a stale link.
        resume_path: stored.resumePdf.path,
        cover_letter_path: stored.coverLetterPdf.path,
        resume_tex_path: stored.resumeTex.path,
        cover_letter_tex_path: stored.coverLetterTex.path,
        generated_with: 'latex',
        generated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

/**
 * Map internal failures to user-facing messages. Details go to the server log;
 * users see something actionable rather than a LaTeX or API error.
 */
function respondToError(error: unknown, res: NextApiResponse) {
  if (error instanceof QuotaExceededError) {
    return res.status(429).json({
      error: `You have reached your daily limit of ${error.limit} generations. Please try again tomorrow.`,
      used: error.used,
      limit: error.limit,
    });
  }

  if (error instanceof FirebaseConfigError) {
    console.error('[documents/generate] Firebase misconfigured:', error.message);
    return res.status(500).json({ error: 'Server configuration error. Please contact support.' });
  }

  if (error instanceof LatexValidationError) {
    console.error('[documents/generate] LaTeX rejected:', error.message, error.detail);
    return res.status(502).json({
      error: 'The AI produced a document we could not format. Please try generating again.',
    });
  }

  if (error instanceof LatexCompileError) {
    console.error('[documents/generate] Compile failed:', error.message, error.status, error.log);
    return res.status(502).json({
      error: 'We could not render your documents. Please try generating again.',
    });
  }

  if (error instanceof GeminiError) {
    console.error('[documents/generate] Gemini failed:', error.message);
    return res.status(502).json({
      error: 'The AI service is unavailable right now. Please try again in a moment.',
    });
  }

  console.error('[documents/generate] Unexpected error:', error);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
}
