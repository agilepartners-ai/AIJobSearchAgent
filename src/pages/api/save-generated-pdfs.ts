import type { NextApiRequest, NextApiResponse } from 'next';
import admin from 'firebase-admin';

// Support frontend-generated PDF blobs (base64/data URLs). The frontend should send PDFs directly.

// Helper to initialize Firebase Admin (singleton pattern)
const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    console.log('[Firebase Admin] Already initialized, reusing existing app');
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKeyRaw || !storageBucket) {
    throw new Error('Missing Firebase environment variables');
  }

  // Handle various formats of private key (with escaped newlines, actual newlines, or JSON-escaped)
  let privateKey = privateKeyRaw;
  
  // If the key is JSON-stringified (wrapped in quotes), parse it first
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    try {
      privateKey = JSON.parse(privateKey);
    } catch {
      // Not JSON, continue with raw value
    }
  }
  
  // Replace escaped newlines with actual newlines
  privateKey = privateKey
    .replace(/\\n/g, '\n')
    .replace(/\\\\n/g, '\n');
  
  // Ensure the key has proper BEGIN/END markers
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Invalid private key format: missing BEGIN marker');
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
    console.log('[✅] Firebase Admin initialized successfully');
    return app;
  } catch (error) {
    console.error('[❌] Firebase initialization error:', error);
    throw error;
  }
};

// Handler lazily initializes Firebase Admin and wkhtmltopdf to avoid module-load failures
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('\n--- 📩 Incoming request to /api/save-generated-pdfs ---');
  console.log('➡️ Method:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are allowed' });
  }

  const {
    userId,
    jobApplicationId,
    resumePdfBase64,
    coverLetterPdfBase64,
    // Optional: server-fetchable URLs pointing to generated PDFs (http(s) accessible)
    resumePdfUrl,
    coverLetterPdfUrl,
  } = req.body || {};

  console.log('📦 Request body:', {
    jobApplicationId,
    resumePdfProvided: typeof resumePdfBase64 === 'string',
    coverLetterPdfProvided: typeof coverLetterPdfBase64 === 'string',
  });

  if (!jobApplicationId) {
    console.warn('❌ Missing required jobApplicationId');
    return res.status(400).json({ error: 'Missing jobApplicationId' });
  }

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    console.warn('❌ Missing required userId');
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    // Initialize Firebase Admin SDK using the helper function
    try {
      initializeFirebaseAdmin();
    } catch (initErr) {
      console.error('[save-generated-pdfs] Firebase initialization failed:', initErr);
      const errorMessage = initErr instanceof Error ? initErr.message : String(initErr);
      return res.status(500).json({ 
        error: 'Server configuration error: Failed to initialize Firebase Admin', 
        details: errorMessage 
      });
    }

    const db = admin.firestore();
    const bucket = admin.storage().bucket();

    console.log('🚀 Processing incoming payload (PDF blobs or HTML)');

    const extractBase64 = (input: unknown): string | null => {
      if (typeof input !== 'string') return null;
      const match = input.match(/^data:application\/(pdf);base64,(.*)$/i);
      if (match) return match[2];
      return input.replace(/\s+/g, '');
    };

    const decodePdf = (b64: string): Buffer | null => {
      try {
        const buf = Buffer.from(b64, 'base64');
        if (buf.slice(0, 5).toString() !== '%PDF-') return null;
        return buf;
      } catch {
        return null;
      }
    };

    const resumeB64 = extractBase64(resumePdfBase64);
    const coverB64 = extractBase64(coverLetterPdfBase64);
    // If base64 payloads are provided, prefer those. Otherwise, if HTTP(S) URLs
    // are provided (e.g. frontend generated and uploaded somewhere accessible),
    // we will fetch and validate them server-side.
    const fetchPdfFromUrl = async (url: string): Promise<Buffer | null> => {
      try {
        if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null;
        const r = await fetch(url);
        if (!r.ok) return null;
        const ab = await r.arrayBuffer();
        const buf = Buffer.from(ab);
        if (buf.slice(0, 5).toString() !== '%PDF-') return null;
        return buf;
      } catch (e) {
        console.warn('[save-generated-pdfs] fetchPdfFromUrl error for', url, e);
        return null;
      }
    };

    let resumeBuffer: Buffer | null = null;
    let coverLetterBuffer: Buffer | null = null;

    if (resumeB64) resumeBuffer = decodePdf(resumeB64);
    if (coverB64) coverLetterBuffer = decodePdf(coverB64);

    // Try fetching from URLs if buffers are not provided by base64
    if (!resumeBuffer && resumePdfUrl) {
      console.log('[save-generated-pdfs] Attempting to fetch resume from URL');
      resumeBuffer = await fetchPdfFromUrl(resumePdfUrl);
    }
    if (!coverLetterBuffer && coverLetterPdfUrl) {
      console.log('[save-generated-pdfs] Attempting to fetch cover letter from URL');
      coverLetterBuffer = await fetchPdfFromUrl(coverLetterPdfUrl);
    }

    if (!resumeBuffer || !coverLetterBuffer) {
      console.warn('[save-generated-pdfs] Missing or invalid PDF data (base64 or fetch failed)');
      return res.status(400).json({ error: 'Missing or invalid PDF data provided. Send base64 PDFs or server-accessible PDF URLs.' });
    }

    const uploadAndGetUrl = async (buffer: Buffer, filename: string) => {
      const file = bucket.file(filename);
      try {
        // If file already exists in the bucket, avoid overwriting and reuse it
        const [exists] = await file.exists();
        if (exists) {
          console.info('[save-generated-pdfs] File already exists in storage, reusing:', filename);
        } else {
          await file.save(buffer, { contentType: 'application/pdf' });
          console.info('[save-generated-pdfs] File saved to storage:', filename);
        }

        // Return a signed URL (read) valid for 7 days
        try {
          const expires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
          const [signedUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires,
          });
          return signedUrl;
        } catch (e) {
          console.warn('[save-generated-pdfs] getSignedUrl failed, returning gs:// path', e);
          return `gs://${bucket.name}/${filename}`;
        }
      } catch (e) {
        console.error('[save-generated-pdfs] uploadAndGetUrl error for', filename, e);
        throw e;
      }
    };

    const resumeFilename = `ApplicationDocuments/${jobApplicationId}_resume.pdf`;
    const coverLetterFilename = `ApplicationDocuments/${jobApplicationId}_coverletter.pdf`;

    if (!resumeBuffer || !coverLetterBuffer) {
      console.error('[save-generated-pdfs] Internal error: PDF buffers are null');
      return res.status(500).json({ error: 'Server error: missing PDF buffers' });
    }

    console.log('📤 Uploading resume PDF...');
    const resumeUrl = await uploadAndGetUrl(resumeBuffer, resumeFilename);
    console.log('✅ Resume uploaded:', resumeUrl);

    console.log('📤 Uploading cover letter PDF...');
    const coverLetterUrl = await uploadAndGetUrl(coverLetterBuffer, coverLetterFilename);
    console.log('✅ Cover letter uploaded:', coverLetterUrl);

    console.log('📝 Updating Firestore document with metadata...');
    try {
      const docRef = db
        .collection('users')
        .doc(userId)
        .collection('jobApplications')
        .doc(jobApplicationId);

      const snapshot = await docRef.get();

      const updatePayload: Record<string, unknown> = {
        resume_url: resumeUrl,
        cover_letter_url: coverLetterUrl,
        resume_pdf_size_bytes: resumeBuffer.length,
        cover_letter_pdf_size_bytes: coverLetterBuffer.length,
        generated_with: 'react-pdf',
        generated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      // If document exists and URLs already match, skip updating to avoid churn
      if (snapshot.exists) {
        const data = snapshot.data() || {};
        const sameResume = data.resume_url === resumeUrl;
        const sameCover = data.cover_letter_url === coverLetterUrl;
        if (sameResume && sameCover) {
          console.info('[save-generated-pdfs] Firestore already has identical URLs; skipping update');
        } else {
          await docRef.update(updatePayload);
          console.log('✅ Firestore update successful (updated existing doc)');
        }
      } else {
        // Create the document with merge to avoid overwriting other fields
        await docRef.set(updatePayload, { merge: true });
        console.log('✅ Firestore update successful (created new doc)');
      }
    } catch (e) {
      console.error('[save-generated-pdfs] Firestore update failed:', e);
      return res.status(500).json({ error: 'Failed to update Firestore with PDF URLs' });
    }

    return res.status(200).json({
      message: 'PDFs uploaded and Firestore updated',
      resumeUrl,
      coverLetterUrl,
      resume_size: resumeBuffer.length,
      cover_letter_size: coverLetterBuffer.length,
    });
  } catch (error: unknown) {
    console.error('❌ [save-generated-pdfs] Critical Error:', error);
    // Ensure we always return JSON (avoid HTML error pages)
    if (!res.headersSent) {
      let message = 'Internal Server Error';
      if (error && typeof error === 'object' && 'message' in error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message = String((error as any).message) || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return res.status(500).json({ error: message });
    }
    return;
  }
}

// Allow larger payloads for base64 PDF uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};