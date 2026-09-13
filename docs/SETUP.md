# Setup & Run

Getting the app running locally from a fresh clone. Roughly 15 minutes, most of it
in the Firebase console.

---

## 1. Install

```bash
npm install
```

Node 18+ required (Node 20 or 22 recommended).

---

## 2. Fill in `.env.local`

`.env.local` already exists in the project root with every variable laid out and
commented. It is gitignored — real keys never reach the repo.

If it is missing, recreate it:

```bash
cp .env.example .env.local
```

### The four things you need

| What | Where to get it | Needed for |
|---|---|---|
| **Gemini API key** | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — free tier is fine | Writing the LaTeX |
| **Texapi key** | [texapi.ovh](https://texapi.ovh) → API Keys → create | Compiling LaTeX → PDF |
| **Firebase web config** | Console → Project settings → General → Your apps → SDK setup | Login, database |
| **Firebase service account** | Console → Project settings → Service accounts → Generate new private key | Server-side auth, storage, quota |

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

### Firebase web config

Console → ⚙️ Project settings → General → scroll to "Your apps" → pick the web app →
"Config". You get an object like this:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123"
};
```

Map it across:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123
```

### Firebase service account (the fiddly one)

Console → ⚙️ Project settings → **Service accounts** → **Generate new private key**.
A JSON file downloads. Open it and copy three fields:

```jsonc
{
  "project_id": "your-project",           // -> FIREBASE_PROJECT_ID
  "client_email": "firebase-adminsdk-...@your-project.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
}
```

```env
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

**The private key trips people up.** Three rules:

1. Wrap it in **double quotes**.
2. Keep it on **one line**.
3. Keep the literal `\n` sequences exactly as they appear in the JSON. Do not turn them
   into real line breaks, and do not delete them.

Delete the downloaded JSON afterwards, or move it well outside the repo.

---

## 3. Verify

```bash
npm run check:env
```

This does not just check that variables exist — it makes a real call against each
service, so a typo'd key fails here instead of when a user clicks Generate.

```
Firebase client SDK (browser auth)
  PASS  All client variables present project=your-project

Firebase Admin (server: auth, Firestore, Storage)
  PASS  Admin credentials accepted project=your-project
  PASS  Firestore reachable
  PASS  Storage bucket reachable your-project.firebasestorage.app

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
npm run dev
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

**`Admin credentials rejected`**
Almost always `FIREBASE_PRIVATE_KEY` formatting. Double quotes, one line, literal `\n`
preserved. Re-download the service account JSON and copy the `private_key` value verbatim.

**`Storage bucket not found`**
Newer Firebase projects use `<project-id>.firebasestorage.app`; older ones use
`<project-id>.appspot.com`. Copy the exact value from the console.

**`Admin and client point at different Firebase projects`**
`FIREBASE_PROJECT_ID` and `NEXT_PUBLIC_FIREBASE_PROJECT_ID` must match. ID tokens minted
by one project will not verify against another, so every request will 401.

**"We could not render your documents"**
A Texapi failure. Re-run `npm run check:env`. If it reports HTTP 422 for a hello-world
document, you are being rate limited — Texapi returns 422/500 instead of 429 when you
exceed 20 requests/minute. Wait a minute and retry.

**"You have reached your daily limit"**
25 generations per user per day, enforced server-side. Reset by deleting today's document
under `users/{uid}/usage/{YYYY-MM-DD}` in Firestore, or change `DAILY_GENERATION_LIMIT` in
`src/server/firebase/usage.ts`.

**Generation is slow or times out**
Normal is 10–30s. Gemini retries with backoff on 429/503, and Texapi's client pauses 20s to
re-check a 422 before declaring failure, so a bad minute can stretch to ~60s.

---

## Deploying

Deployment targets and the Secret Manager setup for Cloud Run are covered in the main
[README](../README.md#deploying-to-cloud-run).

Two things that must be true in every environment:

- `GEMINI_API_KEY` and `TEXAPI_KEY` are set as **runtime** variables, never build args —
  a build arg is baked into the image.
- Neither is prefixed `NEXT_PUBLIC_`.

If you outgrow Texapi, [docs/self-hosted-latex-compiler.md](./self-hosted-latex-compiler.md)
covers running your own compiler.
