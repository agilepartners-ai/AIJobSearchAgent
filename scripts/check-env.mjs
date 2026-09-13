#!/usr/bin/env node
/**
 * Verifies local configuration by actually exercising every credential.
 *
 *     npm run check:env
 *
 * Presence checks alone are not worth much — a typo'd Gemini key and a missing
 * one look identical until a user hits Generate. This makes a real (tiny) call
 * against each service instead.
 *
 * Reads .env.local then .env, mirroring Next.js precedence. Prints no secret
 * values, only whether each one works.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// Minimal .env parser. Avoids adding a dependency for ~25 lines of work.
// Handles: KEY=value, quoted values, `export` prefixes, comments, blank lines.
// ---------------------------------------------------------------------------
function loadEnvFile(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return {};

  const out = {};
  for (const raw of fs.readFileSync(full, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).replace(/^export\s+/, '').trim();
    let value = line.slice(eq + 1).trim();

    const quoted =
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1);
    if (quoted) value = value.slice(1, -1);

    out[key] = value;
  }
  return out;
}

const fileEnv = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') };
for (const [k, v] of Object.entries(fileEnv)) {
  if (process.env[k] === undefined) process.env[k] = v;
}

const loaded = ['.env', '.env.local'].filter((f) => fs.existsSync(path.join(ROOT, f)));

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let failures = 0;
let warnings = 0;

const pass = (label, detail = '') =>
  console.log(`  ${GREEN}PASS${RESET}  ${label}${detail ? ` ${DIM}${detail}${RESET}` : ''}`);
const fail = (label, detail) => {
  failures += 1;
  console.log(`  ${RED}FAIL${RESET}  ${label}`);
  if (detail) console.log(`        ${DIM}${detail}${RESET}`);
};
const warn = (label, detail) => {
  warnings += 1;
  console.log(`  ${YELLOW}SKIP${RESET}  ${label}`);
  if (detail) console.log(`        ${DIM}${detail}${RESET}`);
};
const section = (title) => console.log(`\n${BOLD}${title}${RESET}`);

const present = (name) => {
  const v = process.env[name];
  return typeof v === 'string' && v.trim().length > 0;
};

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------
async function checkGemini() {
  section('Gemini (writes the LaTeX)');

  if (!present('GEMINI_API_KEY')) {
    return fail('GEMINI_API_KEY is not set', 'Get one at https://aistudio.google.com/apikey');
  }

  // A real AI Studio key is "AIza" + 35 chars and never expires. An "AQ."
  // value is a short-lived OAuth access token — it authenticates for about an
  // hour and then starts returning 401, which is baffling if you do not know
  // to look for it.
  if (process.env.GEMINI_API_KEY.startsWith('AQ.')) {
    warn(
      'GEMINI_API_KEY looks like a temporary OAuth token, not an API key',
      'It starts with "AQ." — those expire after roughly an hour. A permanent key ' +
        'starts with "AIza". Create one at https://aistudio.google.com/apikey',
    );
  }
  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    warn(
      'NEXT_PUBLIC_GEMINI_API_KEY is still set',
      'Remove it — the NEXT_PUBLIC_ prefix compiles the key into the browser bundle.',
    );
  }

  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Reply with the single word: ok' }] }],
        // Generous on purpose. Current flash models are "thinking" models and
        // spend output tokens on reasoning before emitting any text, so a small
        // budget returns finishReason MAX_TOKENS with empty content — which
        // looks exactly like a broken key but is not.
        generationConfig: { maxOutputTokens: 512, temperature: 0 },
      }),
    });

    if (res.status === 401) {
      return fail(
        'Gemini rejected the credential (HTTP 401)',
        process.env.GEMINI_API_KEY.startsWith('AQ.')
          ? 'This is an expired OAuth token. Create a permanent API key (starts with "AIza") ' +
            'at https://aistudio.google.com/apikey and replace GEMINI_API_KEY.'
          : 'The key is not valid for the Generative Language API.',
      );
    }
    if (res.status === 400 || res.status === 403) {
      const body = await res.text().catch(() => '');
      return fail(
        `Gemini rejected the key (HTTP ${res.status})`,
        body.slice(0, 200) || 'Check the key is valid and the Generative Language API is enabled.',
      );
    }
    if (res.status === 404) {
      const available = await listGeminiModels();
      return fail(
        `Model "${model}" is unavailable`,
        available.length
          ? `Google retires model ids over time. Available to your key: ${available.slice(0, 8).join(', ')}${available.length > 8 ? ', …' : ''}`
          : 'Set GEMINI_MODEL to a model your key can access, or unset it for the default.',
      );
    }
    if (!res.ok) {
      return fail(`Gemini returned HTTP ${res.status}`, (await res.text().catch(() => '')).slice(0, 200));
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      const finish = candidate?.finishReason ?? 'none';
      const thoughts = data?.usageMetadata?.thoughtsTokenCount ?? 0;
      return fail(
        `Gemini returned no text (finishReason: ${finish})`,
        finish === 'MAX_TOKENS'
          ? `${thoughts} tokens went to reasoning before any output. The model works — the budget was too small.`
          : finish === 'SAFETY'
            ? 'Blocked by safety filters.'
            : 'Unexpected — re-run, and check the key has Generative Language API access.',
      );
    }

    pass('GEMINI_API_KEY works', `model=${model}`);
  } catch (err) {
    fail('Could not reach Gemini', err.message);
  }
}

/** Model ids the key can actually use, for a helpful 404 message. */
async function listGeminiModels() {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100', {
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models ?? [])
      .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((m) => m.name.replace('models/', ''))
      .filter((n) => n.startsWith('gemini') && !n.includes('image') && !n.includes('tts'));
  } catch {
    return [];
  }
}

async function checkTexapi() {
  section('Texapi (compiles LaTeX into PDF)');

  if (!present('TEXAPI_KEY')) {
    return fail('TEXAPI_KEY is not set', 'Create a key at https://texapi.ovh');
  }

  const tex = '\\documentclass{article}\n\\begin{document}\nok\n\\end{document}\n';

  try {
    const res = await fetch('https://texapi.ovh/api/latex/compile', {
      method: 'POST',
      headers: { 'X-API-KEY': process.env.TEXAPI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: tex }),
    });

    if (res.status === 401 || res.status === 403) {
      return fail(`Texapi rejected the key (HTTP ${res.status})`);
    }
    if (res.status === 422 || res.status === 500) {
      // Texapi returns 422/500 for rate limiting instead of 429 — a known
      // quirk, documented in src/server/latex/compile/texapi.ts. A trivial
      // document failing almost always means throttling, not bad LaTeX.
      return warn(
        `Texapi returned HTTP ${res.status} for a hello-world document`,
        'Usually rate limiting (it does not send 429). Wait 60s and re-run.',
      );
    }
    if (!res.ok) return fail(`Texapi returned HTTP ${res.status}`);

    const pdf = Buffer.from(await res.arrayBuffer());
    if (pdf.subarray(0, 5).toString() !== '%PDF-') {
      return fail('Texapi returned something that is not a PDF');
    }

    pass('TEXAPI_KEY works', `compiled ${pdf.length} bytes`);
  } catch (err) {
    fail('Could not reach Texapi', err.message);
  }
}

function checkFirebaseClient() {
  section('Firebase client SDK (browser auth)');

  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ];

  const missing = required.filter((n) => !present(n));
  if (missing.length) {
    return fail(`Missing ${missing.length} client variable(s)`, missing.join(', '));
  }

  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY.startsWith('AIza')) {
    warn('NEXT_PUBLIC_FIREBASE_API_KEY does not start with "AIza"', 'That is unusual — double-check it.');
  }

  pass('All client variables present', `project=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
}

async function checkFirebaseAdmin() {
  section('Firebase Admin (server: auth, Firestore, Storage)');

  const required = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
  const missing = required.filter((n) => !present(n));
  if (missing.length) {
    return fail(
      `Missing ${missing.length} admin variable(s)`,
      `${missing.join(', ')} — from Project settings > Service accounts > Generate new private key`,
    );
  }

  const key = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  if (!key.includes('BEGIN PRIVATE KEY')) {
    return fail(
      'FIREBASE_PRIVATE_KEY does not look like a private key',
      'Paste the whole value including the -----BEGIN PRIVATE KEY----- header, in double quotes.',
    );
  }
  if (!key.includes('\n')) {
    return fail(
      'FIREBASE_PRIVATE_KEY has no line breaks',
      'Keep the literal \\n sequences from the JSON file; do not strip them.',
    );
  }

  let admin;
  try {
    admin = (await import('firebase-admin')).default;
  } catch {
    return fail('firebase-admin is not installed', 'Run: npm install');
  }

  try {
    const app =
      admin.apps.length > 0
        ? admin.app()
        : admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: key,
            }),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          });

    // Round-trips to Google and fails on a bad key or wrong project.
    await app.options.credential.getAccessToken();
    pass('Admin credentials accepted', `project=${process.env.FIREBASE_PROJECT_ID}`);

    try {
      await admin.firestore().collection('users').limit(1).get();
      pass('Firestore reachable');
    } catch (err) {
      fail('Firestore query failed', err.message.slice(0, 200));
    }

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      warn('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET not set', 'Generated documents cannot be stored.');
    } else {
      try {
        const [exists] = await admin.storage().bucket(bucketName).exists();
        if (exists) pass('Storage bucket reachable', bucketName);
        else
          fail(
            `Storage bucket "${bucketName}" not found`,
            'Check the name — it is usually <project-id>.appspot.com or <project-id>.firebasestorage.app',
          );
      } catch (err) {
        fail('Storage check failed', err.message.slice(0, 200));
      }
    }

    if (process.env.FIREBASE_PROJECT_ID !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      warn(
        'Admin and client point at different Firebase projects',
        `admin=${process.env.FIREBASE_PROJECT_ID} client=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}. ` +
          'Tokens minted for one will not verify against the other.',
      );
    }
  } catch (err) {
    fail('Admin credentials rejected', err.message.slice(0, 300));
  }
}

function checkOptional() {
  section('Optional features');

  if (present('NEXT_PUBLIC_JSEARCH_API_KEY')) pass('Job search configured');
  else warn('Job search not configured', 'NEXT_PUBLIC_JSEARCH_API_KEY unset — job search will return nothing.');

  if (present('NEXT_PUBLIC_TAVUS_API_KEY')) pass('AI interview configured');
  else warn('AI interview not configured', 'NEXT_PUBLIC_TAVUS_API_KEY unset.');
}

// ---------------------------------------------------------------------------
async function main() {
  console.log(`${BOLD}Environment check${RESET}`);
  console.log(
    loaded.length
      ? `${DIM}Loaded: ${loaded.join(', ')}${RESET}`
      : `${YELLOW}No .env or .env.local found — copy .env.example to .env.local${RESET}`,
  );

  checkFirebaseClient();
  await checkFirebaseAdmin();
  await checkGemini();
  await checkTexapi();
  checkOptional();

  console.log(`\n${BOLD}${'─'.repeat(58)}${RESET}`);
  if (failures === 0) {
    console.log(
      `${GREEN}${BOLD}Ready.${RESET} ${warnings > 0 ? `${warnings} optional item(s) skipped.` : ''}`,
    );
    console.log(`${DIM}Start the app with: npm run dev${RESET}`);
  } else {
    console.log(`${RED}${BOLD}${failures} problem(s) to fix.${RESET} See docs/SETUP.md`);
  }

  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`\n${RED}Check script crashed:${RESET}`, err);
  process.exit(1);
});
