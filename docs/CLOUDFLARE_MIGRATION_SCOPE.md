# Cloudflare migration scope — both apps, free plan only

Scope only. Nothing here has been changed in either app, on the VM, or in Cloudflare.
Covers **AI Job Search Agent** (this repo) and **Notera** (`D:\Current Projects\Notera-Health-Ai`) on one
Cloudflare account, with one rule: **pay nothing**.

Evidence labels used below: **[measured]** I built or ran it here · **[docs]** read from Cloudflare's own
documentation today · **[secondary]** reported by third-party sources · **[verify]** from memory, confirm in
the dashboard before relying on it.

---

## 1. Verdict

**Yes, move both apps to Cloudflare, on the free plan, with one deliberate exception: the AI generation
endpoint stays on your VM.** Everything else fits comfortably.

Why this shape, in three measured facts:

1. **Both apps are almost entirely static pages.** Every page in both builds is prerendered; only a handful of
   API routes are dynamic. Static assets on Workers are free and unlimited, with no CPU limit. [measured]
2. **Both fit the free Worker size limit with room to spare.** [measured]
   AI Job Search Agent **1.70 MiB** and Notera **1.03 MiB** compressed, against the **3 MiB** free limit.
3. **One route does not fit the free 10 ms CPU limit safely: résumé generation.** Steady-state it burns
   ~4 ms of pure compute plus framework and cold-start overhead, and a Worker killed mid-request cannot refund
   the user's daily quota. It runs on the VM instead, where there is no CPU cap. [measured]

Cloudflare is the right home on merit, not only on cost. Your database sits in one US region, so edge compute
does not speed up data calls; what Cloudflare does win is **serving pages from the edge** (fast everywhere,
survives a VM outage) and **removing every open port from the VM**.

---

## 2. Measured facts

### 2.1 Build and size (clean copy of committed code, OpenNext Cloudflare adapter, WSL)

| | AI Job Search Agent | Notera web |
|---|---|---|
| Build | ✅ succeeded | ✅ succeeded (after dropping 3 `runtime = 'edge'` lines) |
| Worker, uncompressed / **compressed** | 7.7 MiB / **1.70 MiB** | 5.1 MiB / **1.03 MiB** |
| Free limit (compressed) [docs] | 3 MiB | 3 MiB |
| Headroom | 43% | 66% |
| Routes built | 20 prerendered pages, **all static** | 18 prerendered routes, **all static** |
| Dynamic routes | 11 API routes | 3 API routes + 1 middleware |
| First-load JS (shared) | 115 kB | 102 kB |
| Static assets | 194 files, 61 MB | 163 files |
| Code | 261 source files, ~30450 lines of TypeScript | 5.4k lines web, Express backend on the VM |

### 2.2 CPU per generation, steady state (Node timing, same V8 engine as Workers) [measured]

| Step | CPU |
|---|---|
| Verify the session token (ES256) | 0.31 ms |
| Clean the LaTeX + build the document | 0.15 ms |
| Rebuild the résumé + coerce + schema-validate | 1.65 ms |
| Memory retrieval: score 120 stored chunks | 1.55 ms |
| Chunk a long résumé | 0.08 ms |
| Parse model response / serialise for the database | 0.07 ms |
| **Compute total** | **≈ 3.8 ms** |

Add Next/OpenNext routing and body parsing, and add that each *cold* Worker runs this code un-warmed (several
times slower on the first request). Against a **10 ms** limit [docs] that is too close to bet a paid feature
on. Waiting on Gemini, NVIDIA and Texapi does **not** count as CPU [docs], so wall-clock is not the problem;
the 15–60 s generation could stay open on Workers. CPU and the un-refundable quota are the problem.

The light routes (profile, applications, résumés, preferences) cost roughly 1–3 ms and are fine on free.

### 2.3 Weight of what the browser downloads (this hurts rankings) [measured]

AI Job Search Agent `public/` was **58 MB**: a 25 MB video, three PNGs of 3.2–4.2 MB, a 1 MB favicon and 15 MB of
`pdfjs-dist`. Correction to an earlier draft of this document: the video is used only on the `/ai-interview` page,
not on the landing page. The landing page's real weight was a 3.1 MB competitor screenshot and an outdated dashboard
screenshot that also showed a real email address. All of this is now fixed (section 9). Notera: images up to 1 MB and
a 600 KB logo; light by comparison.

### 2.4 Other findings

- **VM facts** [measured]: `e2-small`, 2 vCPU, 1.9 GB RAM, ~340 MB used, load 0.1. Notera's local
  speech-model volume (**4.2 GB**) is not referenced anywhere in Notera's backend code any more (it uses Google
  Speech); it is very likely reclaimable.
- **Notera auth** is custom (Express, bcrypt, cookie sessions, separate admin session). Accounts were bulk-created
  by a script that has **default passwords committed in the repo** (`db/create_users.mjs`); rotate them.
- **Notera is on `next-on-pages`**, which Cloudflare has deprecated; its own docs already plan the move to
  OpenNext Workers. This scope adopts that plan and adds measurements.
- **`public/resumecom.png`** (a screenshot of a competitor's product) is in the AI Job Search Agent repo.
  Using another company's branding on a marketing page is a legal risk; replace it.

---

## 3. Free-plan budget

| Resource | Free allowance | Our use | Verdict |
|---|---|---|---|
| Static asset requests | unlimited, free [secondary: confirm] | all page loads | ✅ the core of the design |
| Worker requests (dynamic) | **100,000/day, whole account** [docs] | API calls of both apps | ✅ ~15k sessions/day |
| CPU per request | **10 ms** [docs] | light routes 1–3 ms | ✅ (generate excluded) |
| Request duration | no limit while client connected [docs] | n/a | ✅ |
| Subrequests per request | 50 [docs] | ≤ 10 | ✅ |
| Worker size | 3 MiB compressed [docs] | 1.70 and 1.03 | ✅ |
| Workers per account | 100 [docs] | 2 (+1 cron) | ✅ |
| Hyperdrive (DB pooling) | **100,000 queries/day** [docs] | ~3 queries per API call | ⚠️ **the binding limit**, ~5–8k sessions/day |
| Workers Builds | 3,000 min/month, 1 at a time, 20 min [docs] | ~2 min per build | ✅ |
| WAF rate limiting | **1 rule, 10-second window, per IP** [docs] | login protection | ⚠️ notes below |
| Tunnel + Access | free [verify; Zero Trust Free ≈ 50 users] | 1 tunnel | ✅ |
| Web Analytics, Turnstile, Crawler Hints, cron triggers | free [verify] | analytics, bot check, indexing, keepalive | ✅ |
| R2 | 10 GB free [verify; may need a card on file] | optional off-site backups | ⚠️ skip if a card is required |
| Workers AI | 10,000 neurons/day [docs] | not used | — |

**Where it would break, and the planned fallback.** At about 5–8k signed-in sessions a day the Hyperdrive
quota is the first limit hit. Two levers before that: cache read-heavy responses at the edge, and point the
Worker's database calls at the VM service (no quota) instead. Past that scale a $5/month plan would be the
sensible step; nothing in this design needs it today.

**Rate limiting reality.** Notera's current Cloudflare guide asks for "10 requests per minute per IP" on login.
The free plan cannot express that: one rule, 10-second window. Use `3 requests / 10 s / IP` on the login path,
keep the backend's own lockout after 5 failures, and add Turnstile on login and sign-up (free).

---

## 4. Target architecture

```
                       Cloudflare account (free)
 ┌──────────────────────────────────────────────────────────────────────┐
 │  DNS + proxy for agilepartners-ai.com and aitoolsfordoctor.com        │
 │                                                                      │
 │  Worker  ajsa-web     static pages (free, unlimited) + light /api    │
 │  Worker  notera-web   static pages + 3 BFF routes                    │
 │  Hyperdrive ──► pooled TLS to the VM database (via Tunnel, no port)  │
 │  Rules: host-split, cache, redirects, WAF, AI-crawler allow-list     │
 │  Cron trigger: Supabase keep-alive, uptime ping                      │
 └──────────────┬───────────────────────────────────────────────────────┘
                │  Cloudflare Tunnel (outbound-only from the VM)
 ┌──────────────▼───────────────────────────────────────────────────────┐
 │ VM (e2-small)   ingress: IAP SSH only, nothing else                  │
 │   cloudflared ─► notera-backend :8080     (api.aitoolsfordoctor.com) │
 │               ─► ajsa-generate  :3000     (generate / compile only)  │
 │               ─► postgres       :5432     (private, for Hyperdrive)  │
 └──────────────────────────────────────────────────────────────────────┘

 Supabase (free): sign-in for AI Job Search Agent (and Notera, phase 4)
```

What changes on the VM: **Caddy, the origin certificates, the Cloudflare-IP firewall rules and the public 5432
rule all go away.** The tunnel is outbound-only, so the VM exposes no web or database port. That is a strictly
smaller attack surface than today, and it removes the certificate chores. Notera is not live, so it can be
re-containerised freely.

---

## 5. Phased plan

Every phase has a rollback and an acceptance test. Order matters: risks first.

### Phase 0: Spike, ~1 session, zero risk
- `wrangler login` (browser sign-in; I cannot do this for you), deploy AI Job Search Agent to a `*.workers.dev`
  preview.
- Create a Hyperdrive config for the `jobsearch` database (CA upload with `verify-full` is supported [docs];
  the bundle must contain a single CA certificate, ours does).
- **Prove** four things on the real runtime: `pg` connects through Hyperdrive; the Supabase token verifies;
  a light route stays under 10 ms in the Workers CPU metric; a static page costs no CPU.
- **Acceptance:** sign in on the preview URL, create an application, see it listed.
- **Rollback:** delete the preview Worker. Production untouched.

### Phase 1: AI Job Search Agent code changes
| Change | Why |
|---|---|
| `pool.ts` runtime switch: Node keeps the shared pool; Workers uses **one client per request** from the Hyperdrive binding | A Worker cannot reuse a connection across requests |
| `wrangler.jsonc`, `open-next.config.ts`, `public/_headers` (immutable cache for `/_next/static/*`) | adapter config; edge caching |
| `/api/documents/generate` and `/compile` **proxied to the VM service** | CPU limit and quota refund (section 2.2) |
| Remove `/api/dev/anchors` from production builds | it shows as a route; it already 404s, but keep the Worker lean |
| CORS or same-origin proxy decision for the VM service | browser calls must reach it |
| Slim `public/` from 58 MB to 12 MB (done, section 9) | speed and rankings |
- **Acceptance:** `pnpm test` green; preview deploy passes the live end-to-end generation test through the
  proxy; idempotent replay still returns the same résumé.
- **Rollback:** the current Netlify-ready build is unchanged until DNS moves.

### Phase 2: VM and tunnel
- Add `cloudflared` and an `ajsa-generate` container (the same Next app, only the generate routes are ever hit).
- Move `api.aitoolsfordoctor.com` to the tunnel; verify the Notera backend still answers health checks.
- Then close ingress 80/443/5432. Keep IAP SSH. Remove Caddy and the origin certificates.
- Reclaim the 4.2 GB speech-model volume after confirming no container mounts it.
- **Acceptance:** from the internet, the VM IP answers nothing on any port; both APIs work through the tunnel.
- **Rollback:** the old compose file and firewall rules are one command each; the disk snapshots exist.

### Phase 3: Notera web on Workers
- Delete the 3 `runtime = 'edge'` lines, add the adapter files (its guide already has them), build.
- **Replace the host-split middleware with Cloudflare Rewrite Rules** (free). The middleware currently makes
  every homepage hit a Worker request; as a rule, the homepage becomes a pure static asset: free and unlimited.
- Point `BACKEND_URL` at the tunnel hostname.
- **Acceptance:** marketing pages, login, a consult flow in a staging hostname.
- **Rollback:** keep the Pages project until the new Worker has run clean for a week.

### Phase 4: Supabase auth for Notera (scope only, do not start)
- **Reusable:** Notera's bcrypt hashes can be imported into Supabase (it also uses bcrypt), so accounts keep
  their passwords. Backend login then becomes "verify a Supabase token" (the same ES256 check built here).
- **Keep separate:** the admin session. Never mix the clinician population with admin sign-in.
- **Decision for you before this phase, because Notera handles health data:**
  Supabase's free plan and Cloudflare's free plan do **not** include a BAA (a business associate agreement,
  which HIPAA requires of vendors that touch protected health information) [verify]. Identity data (names,
  emails) is low sensitivity, but anything carrying patient content must not cross a vendor without one.
  Before real patient data: keep the PHI-carrying API path off the shared CDN (DNS-only hostname with its own
  certificate) or move to a plan that signs a BAA. Notera's own plan documents already reach this question.
- **Free-tier trap:** Supabase **pauses a free project after 7 days without database activity** [secondary].
  A daily cron-trigger call that performs a harmless authenticated lookup prevents it.

### Phase 5: SEO, AEO and GEO (section 6), runs alongside phases 1-3

### Phase 6: Operations on free tools
Uptime and error alerts through Cloudflare Notifications and a cron-triggered check; Web Analytics instead of a
tracking script; Workers logs for request-scoped debugging (the request ids already built into generation);
the existing nightly dumps and disk snapshots stay as the backup layers.

---

## 6. SEO, AEO and GEO scope

**Terms.** SEO is ranking in Google and Bing. AEO is being the direct answer shown by a search engine's answer
box. GEO is being quoted or cited by ChatGPT, Perplexity, Gemini and Claude. They share one foundation:
crawlable, fast, clearly structured pages that answer a question plainly, plus mentions from other trusted sites.

### 6.1 Where each site stands

| | AI Job Search Agent | Notera |
|---|---|---|
| `<title>`, description, Open Graph | **none** | done |
| `robots.txt`, sitemap | **none** | done |
| Structured data (JSON-LD) | **none** | Organization, WebSite, SoftwareApplication, FAQ |
| `lang` attribute on `<html>` | **missing** (no `_document`) | present |
| Indexable content depth | one long landing page | home, product, pricing, about, contact |
| Page weight | was 58 MB of public assets, now 12 MB | light |
| Blog / answer content | none | planned, none yet |

### 6.2 Do first: Cloudflare may be hiding you from AI search

Since July 2025, **new Cloudflare zones block AI crawlers by default** (GPTBot, ClaudeBot, PerplexityBot and
others), and that block happens **before** `robots.txt` is read [secondary]. If your zones were created after
that date, ChatGPT-style search may never see either site. Decide per bot class:

- **Allow retrieval/answer bots** (they fetch a page to cite it): OAI-SearchBot, ChatGPT-User, PerplexityBot,
  Claude's retrieval fetcher, Googlebot, Bingbot.
- **Your choice** for training crawlers (GPTBot, CCBot, Google-Extended): blocking costs little visibility.
- Add a WAF "skip" rule for the allowed list, then mirror it in `robots.txt`.

### 6.3 AI Job Search Agent: keyword map

| Page | Primary keyword | Supporting long-tails |
|---|---|---|
| Home | AI resume tailor | tailor resume to job description, AI job application assistant |
| `/resume-tailoring` | tailor resume to job description | ATS keyword match, resume match score, resume gap analysis |
| `/ats-resume-builder` | ATS-friendly resume | ATS resume templates, LaTeX resume, Overleaf resume template |
| `/cover-letter-generator` | AI cover letter generator | cover letter from job description |
| `/job-application-tracker` | job application tracker | track applications, follow-up reminders |
| `/mock-interview` | AI mock interview | interview practice with AI |
| `/compare/jobscan`, `/compare/teal` | Jobscan alternative, Teal alternative | free resume scanner alternative |
| `/guides/*` | informational | "how to tailor a resume", "ATS keywords explained" |

Differentiators worth stating plainly, because AI engines quote concrete claims: real **LaTeX/PDF output**,
**Open in Overleaf**, a **match score with listed gaps**, and per-account memory of past résumés. Verify each
claim against the product before it is published.

### 6.4 Notera: keyword map (health content is held to a higher standard)

Already planned in Notera's SEO plan: primary "AI medical scribe", "SOAP note generator", "ambient scribe",
"HIPAA AI scribe". Add: specialty pages ("AI scribe for family medicine"), comparison pages, and a trust page
(security, what is and is not stored, "a clinician signs every note"). Medical pages need named clinical
authors and reviewers; thin or anonymous health content ranks poorly and is rarely cited.

### 6.5 Technical checklist (all free)

| Item | Detail |
|---|---|
| Titles, descriptions, canonical, Open Graph per page | a small shared SEO component for the pages router |
| `<html lang>` | add `_document` |
| `robots.txt`, `sitemap.xml` | generated at build; submit to Google Search Console and Bing |
| JSON-LD | Organization, WebSite, SoftwareApplication (with offers), FAQPage, Article, BreadcrumbList |
| Answer-first writing | a 40-60 word direct answer under each question heading; tables for comparisons |
| `llms.txt` | cheap to add; no major AI provider has confirmed it influences answers, so low priority |
| IndexNow / Crawler Hints | free ways to tell Bing and others when pages change |
| Core Web Vitals | re-encode the hero video and images (target < 200 KB images, < 3 MB video), lazy-load below the fold |
| Caching | immutable `/_next/static/*`; short cache plus revalidation for HTML |
| Brotli, HTTP/3, Early Hints | on by default or one toggle in Cloudflare |
| Avoid | Rocket Loader and Auto Minify JS: they break React hydration |
| Measure | Search Console + Bing Webmaster + Cloudflare Web Analytics; a monthly check of "does an AI answer cite us" for 20 target questions |

FAQ markup note: Google now shows FAQ rich results only for a narrow set of sites, so FAQPage schema mostly
helps machines understand the page, which is exactly what AEO and GEO need. Do not expect a rich snippet.

### 6.6 GEO is mostly off-site

AI engines cite pages that other trusted sites already mention. Plan, no spend: Product Hunt, AlternativeTo,
G2/Capterra (Notera: healthcare IT directories), honest answers in Reddit and Quora threads, one original data
post per quarter (for example the distribution of résumé match scores, anonymised and aggregated), and named
authors with real credentials.

---

## 7. Cost and risk summary

**Cost: $0 recurring.** Every service used is on a free allowance listed in section 3.

| Risk | Likelihood | Mitigation |
|---|---|---|
| Hyperdrive 100k queries/day reached | low now, rises with growth | edge caching; Worker falls back to the VM service |
| Cloudflare free account suspended or rate-limited | low | the VM stack stays runnable behind a plain DNS record |
| Supabase project pauses when idle | medium | daily cron keep-alive |
| Free-plan rate limiting is coarse | certain | 10 s window + Turnstile + backend lockout |
| PHI crossing a no-BAA vendor | blocks go-live of real data | decide before any patient data (phase 4 note) |
| OpenNext adapter bug on a future Next release | low | pin versions; Workers Builds can deploy a previous commit in seconds |
| Windows dev not supported by the adapter | certain | develop on Node as today; build the Worker in WSL or Workers Builds |

## 8. What I need from you, and what I can do next

You do (needs your browser or account): `wrangler login`; confirm which of your domains already sit in this
Cloudflare account; decide the AI-crawler policy (6.2) and the PHI path (phase 4).

I can start immediately, with no spend and no outside access: Phase 1 code changes and the SEO foundation for
AI Job Search Agent (titles, robots, sitemap, structured data, `lang`, asset optimisation), plus tidying the
repo risks found above (competitor screenshot, committed default passwords in Notera).

---

## 9. Implementation status

Implemented and tested in the AI Job Search Agent repo (nothing deployed; every step that needs your Cloudflare login is
in [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md)).

**Verified on the real Workers runtime (`workerd`, built with the adapter in WSL):** runtime detection; Hyperdrive to
PostgreSQL; a real Supabase token verified inside the Worker; create and read of an application; forged document links
and tampered tokens rejected; generation refused with 503 when no origin is configured, and forwarded (path, body and
token, never cookies) with the origin's status and message relayed when one is; security headers on pages and API;
server-rendered HTML with title, canonical, JSON-LD and one H1. Worker size: **1.75 MiB compressed** of 3 MiB.

| Area | Done |
|---|---|
| Cloudflare | `wrangler.jsonc`, OpenNext config, edge headers, `pool.ts` (Workers client per request via Hyperdrive, Node pool unchanged), generation proxy, `/api/health`, keep-alive Worker, VM Dockerfile + compose + tunnel connector |
| Crawlers | `robots.txt` (answer bots allowed, training bots refused), `sitemap.xml`, `llms.txt`, all generated from one registry and checked by tests |
| Indexing | The site used to send crawlers an empty page (a client-only gate in `_app.tsx`). Public pages now render on the server; private pages are noindex by default; `pnpm seo:verify` checks the built HTML |
| Content | 5 feature pages and 2 guides, each with a direct answer, FAQ and structured data, written only from verified behaviour |
| Honesty | Removed invented numbers from the landing page (user counts, interview and callback rates, "18 days to offer", "10 jobs in 15 minutes", big-tech logos, fake ATS scores presented as results, a fake address bar). The FAQ now states what the product does |
| Security | The old design sent any key placed in `NEXT_PUBLIC_TAVUS_API_KEY` to every browser (it is empty in the local `.env.local`, but check the live host). Interviews now run through `/api/interview`: signed-in only, 5 per account per day, key server-side as `TAVUS_API_KEY` |
| Assets | Icons, manifest, share image; `public/` 58 MB to 12 MB; competitor screenshot and a real email address removed from public images |

**Still needs you**
1. `pnpm exec wrangler login`, then the stages in the deploy runbook (Hyperdrive, tunnel, deploy, custom domain, dashboard settings).
2. If a Tavus key was ever set as `NEXT_PUBLIC_TAVUS_API_KEY` on the live host, rotate it and set the new one as `TAVUS_API_KEY`. Rotate the JSearch key too (it was in git history).
3. Decide on the testimonials: named people at Google, Microsoft and Netflix that I cannot verify. They are untouched and carry no structured data.
4. Supply real team photos (12 images are hotlinked from Google Drive) or approve self-hosting them.
5. Notera (separate branch `cloudflare-seo-prep`): rotate any account created with the old committed default passwords, and review the unverified claims "HIPAA-ready" and "Free for the first 50".
