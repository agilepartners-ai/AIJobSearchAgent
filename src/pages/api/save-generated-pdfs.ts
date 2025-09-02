import type { NextApiRequest, NextApiResponse } from 'next';
import admin from 'firebase-admin';

// Handler lazily initializes Firebase Admin and Puppeteer to avoid module-load failures
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('\n--- 📩 Incoming request to /api/save-generated-pdfs ---');
  console.log('➡️ Method:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are allowed' });
  }

  const { userId, jobApplicationId, resumeHtml, coverLetterHtml } = req.body || {};

  console.log('📦 Request body:', {
    jobApplicationId,
    resumeHtmlSnippet: typeof resumeHtml === 'string' ? resumeHtml.slice(0, 100) : undefined,
    coverLetterHtmlSnippet: typeof coverLetterHtml === 'string' ? coverLetterHtml.slice(0, 100) : undefined,
  });

  if (!jobApplicationId || !resumeHtml || !coverLetterHtml) {
    console.warn('❌ Missing required fields!');
    return res.status(400).json({ error: 'Missing jobApplicationId, resumeHtml, or coverLetterHtml' });
  }

  try {
    // Initialize Firebase Admin SDK on first request (avoid module-load failures)
    if (!admin.apps.length) {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
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

    // Lazily import puppeteer to avoid module load errors (and to make failing import return JSON)
    let puppeteer: any;
    try {
      const mod = await import('puppeteer');
      puppeteer = (mod && (mod as any).default) ? (mod as any).default : mod;
    } catch (impErr) {
      console.error('[save-generated-pdfs] Puppeteer import failed:', impErr);
      return res.status(500).json({ error: 'Server configuration error: puppeteer not available' });
    }

    console.log('🚀 Launching Puppeteer...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    console.log('🧾 Puppeteer ready. Generating PDFs...');

    const generatePdfBuffer = async (html: string) => {
      await page.setContent(html, { waitUntil: 'load', timeout: 10000 });
      return await page.pdf({
        format: 'A4',
        printBackground: true,
        waitForFonts: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
        preferCSSPageSize: false,
        scale: 1,
        timeout: 45000,
      });
    };

    const resumeBuffer = Buffer.from(await generatePdfBuffer(resumeHtml));
    const coverLetterBuffer = Buffer.from(await generatePdfBuffer(coverLetterHtml));
    await browser.close();
    console.log('📄 PDFs generated successfully');

    const uploadAndGetUrl = async (buffer: Buffer, filename: string) => {
      const file = bucket.file(filename);
      await file.save(buffer, { contentType: 'application/pdf' });
      // Make public if bucket allows it; if this fails we still want to return signed URL or file path
      try {
        await file.makePublic();
        return file.publicUrl();
      } catch (e) {
        // Fallback: return gs:// path
        console.warn('[save-generated-pdfs] makePublic failed, returning gs:// path', e);
        return `gs://${bucket.name}/${filename}`;
      }
    };

    const resumeFilename = `ApplicationDocuments/${jobApplicationId}_resume.pdf`;
    const coverLetterFilename = `ApplicationDocuments/${jobApplicationId}_coverletter.pdf`;

    console.log('📤 Uploading resume PDF...');
    const resumeUrl = await uploadAndGetUrl(resumeBuffer, resumeFilename);
    console.log('✅ Resume uploaded:', resumeUrl);

    console.log('📤 Uploading cover letter PDF...');
    const coverLetterUrl = await uploadAndGetUrl(coverLetterBuffer, coverLetterFilename);
    console.log('✅ Cover letter uploaded:', coverLetterUrl);

    console.log('📝 Updating Firestore document...');
    await db
      .collection('users')
      .doc(userId)
      .collection('jobApplications')
      .doc(jobApplicationId)
      .update({
        resume_url: resumeUrl,
        cover_letter_url: coverLetterUrl,
      });

    console.log('✅ Firestore update successful');

    return res.status(200).json({
      message: 'PDFs uploaded and Firestore updated',
      resumeUrl,
      coverLetterUrl,
    });
  } catch (error: any) {
    console.error('❌ [save-generated-pdfs] Critical Error:', error);
    // Ensure we always return JSON (avoid HTML error pages)
    if (!res.headersSent) {
      return res.status(500).json({ error: error?.message || 'Internal Server Error' });
    }
    return;
  }
}