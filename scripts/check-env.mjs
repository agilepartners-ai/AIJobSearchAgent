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
/** Split a comma/space/newline separated key list, dropping blanks and placeholders. */
function keysOf(listName, singleName) {
  const raw = `${process.env[listName] ?? ''},${process.env[singleName] ?? ''}`;
  const keys = raw
    .split(/[\s,;]+/)
    .map((k) => k.trim().replace(/^["']|["']$/g, ''))
    .filter((k) => k && !/^(your[_-]|changeme|xxx|<)/i.test(k));
  return Array.from(new Set(keys));
}

async function checkGemini() {
  section('Gemini (writes the LaTeX)');

  const keys = keysOf('GEMINI_API_KEYS', 'GEMINI_API_KEY');
  if (!keys.length) {
    return fail(
      'No Gemini key is set',
      'Set GEMINI_API_KEYS=key1,key2,... (or a single GEMINI_API_KEY). Get keys at https://aistudio.google.com/apikey',
    );
  }
  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    warn(
      'NEXT_PUBLIC_GEMINI_API_KEY is still set',
      'Remove it — the NEXT_PUBLIC_ prefix compiles the key into the browser bundle.',
    );
  }

  const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  let usable = 0;

  for (const [i, key] of keys.entries()) {
    const tag = `key #${i + 1} …${key.slice(-4)}`;
    // A real AI Studio key is "AIza" + 35 chars and never expires. An "AQ."
    // value is a short-lived OAuth token that 401s after about an hour.
    if (key.startsWith('AQ.')) {
      warn(
        `${tag} looks like a temporary OAuth token`,
        'It starts with "AQ." — those expire after roughly an hour. A permanent key starts with "AIza".',
      );
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with the single word: ok' }] }],
          generationConfig: { maxOutputTokens: 512, temperature: 0 },
        }),
      });
      if (res.status === 401 || res.status === 403) {
        fail(`${tag} was rejected (HTTP ${res.status})`, 'Create a permanent key at https://aistudio.google.com/apikey');
      } else if (res.status === 429) {
        usable += 1;
        warn(`${tag} is rate limited right now`, 'It is valid. The pool benches a limited key and uses the others.');
      } else if (res.status === 404) {
        const available = await listGeminiModels(key);
        return fail(
          `Model "${model}" is not available to this key (HTTP 404)`,
          available.length
            ? `Models your key can use: ${available.slice(0, 12).join(', ')}`
            : 'Set GEMINI_MODEL to a model your key can access, or unset it for the default.',
        );
      } else if (!res.ok) {
        fail(`${tag} returned HTTP ${res.status}`, (await res.text().catch(() => '')).slice(0, 200));
      } else {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (!text.trim()) {
          fail(`${tag} returned no text`, `finishReason: ${data?.candidates?.[0]?.finishReason ?? 'none'}`);
        } else {
          usable += 1;
          pass(`${tag} works`, `model=${model}`);
        }
      }
    } catch (err) {
      fail(`Could not reach Gemini with ${tag}`, err.message);
    }
  }

  if (keys.length > 1) {
    pass(`${usable} of ${keys.length} keys usable in the rotation pool`, 'Calls are spread across them; a limited key is benched.');
  }
}

/** Model ids the key can actually use, for a helpful 404 message. */
async function listGeminiModels(apiKey = keysOf('GEMINI_API_KEYS', 'GEMINI_API_KEY')[0]) {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100', {
      headers: { 'x-goog-api-key': apiKey },
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

async function checkNvidia() {
  section('NVIDIA embeddings (per-account RAG memory, optional)');

  if (process.env.RAG_ENABLED === 'false') {
    return warn('RAG_ENABLED=false', 'Retrieval is switched off; generation runs without it.');
  }
  const keys = keysOf('NVIDIA_API_KEYS', 'NVIDIA_API_KEY');
  if (!keys.length) {
    return warn(
      'No NVIDIA key is set, so RAG is off',
      'Optional. Get keys at https://build.nvidia.com and set NVIDIA_API_KEYS=key1,key2,...',
    );
  }

  const model = process.env.NVIDIA_EMBED_MODEL || 'nvidia/nemotron-3-embed-1b';
  const base = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '');
  let usable = 0;

  for (const [i, key] of keys.entries()) {
    const tag = `key #${i + 1} …${key.slice(-4)}`;
    const post = (withType) =>
      fetch(`${base}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          input: ['ok'],
          ...(withType ? { input_type: 'query' } : {}),
          encoding_format: 'float',
          truncate: 'END',
        }),
      });
    try {
      let res = await post(true);
      if ((res.status === 400 || res.status === 422) && /input_type/i.test(await res.clone().text())) res = await post(false);

      if (res.status === 401 || res.status === 403) {
        fail(`${tag} was rejected (HTTP ${res.status})`, 'Check the key at https://build.nvidia.com');
      } else if (res.status === 404) {
        return fail(`Embedding model "${model}" was not found (HTTP 404)`, 'Set NVIDIA_EMBED_MODEL to a model your key can use.');
      } else if (res.status === 429) {
        usable += 1;
        warn(`${tag} is rate limited right now`, 'It is valid; the pool will use the others.');
      } else if (!res.ok) {
        fail(`${tag} returned HTTP ${res.status}`, (await res.text().catch(() => '')).slice(0, 200));
      } else {
        const data = await res.json();
        const dims = data?.data?.[0]?.embedding?.length;
        if (!dims) fail(`${tag} returned no embedding`);
        else {
          usable += 1;
          pass(`${tag} works`, `${model}, ${dims} dimensions`);
        }
      }
    } catch (err) {
      fail(`Could not reach NVIDIA with ${tag}`, err.message);
    }
  }
  if (keys.length > 1) pass(`${usable} of ${keys.length} keys usable in the rotation pool`);
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

async function checkSupabase() {
  section('Supabase (authentication only)');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return fail(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing',
      'Supabase dashboard → Project Settings → API. The anon key is public by design.',
    );
  }

  try {
    // The anon key is validated by Supabase itself: a dead or mistyped key is rejected here,
    // the same way the browser would reject it at sign-in.
    const settings = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anon } });
    if (!settings.ok) {
      return fail('Supabase rejected the anon key', `GET /auth/v1/settings -> HTTP ${settings.status}. Copy a fresh key from Project Settings → API.`);
    }
    const body = await settings.json();
    pass('Anon key accepted', url);
    if (body.external?.google) pass('Google sign-in is enabled');
    else warn('Google sign-in is not enabled', 'Supabase → Authentication → Providers → Google.');
    if (body.external?.email) pass('Email sign-in is enabled');

    // The API verifies sessions against these public keys; nothing secret is needed server-side.
    const jwks = await fetch(`${url}/auth/v1/.well-known/jwks.json`);
    const keys = jwks.ok ? (await jwks.json()).keys ?? [] : [];
    if (keys.length) pass('Token signing keys published', `${keys.length} key(s), ${keys[0].alg}`);
    else fail('No signing keys at /.well-known/jwks.json', 'Server-side token verification would reject every request. Enable asymmetric JWT signing in Supabase.');
  } catch (err) {
    fail('Could not reach Supabase', err.message);
  }
}

async function checkDatabase() {
  section('PostgreSQL (application data)');

  if (!present('DATABASE_URL')) {
    return fail('DATABASE_URL missing', 'postgres://jobsearch_app:<password>@<host>:5432/jobsearch. See db/README.md.');
  }

  let pg;
  try {
    pg = (await import('pg')).default;
  } catch {
    return fail('pg is not installed', 'Run: pnpm install');
  }

  const disabled = process.env.PGSSLMODE === 'disable';
  const ca = process.env.PG_SSL_CA?.replace(/\\n/g, '\n');
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: disabled ? false : ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });

  try {
    await client.connect();
    const who = await client.query('SELECT current_user AS u, current_database() AS d, (SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS ssl');
    const { u, d, ssl } = who.rows[0];
    pass('Connected', `${u}@${d}${ssl ? ' over TLS' : ' (NOT encrypted)'}`);
    if (!ssl && !disabled) warn('Connection is not encrypted', 'Set PG_SSL_CA so the server certificate is verified.');
    if (!disabled && !ca) warn('Server certificate not verified', 'Set PG_SSL_CA to the CA certificate (db/README.md).');

    const files = fs.readdirSync(path.join(ROOT, 'db', 'migrations')).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
    const done = (await client.query('SELECT name FROM app.schema_migrations')).rows.map((r) => r.name);
    const pending = files.filter((f) => !done.includes(f));
    if (pending.length) fail('Migrations pending', `${pending.join(', ')}. Run: pnpm db:migrate`);
    else pass('Schema is up to date', `${done.length} migration(s)`);
  } catch (err) {
    fail('Database check failed', String(err.message).slice(0, 240));
  } finally {
    await client.end().catch(() => undefined);
  }

  if (!process.env.DOCUMENT_SIGNING_SECRET || process.env.DOCUMENT_SIGNING_SECRET.length < 24) {
    fail('DOCUMENT_SIGNING_SECRET missing or too short', 'Needs 24+ random characters: openssl rand -base64 36. Signs document download links.');
  } else {
    pass('DOCUMENT_SIGNING_SECRET set');
  }
}

function checkOptional() {
  section('Optional features');

  if (present('NEXT_PUBLIC_JSEARCH_API_KEY')) pass('Job search configured');
  else warn('Job search not configured', 'NEXT_PUBLIC_JSEARCH_API_KEY unset — job search will return nothing.');

  if (present('TAVUS_API_KEY')) pass('AI interview configured');
  else warn('AI interview not configured', 'TAVUS_API_KEY unset. (It was NEXT_PUBLIC_TAVUS_API_KEY; that name shipped the key to every browser.)');
}

// ---------------------------------------------------------------------------
async function main() {
  console.log(`${BOLD}Environment check${RESET}`);
  console.log(
    loaded.length
      ? `${DIM}Loaded: ${loaded.join(', ')}${RESET}`
      : `${YELLOW}No .env or .env.local found — copy .env.example to .env.local${RESET}`,
  );

  await checkSupabase();
  await checkDatabase();
  await checkGemini();
  await checkNvidia();
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
