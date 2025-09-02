import type { NextApiRequest, NextApiResponse } from 'next';
import admin from 'firebase-admin';
import { execSync } from 'child_process';
import { join } from 'path';
import fs from 'fs';

/**
 * save-generated-pdfs API - robust launch sequence
 *
 * Behavior:
 * - Lazy Firebase Admin init.
 * - Prefer bundled puppeteer, fall back to chrome-aws-lambda + puppeteer-core.
 * - Attempt launch first; if launch fails due to missing Chromium and NODE_ENV !== 'production',
 *   perform a programmatic install via @puppeteer/browsers, locate the binary, and retry.
 * - In production or if retries fail, return actionable JSON advice.
 * - Use a fresh page per PDF and networkidle0 + short delay before printing to reduce Target closed errors.
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
    // Firebase Admin lazy init
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

    // Determine puppeteer library and initial launchOptions
    let puppeteerLib: any = null;
    let usingBundled = false;
    let usingChromeAws = false;
    let launchOptions: any = { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] };
    const envExePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || process.env.CHROMIUM_PATH;
    if (envExePath) launchOptions.executablePath = envExePath;

    // Try bundled puppeteer first
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      puppeteerLib = require('puppeteer');
      usingBundled = true;
      console.log('[save-generated-pdfs] Using bundled puppeteer');
    } catch (e) {
      // fallback to chrome-aws-lambda + puppeteer-core
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const chromeAws = require('chrome-aws-lambda');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        puppeteerLib = require('puppeteer-core');
        usingChromeAws = true;
        console.log('[save-generated-pdfs] Using chrome-aws-lambda + puppeteer-core');
        // merge recommended chrome-aws-lambda args
        launchOptions.args = (chromeAws.args || []).concat(launchOptions.args || []);
        launchOptions.defaultViewport = chromeAws.defaultViewport || { width: 1200, height: 800 };
        launchOptions.headless = chromeAws.headless ?? true;
        // try to get executablePath from chrome-aws-lambda (may be async)
        try {
          const maybe = typeof chromeAws.executablePath === 'function' ? chromeAws.executablePath() : chromeAws.executablePath;
          if (maybe && typeof (maybe as any).then === 'function') {
            const awaited = await maybe;
            if (awaited) launchOptions.executablePath = String(awaited);
          } else if (maybe) {
            launchOptions.executablePath = String(maybe);
          }
        } catch (_) {
          // ignore — we'll handle launch failure below with programmatic install in dev
        }
      } catch (e2) {
        console.warn('[save-generated-pdfs] No puppeteer available:', e2);
      }
    }

    // If using bundled puppeteer, try to obtain its executable path (some installs provide it)
    if (usingBundled && !launchOptions.executablePath && puppeteerLib) {
      try {
        const maybe = typeof puppeteerLib.executablePath === 'function' ? puppeteerLib.executablePath() : puppeteerLib.executablePath;
        if (maybe && typeof (maybe as any).then === 'function') {
          const awaited = await maybe;
          if (awaited) launchOptions.executablePath = String(awaited);
        } else if (maybe) {
          launchOptions.executablePath = String(maybe);
        }
      } catch (e) {
        console.warn('[save-generated-pdfs] puppeteer.executablePath() failed:', e);
      }
    }

    // Helper: find chrome binary under candidate dirs
    const findChromeBinary = (startDirs: string[]) => {
      for (const start of startDirs) {
        try {
          if (!fs.existsSync(start)) continue;
          const stack = [start];
          while (stack.length) {
            const cur = stack.pop();
            if (!cur) continue;
            const entries = fs.readdirSync(cur, { withFileTypes: true });
            for (const ent of entries) {
              const p = join(cur, ent.name);
              if (ent.isFile()) {
                const name = ent.name.toLowerCase();
                if (name === 'chrome.exe' || name === 'chrome' || name === 'chromium' || name === 'chromium.exe') {
                  return p;
                }
              } else if (ent.isDirectory()) {
                stack.push(p);
              }
            }
          }
        } catch (err) {
          console.warn('[save-generated-pdfs] findChromeBinary error:', err);
        }
      }
      return null;
    };

    // Try to launch; if missing Chromium and in dev, attempt programmatic install and retry.
    let browser: any = null;
    const tryLaunch = async () => {
      try {
        browser = await puppeteerLib.launch(launchOptions);
        return browser;
      } catch (launchErr: any) {
        const msg = String((launchErr && launchErr.message) || launchErr);
        console.error('[save-generated-pdfs] Launch failed:', msg);

        const indicatesMissing = msg.includes('Could not find Chrome') ||
          msg.includes('Could not find any Chromium') ||
          msg.includes('executablePath') ||
          msg.includes('Browser was not found') ||
          msg.includes('No usable chromium') ||
          msg.includes('Cannot find Chrome');

        if (indicatesMissing && process.env.NODE_ENV !== 'production') {
          // Attempt programmatic install into .cache/puppeteer
          try {
            const cacheDir = process.env.PUPPETEER_CACHE_DIR || join(process.cwd(), '.cache', 'puppeteer');
            console.log('[save-generated-pdfs] Attempting programmatic install into', cacheDir);
            execSync(`npx --yes @puppeteer/browsers install chrome@stable --cache-dir="${cacheDir}"`, { stdio: 'inherit' });

            // try to locate installed binary
            const candidateDirs = [cacheDir, join(process.cwd(), 'chrome'), join(process.cwd(), 'chrome', 'win64')];
            const found = findChromeBinary(candidateDirs);
            if (found) {
              console.log('[save-generated-pdfs] Found browser executable after install:', found);
              launchOptions.executablePath = found;
              process.env.PUPPETEER_CACHE_DIR = cacheDir;
            } else {
              console.warn('[save-generated-pdfs] Programmatic install completed but binary not found in expected locations.');
            }

            // retry launch
            try {
              browser = await puppeteerLib.launch(launchOptions);
              return browser;
            } catch (retryErr: any) {
              console.error('[save-generated-pdfs] Retry launch failed:', (retryErr && retryErr.message) || retryErr);
              return null;
            }
          } catch (installErr) {
            console.error('[save-generated-pdfs] Programmatic install failed:', installErr);
            return null;
          }
        }

        return null;
      }
    };

    // In development, attempt a programmatic install (even if launchOptions already set) to ensure consistent binary.
    if (process.env.NODE_ENV !== 'production') {
      try {
        const cacheDir = process.env.PUPPETEER_CACHE_DIR || join(process.cwd(), '.cache', 'puppeteer');
        console.log('[save-generated-pdfs] Dev-mode: ensuring browser installed into', cacheDir);
        execSync(`npx --yes @puppeteer/browsers install chrome@stable --cache-dir="${cacheDir}"`, { stdio: 'inherit', timeout: 10 * 60 * 1000 });
        process.env.PUPPETEER_CACHE_DIR = cacheDir;
        const candidateDirs = [cacheDir, join(process.cwd(), 'chrome'), join(process.cwd(), 'chrome', 'win64')];
        const found = findChromeBinary(candidateDirs);
        if (found) {
          console.log('[save-generated-pdfs] Dev-mode: found browser executable at', found);
          launchOptions.executablePath = found;
        } else {
          console.warn('[save-generated-pdfs] Dev-mode: installer did not produce a binary in expected locations.');
        }
      } catch (devInstallErr) {
        console.warn('[save-generated-pdfs] Dev-mode programmatic install failed:', devInstallErr);
      }
    }

    // Validate puppeteerLib exists before attempting launch
    if (!puppeteerLib) {
      const advice = [
        'No puppeteer library found (neither puppeteer nor puppeteer-core present).',
        'Install puppeteer or provide a runnable browser binary.',
        'CI: npx --yes @puppeteer/browsers install chrome@stable --cache-dir=./.cache/puppeteer',
      ].join(' ');
      console.error('[save-generated-pdfs] ' + advice);
      return res.status(500).json({ error: 'Could not start headless browser', details: advice });
    }

    // Attempt launch (and retry with programmatic install in dev if needed)
    await tryLaunch();

    if (!browser) {
      const advice = [
        'Chromium not available in this environment.',
        'Install during CI/build: npx --yes @puppeteer/browsers install chrome@stable --cache-dir=./.cache/puppeteer',
        'Or set PUPPETEER_EXECUTABLE_PATH to a system Chrome binary.',
        'Or run PDF generation in a container with Chrome installed.',
      ].join(' ');
      console.error('[save-generated-pdfs] ' + advice);
      return res.status(500).json({ error: 'Could not start headless browser', details: advice });
    }

    // Helper to make a PDF with a fresh page
    const makePdf = async (html: string) => {
      const page = await browser.newPage();
      try {
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
        // allow fonts/assets to settle
        await new Promise((r) => setTimeout(r, 300));
        const buffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
          preferCSSPageSize: false,
          scale: 1,
          timeout: 60000,
        });
        return buffer;
      } finally {
        try {
          if (page && !page.isClosed()) await page.close();
        } catch (_) {}
      }
    };

    try {
      const resumeBuffer = await makePdf(resumeHtml);
      const coverLetterBuffer = await makePdf(coverLetterHtml);
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

      try {
        if (browser) await browser.close();
      } catch (_) {}

      return res.status(200).json({
        message: 'PDFs uploaded and Firestore updated',
        resumeUrl,
        coverLetterUrl,
      });
    } catch (pdfErr) {
      console.error('[save-generated-pdfs] PDF generation/upload error:', pdfErr);
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