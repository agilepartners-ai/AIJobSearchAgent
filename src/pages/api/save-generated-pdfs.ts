import type { NextApiRequest, NextApiResponse } from 'next';
import admin from 'firebase-admin';

// Support frontend-generated PDF blobs (base64/data URLs). The frontend should send PDFs directly.

// Handler lazily initializes Firebase Admin and wkhtmltopdf to avoid module-load failures
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('\n--- 📩 Incoming request to /api/save-generated-pdfs ---');
  console.log('➡️ Method:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are allowed' });
  }

  try {
    const {
      userId,
      jobApplicationId,
      resumePdfBase64,
      coverLetterPdfBase64,
      // Optional: server-fetchable URLs pointing to generated PDFs (http(s) accessible)
      resumePdfUrl,
      coverLetterPdfUrl,
    } = req.body || {};

    console.log('📦 Request body keys:', Object.keys(req.body || {}));
    console.log('📦 Request payload info:', {
      hasUserId: !!userId,
      hasJobApplicationId: !!jobApplicationId,
      resumeSize: resumePdfBase64?.length || 0,
      coverLetterSize: coverLetterPdfBase64?.length || 0,
    });

    if (!jobApplicationId) {
      console.warn('❌ Missing required jobApplicationId');
      return res.status(400).json({ error: 'Missing jobApplicationId' });
    }

    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn('❌ Missing required userId');
      return res.status(400).json({ error: 'Missing userId' });
    }
    // Initialize Firebase Admin SDK on first request (avoid module-load failures)
    if (!admin.apps.length) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
      const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

      if (!projectId || !clientEmail || !privateKeyRaw || !storageBucket) {
        console.error('[save-generated-pdfs] Missing Firebase environment variables');
        return res.status(500).json({ error: 'Server configuration error: missing Firebase credentials' });
      }

      try {
        const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          storageBucket,
        });
        console.log('[✅] Firebase Admin initialized');
      } catch (initErr) {
        console.error('[❌] Firebase initialization failed:', initErr);
        return res.status(500).json({ error: 'Failed to initialize Firebase Admin' });
      }
    }

    const db = admin.firestore();
    const bucket = admin.storage().bucket();

    console.log('🚀 Processing incoming payload (PDF blobs or HTML)');

    const extractBase64 = (input: unknown): string | null => {
      if (typeof input !== 'string') {
        console.warn('[extractBase64] Input is not a string:', typeof input);
        return null;
      }
      
      // Handle data URL format: data:application/pdf;base64,<base64>
      const match = input.match(/^data:application\/(pdf|octet-stream);base64,(.*)$/i);
      if (match && match[2]) {
        console.log('[extractBase64] Successfully extracted base64 from data URL');
        return match[2];
      }
      
      // Try plain base64 if no data URL format
      const cleanBase64 = input.replace(/\s+/g, '');
      if (cleanBase64 && cleanBase64.length > 0) {
        console.log('[extractBase64] Using plain base64 string');
        return cleanBase64;
      }
      
      console.warn('[extractBase64] Could not extract valid base64 from input');
      return null;
    };

    const decodePdf = (b64: string): Buffer | null => {
      try {
        if (!b64 || b64.length === 0) {
          console.warn('[decodePdf] Empty base64 string provided');
          return null;
        }
        
        const buf = Buffer.from(b64, 'base64');
        
        if (buf.length === 0) {
          console.warn('[decodePdf] Buffer is empty after decoding');
          return null;
        }
        
        // Check for PDF magic bytes
        const pdfSignature = buf.slice(0, 4).toString();
        if (!pdfSignature.startsWith('%PDF')) {
          console.warn('[decodePdf] Invalid PDF signature. First 20 bytes:', buf.slice(0, 20).toString('hex'));
          return null;
        }
        
        console.log('[decodePdf] PDF decoded successfully, size:', buf.length);
        return buf;
      } catch (e) {
        console.error('[decodePdf] Error decoding base64:', e);
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

    console.log('[save-generated-pdfs] Processing PDF data...');
    
    if (resumeB64) {
      console.log('[save-generated-pdfs] Decoding resume PDF...');
      resumeBuffer = decodePdf(resumeB64);
      if (!resumeBuffer) {
        console.error('[save-generated-pdfs] Resume PDF is invalid or corrupted');
      }
    } else {
      console.warn('[save-generated-pdfs] No resume base64 data provided');
    }
    
    if (coverB64) {
      console.log('[save-generated-pdfs] Decoding cover letter PDF...');
      coverLetterBuffer = decodePdf(coverB64);
      if (!coverLetterBuffer) {
        console.error('[save-generated-pdfs] Cover letter PDF is invalid or corrupted');
      }
    } else {
      console.warn('[save-generated-pdfs] No cover letter base64 data provided');
    }

    // Try fetching from URLs if buffers are not provided by base64
    if (!resumeBuffer && resumePdfUrl) {
      console.log('[save-generated-pdfs] Attempting to fetch resume from URL');
      resumeBuffer = await fetchPdfFromUrl(resumePdfUrl);
    }
    if (!coverLetterBuffer && coverLetterPdfUrl) {
      console.log('[save-generated-pdfs] Attempting to fetch cover letter from URL');
      coverLetterBuffer = await fetchPdfFromUrl(coverLetterPdfUrl);
    }

    if (!resumeBuffer) {
      console.error('[save-generated-pdfs] Missing valid resume PDF - base64 extraction failed or no data provided');
      return res.status(400).json({ 
        error: 'Invalid or missing resume PDF. Ensure the PDF was generated correctly.',
        detail: 'Resume PDF extraction failed'
      });
    }
    
    if (!coverLetterBuffer) {
      console.error('[save-generated-pdfs] Missing valid cover letter PDF - base64 extraction failed or no data provided');
      return res.status(400).json({ 
        error: 'Invalid or missing cover letter PDF. Ensure the PDF was generated correctly.',
        detail: 'Cover letter PDF extraction failed'
      });
    }

    const uploadAndGetUrl = async (buffer: Buffer, filename: string) => {
      const file = bucket.file(filename);

      try {
        // 🔁 ALWAYS overwrite the file
        await file.save(buffer, {
          contentType: 'application/pdf',
          resumable: false,
          metadata: {
            cacheControl: 'no-store', // prevent CDN caching old versions
          },
        });

        console.info('[save-generated-pdfs] File overwritten in storage:', filename);

        // Generate signed URL (30 days)
        // v4 signed URLs have a hard max of 7 days
        const expirationDate = new Date(Date.now() + 6.5 * 24 * 60 * 60 * 1000); // 6.5 days (safe margin)

        const [signedUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: expirationDate,
        });
        return signedUrl;


        return signedUrl;
      } catch (e) {
        console.error('[save-generated-pdfs] uploadAndGetUrl failed for', filename, e);
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