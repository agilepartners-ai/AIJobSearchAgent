import type { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';
import admin from 'firebase-admin';

// 🔐 Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  try {
    console.log('[🔥] Initializing Firebase Admin SDK...');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    console.log('[✅] Firebase Admin initialized');
  } catch (initError) {
    console.error('[❌] Firebase initialization failed:', initError);
  }
}

const db = admin.firestore();
const bucket = admin.storage().bucket();
bucket.getFiles().then(files => {
  console.log('✅ Storage bucket is accessible. Number of files:', files[0].length);
}).catch(err => {
  console.error('❌ Failed to access bucket:', err);
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('\n--- 📩 Incoming request to /api/save-generated-pdfs ---');
  console.log('➡️ Method:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are allowed' });
  }

  const { userId, jobApplicationId, resumeHtml, coverLetterHtml } = req.body;

  console.log('📦 Request body:', {
    jobApplicationId,
    resumeHtmlSnippet: resumeHtml?.slice(0, 100),
    coverLetterHtmlSnippet: coverLetterHtml?.slice(0, 100),
  });

  if (!jobApplicationId || !resumeHtml || !coverLetterHtml) {
    console.warn('❌ Missing required fields!');
    return res.status(400).json({ error: 'Missing jobApplicationId, resumeHtml, or coverLetterHtml' });
  }

  try {
    // 🧨 Launch Puppeteer
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
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        },
        preferCSSPageSize: false,
        scale: 1,
        timeout: 45000
      });
    };

    const resumeBuffer = Buffer.from(await generatePdfBuffer(resumeHtml));
    const coverLetterBuffer = Buffer.from(await generatePdfBuffer(coverLetterHtml));
    await browser.close();
    console.log('📄 PDFs generated successfully');

    // 📤 Upload PDFs to Firebase Storage
    const uploadAndGetUrl = async (buffer: Buffer, filename: string) => {
      const file = bucket.file(filename);
      await file.save(buffer, { contentType: 'application/pdf' });
      await file.makePublic(); // Optional: remove if private URLs preferred
      return file.publicUrl();
    };

    const resumeFilename = `ApplicationDocuments/${jobApplicationId}_resume.pdf`;
    const coverLetterFilename = `ApplicationDocuments/${jobApplicationId}_coverletter.pdf`;

    console.log('📤 Uploading resume PDF...');
    const resumeUrl = await uploadAndGetUrl(resumeBuffer, resumeFilename);
    console.log('✅ Resume uploaded:', resumeUrl);

    console.log('📤 Uploading cover letter PDF...');
    const coverLetterUrl = await uploadAndGetUrl(coverLetterBuffer, coverLetterFilename);
    console.log('✅ Cover letter uploaded:', coverLetterUrl);

    // 🧠 Update Firestore under users/{userId}/jobApplications/{jobApplicationId}
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
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}