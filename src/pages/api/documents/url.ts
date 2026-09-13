/**
 * POST /api/documents/url
 *
 * Mints a fresh signed URL for a stored document.
 *
 * Signed URLs max out at 7 days, so the URLs written onto a job application go
 * stale. Before this endpoint existed, a resume generated more than a week ago
 * simply stopped opening from the Saved Resumes page.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth, getFirestore, FirebaseConfigError } from '../../../server/firebase/admin';
import { objectExists, signUrlForPath } from '../../../server/firebase/storage';

const ALLOWED_PREFIXES = ['ApplicationDocuments/', 'UserDocuments/'];

/**
 * The ApplicationDocuments/ prefix is keyed by job-application id, not by user,
 * so the path alone proves nothing about ownership. Confirm the application
 * actually sits under this user before handing out a URL.
 */
async function ownsApplicationDocument(userId: string, path: string): Promise<boolean> {
  const filename = path.slice('ApplicationDocuments/'.length);
  const applicationId = filename.replace(/_(resume|coverletter)\.(pdf|tex)$/, '');
  if (!applicationId || applicationId === filename) return false;

  const doc = await getFirestore()
    .collection('users')
    .doc(userId)
    .collection('jobApplications')
    .doc(applicationId)
    .get();

  return doc.exists;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { idToken, path } = req.body ?? {};

  let userId: string;
  try {
    if (!idToken) throw new Error('unauthenticated');
    userId = (await getAuth().verifyIdToken(idToken)).uid;
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      console.error('[documents/url] Firebase misconfigured:', error.message);
      return res.status(500).json({ error: 'Server configuration error.' });
    }
    return res.status(401).json({ error: 'You must be signed in.' });
  }

  if (typeof path !== 'string' || !path) {
    return res.status(400).json({ error: 'No document path provided.' });
  }

  // Without this, `path` is an arbitrary object name and any signed-in user
  // could mint a URL for any file in the bucket.
  if (path.includes('..') || !ALLOWED_PREFIXES.some((p) => path.startsWith(p))) {
    return res.status(400).json({ error: 'Invalid document path.' });
  }
  if (path.startsWith('UserDocuments/') && !path.startsWith(`UserDocuments/${userId}/`)) {
    return res.status(403).json({ error: 'That document does not belong to you.' });
  }

  try {
    if (path.startsWith('ApplicationDocuments/') && !(await ownsApplicationDocument(userId, path))) {
      return res.status(403).json({ error: 'That document does not belong to you.' });
    }

    if (!(await objectExists(path))) {
      return res.status(404).json({ error: 'That document no longer exists.' });
    }
    return res.status(200).json({ url: await signUrlForPath(path) });
  } catch (error) {
    console.error('[documents/url] Failed to sign URL:', error);
    return res.status(500).json({ error: 'Could not open that document.' });
  }
}
