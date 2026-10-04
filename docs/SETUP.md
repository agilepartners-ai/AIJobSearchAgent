# Setup & Run

Getting the app running locally from a fresh clone. Roughly 15 minutes, most of it
creating the Supabase project and the database.

---

## 1. Install

```bash
pnpm install
```

Node 18+ required (Node 20 or 22 recommended).

This project uses **pnpm** (`pnpm-lock.yaml`). Do not run `npm install`: npm cannot read the
`node_modules` layout pnpm creates and fails with `Cannot read properties of null (reading 'matches')`.
If you do not have pnpm: `corepack enable`.

---

## 2. Fill in `.env.local`

`.env.local` already exists in the project root with every variable laid out and
commented. It is gitignored — real keys never reach the repo.

If it is missing, recreate it:

```bash
cp .env.example .env.local
```

### The things you need

| What | Where to get it | Needed for |
|---|---|---|
| **Gemini API key** | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — free tier is fine | Writing the LaTeX |
| **Texapi key** | [texapi.ovh](https://texapi.ovh) → API Keys → create | Compiling LaTeX → PDF |
| **Supabase project** | [supabase.com](https://supabase.com) → New project → Project Settings → API | Sign-in only (email + Google) |
| **PostgreSQL database** | Your own server; see [db/README.md](../db/README.md) | All application data and stored documents |
| **Document signing secret** | `openssl rand -base64 36` | Signs document download links |

### Gemini

Create a key and paste it in:

```env
GEMINI_API_KEY=AIza...
```

> **Do not** name this `NEXT_PUBLIC_GEMINI_API_KEY`. It used to be called that, which
> compiled the key into the JavaScript bundle where any visitor could read it. Anything
> prefixed `NEXT_PUBLIC_` is shipped to the browser.

### Texapi

Sign up, create a key, paste it in. **The key is displayed once** — copy it immediately.

```env
TEXAPI_KEY=...
```

### Supabase (authentication only)

Supabase only signs people in. No application data is stored there.

Project Settings → **API** gives you two values. The anon key is public by design:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Never put the `service_role` key in this app's environment; nothing here needs it.

**Google sign-in.** Create an OAuth client (Google Cloud Console → Google Auth Platform → Clients →
Web application) with the redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`, then paste
its Client ID and secret into Supabase → Authentication → Providers → Google. Set the consent screen's
publishing status to **In production**, otherwise only listed test users can sign in.

**Redirects.** Supabase → Authentication → URL Configuration: set the Site URL to your production
domain and add `http://localhost:3000/**` to the redirect allow-list.

**Email.** Supabase's built-in mailer allows only a few messages an hour. For real sign-ups set a
custom SMTP server under Authentication → SMTP Settings (use the SSL port, 465).

### PostgreSQL

All application data (profiles, job applications, résumés, per-account memory, usage, and the
generated PDF/LaTeX files) lives in one database. [db/README.md](../db/README.md) covers creating it
on a server, locking it down, and running the migrations. Then:

```env
DATABASE_URL=postgres://jobsearch_app:<password>@<host>:5432/jobsearch
# CA certificate PEM on ONE line, newlines written as the two characters \n
PG_SSL_CA="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
PG_POOL_MAX=2
```

```bash
pnpm db:migrate
```

### Document signing secret

Download links for generated documents are signed so they work in an `<iframe>` yet cannot be forged:

```env
DOCUMENT_SIGNING_SECRET=<24+ random characters>
```

---

## 3. Verify

```bash
pnpm check:env
```

This does not just check that variables exist — it makes a real call against each
service, so a typo'd key fails here instead of when a user clicks Generate.

```
Supabase (authentication only)
  PASS  Anon key accepted https://<project-ref>.supabase.co
  PASS  Google sign-in is enabled
  PASS  Token signing keys published 1 key(s), ES256

PostgreSQL (application data)
  PASS  Connected jobsearch_app@jobsearch over TLS
  PASS  Schema is up to date 2 migration(s)
  PASS  DOCUMENT_SIGNING_SECRET set

Gemini (writes the LaTeX)
  PASS  GEMINI_API_KEY works model=gemini-3.7-flash

Texapi (compiles LaTeX into PDF)
  PASS  TEXAPI_KEY works compiled 9574 bytes

Ready.
```

Fix anything marked `FAIL` before continuing. `SKIP` is fine — those are optional features.

---

## 4. Run

```bash
pnpm dev
```

Open <http://localhost:3000>.

---

## 5. Try it end to end

1. Register or log in.
2. Dashboard → add a job application (title, company, and paste a job description).
3. Click the AI enhancement button on that application.
4. Upload a resume as PDF or text.
5. **Generate resume & cover letter** — takes 10–30 seconds.

You should get a results screen with:

- a **PDF preview** of the resume
- a **Cover letter** tab
- a **LaTeX** tab where you can edit the source and recompile in place
- **Download PDF**, **Download .tex**, and **Open in Overleaf**

"Open in Overleaf" opens a new tab and creates a project in *your* Overleaf account —
it will ask you to sign in if you are not already. Overleaf compiles it there; the PDF
the app shows you was compiled separately by Texapi.

---

## Other commands

```bash
npm run check:env      # verify every credential actually works
npm run try:generate   # generate real documents into ./tmp-generated/ and open them
npm test               # full suite; live tests run automatically if keys are present
npm run build          # production build
npm run start          # serve the production build
npm run lint
```

`npm run try:generate` is the fastest way to judge output quality after changing a
template or the prompt — it writes `resume.pdf`, `resume.tex`, `cover_letter.pdf` and
`cover_letter.tex` so you can look at them. It costs one Gemini call and two compiles,
and does not consume anyone's daily quota.

### A note on models and thinking

Current Gemini flash models reason internally before producing output, and those
reasoning tokens are billed against the output limit. `thinkingBudget: 0` is requested
but **not reliably honoured** — measured on `gemini-3.7-flash`, 4 of 5 identical calls
still spent 389-563 tokens on reasoning.

Because of that, the client deliberately sets **no** output-token cap, so each model
applies its own maximum (65,536 on `gemini-3.7-flash`). Reasoning then costs latency,
never a truncated document. If you want genuinely zero reasoning, `gemini-3.1-flash-lite`
does no thinking at all — at some cost in writing quality.

---

## Changing how documents look

Everything visual lives in `src/server/latex/templates/`:

| File | Controls |
|---|---|
| `common.tex` | Page size, margins, fonts, colours, section heading style |
| `resume.macros.tex` | Layout of each resume entry — roles, education, projects, skills |
| `coverletter.macros.tex` | Cover letter layout |
| `example-body.tex` | Reference document, also used as a test fixture |

After editing, run `npm test`. The golden-file tests compile the template and inspect the
resulting PDF's **text layer** — that is what catches a macro which silently swallows its
content, which a visual check can miss.

To debug a template directly, compile it by hand:

```bash
# Requires Docker
docker run --rm -v "$PWD:/work" -w /work texlive/texlive:latest \
  pdflatex -interaction=nonstopmode yourfile.tex
```

This matters because **Texapi never returns a compile log** — a failed compile gives you a
bare HTTP 422 with no explanation. A local TeX Live is the only way to see the actual error.

### If you add or rename a macro

Update all three of these, or generation breaks for every user:

1. the `.tex` template that defines it
2. the allowlist in `src/server/latex/sanitize.ts`
3. the macro reference in `src/server/ai/prompts/system.md`

A test enforces that they stay in sync.

---

## Troubleshooting

**`Supabase rejected the anon key`**
The key was mistyped or regenerated. Copy it again from Project Settings → API.

**`unable to verify the first certificate`**
`PG_SSL_CA` is missing or damaged. It must be the CA certificate on one line with literal `\n`
between the PEM lines (`.env` files do not reliably keep multi-line values).

**Every API request answers 401**
The server could not verify the session token. Check `NEXT_PUBLIC_SUPABASE_URL` is the same project
the browser signs in to, and that the project still publishes signing keys at
`/auth/v1/.well-known/jwks.json` (`pnpm check:env` tests both).

**"We could not render your documents"**
A Texapi failure. Re-run `npm run check:env`. If it reports HTTP 422 for a hello-world
document, you are being rate limited — Texapi returns 422/500 instead of 429 when you
exceed 20 requests/minute. Wait a minute and retry.

**"You have reached your daily limit"**
25 generations per user per day, enforced server-side. Reset one user with
`DELETE FROM app.usage_daily WHERE user_id = '<uuid>' AND day = CURRENT_DATE;`, or change
`DAILY_GENERATION_LIMIT` in `src/server/db/usage.ts`.

**Generation is slow or times out**
Normal is 10–30s. Gemini retries with backoff on 429/503, and Texapi's client pauses 20s to
re-check a 422 before declaring failure, so a bad minute can stretch to ~60s.

---

## Deploying

Deployment targets are covered in the main [README](../README.md#deploying-to-cloud-run).

Things that must be true in every environment:

- `DATABASE_URL`, `PG_SSL_CA` and `DOCUMENT_SIGNING_SECRET` are set as **runtime** variables.
- `NEXT_PUBLIC_*` values are baked in at build time, so changing one needs a rebuild.

- `GEMINI_API_KEY` and `TEXAPI_KEY` are set as **runtime** variables, never build args —
  a build arg is baked into the image.
- Neither is prefixed `NEXT_PUBLIC_`.

If you outgrow Texapi, [docs/self-hosted-latex-compiler.md](./self-hosted-latex-compiler.md)
covers running your own compiler.
