import type { NextApiRequest, NextApiResponse } from 'next';
import admin from 'firebase-admin';

/**
 * save-generated-pdfs API
 *
 * This handler generates PDFs from provided HTML, uploads them to Firebase Storage,
 * and updates a Firestore document. For serverless environments (Netlify) we try to
 * use chrome-aws-lambda + puppeteer-core so Chromium is provided by chrome-aws-lambda.
 *
 * Behavior:
 * - Lazily initialize Firebase Admin (only when handler runs).
 * - Attempt to use chrome-aws-lambda + puppeteer-core. If unavailable, fall back to
 *   the full puppeteer package (if installed).
 * - Always return JSON on errors to avoid HTML error pages that the client cannot parse.
 */

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
    // Initialize Firebase Admin SDK on first request
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

    // Try to load chrome-aws-lambda + puppeteer-core for Netlify/Serverless compatibility.
    let puppeteerLauncher: any = null;
    let usingChromeAwsLambda = false;
    let chromium: any = null;

    try {
      // Prefer chrome-aws-lambda + puppeteer-core when available
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      chromium = require('chrome-aws-lambda');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      puppeteerLauncher = require('puppeteer-core');
      usingChromeAwsLambda = true;
      console.log('[save-generated-pdfs] Using chrome-aws-lambda + puppeteer-core');
    } catch (e) {
      console.log(
        '[save-generated-pdfs] chrome-aws-lambda/puppeteer-core not available, trying full puppeteer',
        (e as any)?.message || e
      );
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = await import('puppeteer');
        puppeteerLauncher = (mod && (mod as any).default) ? (mod as any).default : mod;
        console.log('[save-generated-pdfs] Using bundled puppeteer');
      } catch (impErr) {
        console.error('[save-generated-pdfs] puppeteer import failed:', impErr);
        return res.status(500).json({ error: 'Server configuration error: puppeteer not available' });
      }
    }

    console.log('🚀 Launching Puppeteer (or puppeteer-core)...');

    // Prepare launch options depending on environment
    let launchOptions: any;
    if (usingChromeAwsLambda && chromium) {
      // chrome-aws-lambda exposes args, defaultViewport, executablePath (async) and headless flag
      const exePath = await (typeof chromium.executablePath === 'function' ? chromium.executablePath() : chromium.executablePath);
      launchOptions = {
        args: (chromium.args || []).concat(['--no-sandbox', '--disable-setuid-sandbox', '--single-process']),
        defaultViewport: chromium.defaultViewport || { width: 1200, height: 800 },
        executablePath: exePath || undefined,
        headless: chromium.headless,
      };
    } else {
      launchOptions = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      };
    }

    const browser = await puppeteerLauncher.launch(launchOptions);
    const page = await browser.newPage();
    console.log('🧾 Puppeteer ready. Generating PDFs...');

    const generatePdfBuffer = async (html: string) => {
      await page.setContent(html, { waitUntil: 'load', timeout: 20000 });
      return await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
        preferCSSPageSize: false,
        scale: 1,
        timeout: 45000,
      });
    };

    try {
      const resumeBuffer = Buffer.from(await generatePdfBuffer(resumeHtml));
      const coverLetterBuffer = Buffer.from(await generatePdfBuffer(coverLetterHtml));
      console.log('📄 PDFs generated successfully');

      const uploadAndGetUrl = async (buffer: Buffer, filename: string) => {
        const file = bucket.file(filename);
        await file.save(buffer, { contentType: 'application/pdf' });
        try {
          await file.makePublic();
          return file.publicUrl();
        } catch (e) {
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

      await page.close();
      await browser.close();

      return res.status(200).json({
        message: 'PDFs uploaded and Firestore updated',
        resumeUrl,
        coverLetterUrl,
      });
    } catch (pdfErr) {
      console.error('[save-generated-pdfs] PDF generation/upload error:', pdfErr);
      try {
        if (page && !page.isClosed()) await page.close();
      } catch (_) {}
      try {
        if (browser) await browser.close();
      } catch (_) {}
      return res.status(500).json({ error: (pdfErr as any)?.message || 'Failed to generate or upload PDFs' });
    }
  } catch (error: any) {
    console.error('❌ [save-generated-pdfs] Critical Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error?.message || 'Internal Server Error' });
    }
    return;
  }
}