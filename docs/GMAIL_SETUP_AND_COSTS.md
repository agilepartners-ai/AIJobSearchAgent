# Gmail job sync: setup, state and costs

Companion to [GMAIL_JOB_SYNC_SCOPE.md](./GMAIL_JOB_SYNC_SCOPE.md) (design and references). This file answers three questions:
what exists, what you must do in Google Cloud, and what it costs.

## 0. Which way in? (read this first)

There are two ways to get a user's job emails. They can run side by side.

| | A. **Forward emails** (recommended for launch) | B. **Connect Gmail** (one click) |
| --- | --- | --- |
| Google permission | **None** | `gmail.readonly`, a **restricted** scope |
| Google review needed | **No** | Verification now, then an **annual security assessment** to go public |
| Cost to go commercial | **$0** (Cloudflare Email Routing is free) | Assessment fee, quoted from about $500 up to several thousand dollars a year (sources disagree; get lab quotes), plus the work to pass it |
| Works for | Gmail, Outlook, Yahoo, any mail | Gmail only |
| User effort | One-time setup, about 2 minutes (paste an address, one filter) | One click |
| How many users | Unlimited, no Google cap | 100 test users until verified |
| Automatic after setup | Yes, as mail arrives | Yes, daily and on demand |

How the "plugins and MCPs" do it: Claude's Gmail connector, and every product that reads Gmail, sign users in through an OAuth app that the vendor registered and had **Google verify, including the security assessment**. Open-source MCP servers skip that by running in *your own* Google project in Testing mode (your account only, tokens expire in 7 days). There is no free shortcut around Google's rule for reading Gmail through its API; the free route is to not use the Gmail API, which is path A. Another route, Gmail add-ons, uses a *sensitive* scope that needs no assessment, but it works only while the user has an email open, so it cannot fill a board by itself.

**Recommendation for a commercial product:** launch with A (works for everyone, no Google review, $0). Add B later as a convenience when revenue covers the assessment; the code for B is already built.

## 1. Short answers (for path B, Connect Gmail)

| Question | Answer |
| --- | --- |
| Which AI model reads the emails? | **Gemini, the same AI Studio key that writes the resumes.** No second model to set up. Cloudflare's Llama is an optional alternative (`GMAIL_LLM=workers-ai`). |
| Do I need a subscription? | **No.** Gmail API is free. Gemini is pay-as-you-go: a few cents a month for you. There is no plan to buy. |
| What must be true about the Gemini key? | It must be on a **billed** Google project (AI Studio shows "Paid"). Then Google does not train on it. If it shows "Free", Google trains on and reviews the prompts, which the privacy text promises we never allow, so the sync will not start. Two fixes: add billing to the project (pay-as-you-go), or use the Cloudflare model. |
| Vertex later? | Good plan: Vertex AI Gemini also does not train on your data and fits Google's rules for a public launch. Switching later is a small change (a different client behind the same call). Not needed for Testing. |
| What will it cost? | **About $0.11 a month for you alone**, $1.25 for 10 testers, $11 for 100. See section 5. |
| What is the one big future cost? | Opening Gmail to the **public** needs Google verification and an annual security assessment (vendors quote about $500 to a few thousand dollars a year). Not needed while you stay in Testing (up to 100 invited users). |

## 2. What is built (state of the project)

| Layer | Status |
| --- | --- |
| Database: `gmail_connections`, `gmail_messages`, 4 new columns on `job_applications` | Applied to the live database (migration 004) |
| Gmail client, OAuth, filter, extractor, merge, sync, 6 API routes | Done, tested |
| Models: Gemini (default) and Cloudflare Workers AI (optional) | Done. Both scored 10/10 on the fixture emails (the small 8B Llama 7/10, rejected) |
| Dashboard: Connect Gmail card, "Review" badge, privacy section 4a | Done |
| Daily trigger in the keep-alive Worker | Done, not deployed |
| **Switched on in production** | **No.** Needs section 3 and 4, then a redeploy |

Tests: 70 offline Gmail tests, 5 against the real database, 10 per model against real models, 406 across the repository, type check clean.

I wrote this from scratch rather than copying the reference projects: [Devashish-Pisal](https://github.com/Devashish-Pisal/job-application-tracker) and [mail.trace](https://github.com/24thAbhinav/mail.trace) state no licence (all rights reserved by default), and [jobbear](https://github.com/benjaminbelloeil/jobbear) is AGPL-3.0, which would force you to publish this app's source. The ideas are the same; the code is yours.

## 3. Google Cloud: what you do (about 10 minutes, no card)

0. **Check the Gemini key is on the paid tier** (one minute). Open https://aistudio.google.com/apikey and look at the plan next to your key. It must say **Paid**. If it says Free: open https://console.cloud.google.com/billing/linkedaccount?project=756278134709 and link a billing account (pay-as-you-go, no minimum), or tell me to use the Cloudflare model instead.

Why a **new project** for the Gmail sign-in screen: a project has one consent screen. Your existing Google sign-in lives in project `756278134709`. If Gmail's restricted scope and "Testing" status went on that screen, normal users could lose Google sign-in. A separate project keeps sign-in untouched. (Done for you already: the Gmail API was enabled on `756278134709`; it is harmless and can stay.)

1. **Create the project.** https://console.cloud.google.com/projectcreate , name `ajsa-gmail`. Pick your own Google account as owner. No billing account needed.
2. **Enable the Gmail API** in that project: https://console.cloud.google.com/apis/library/gmail.googleapis.com (press Enable).
3. **Google Auth Platform**: https://console.cloud.google.com/auth/overview . Press Get started and fill in:
   - App name `AI Job Search Agent`, support email yours.
   - Audience: **External**.
   - Contact email: yours. Agree, Create.
4. **Branding** tab: App homepage `https://agilepartners-ai.com`, Privacy policy `https://agilepartners-ai.com/privacy-policy`, Terms `https://agilepartners-ai.com/terms-of-service`, Authorized domain `agilepartners-ai.com`. Save.
5. **Audience** tab: keep **Publishing status: Testing**. Under **Test users** add every Gmail address that will connect (yours first). Limit 100.
6. **Data Access** tab: **Add or remove scopes**, tick `.../auth/gmail.readonly` (it appears under "Restricted scopes"), plus `openid` and `.../auth/userinfo.email`. Update, Save.
7. **Clients** tab: **Create client**, type **Web application**, name `ajsa-gmail`.
   - Authorised redirect URIs: `https://agilepartners-ai.com/api/gmail/callback` and, for local tests, `http://localhost:3000/api/gmail/callback`.
   - Create, then copy the **Client ID** and **Client secret** (keep them private).
8. Put them in `.env.local` (names below) and tell me; I will deploy.

What users see: while in Testing, Google shows "Google hasn't verified this app". They press Advanced, then "Go to AI Job Search Agent (unsafe)", then tick the Gmail box. **Refresh tokens expire after 7 days in Testing**, so each tester must press Reconnect about weekly. That goes away only after verification (section 6).

## 4. Settings to add

Local `.env.local` (private) and the VM `~/ajsa/ajsa.env`; the Worker needs the same names as secrets (connect, callback and status run there):

| Name | Value |
| --- | --- |
| `GMAIL_SYNC_ENABLED` | `1` |
| `GMAIL_GOOGLE_CLIENT_ID`, `GMAIL_GOOGLE_CLIENT_SECRET` | from step 7 |
| `GMAIL_REDIRECT_URI` | `https://agilepartners-ai.com/api/gmail/callback` |
| `GMAIL_TOKEN_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `GMAIL_STATE_SECRET`, `GMAIL_CRON_SECRET` | two different random strings, 24+ characters |
| `GEMINI_PAID_TIER` | `1`, once you have checked the key shows **Paid** (section 3, step 0). The resume key `GEMINI_API_KEY` is reused; nothing else to add |
| `GMAIL_LLM` | leave unset (Gemini). Set `workers-ai` only for the Cloudflare model |
| `CF_AI_ACCOUNT_ID`, `CF_AI_TOKEN` | only for `GMAIL_LLM=workers-ai`: your own Cloudflare account id `d5470bbbaeb9c16b7e86a59732239b08` and a token from the **Workers AI** template |

Do not reuse the sign-in client for Gmail; the variable names are different on purpose.

## 5. Cost plan

### 5.1 What each piece costs today

| Item | Cost | Notes |
| --- | --- | --- |
| Gmail API | $0 | Free; per-user rate limits only |
| Google Cloud project for the consent screen | $0 | No billing account |
| Workers AI, Llama 3.3 70B | $0 up to 10,000 neurons/day, then $0.011 per 1,000 neurons on Workers Paid | Measured: **30 neurons per fixture email**; real emails are longer, plan **50** |
| Gemini 3.5 Flash-Lite (optional) | $0.30 per 1M input tokens, $2.50 per 1M output tokens, billed project required | Measured $0.00064 per fixture email; plan **$0.00075** for real mail |
| Cloudflare Worker, Hyperdrive, tunnel, domain rules | $0 | Existing, free plan |
| VM (e2-small), Postgres | Already running | Gmail adds about 200 bytes per message |
| Google verification and security assessment | $0 now; roughly $500 to a few thousand a year if public | Vendor quotes, **verify with a lab** |

### 5.2 Formula

```
emails per day  = users x candidate emails per user per day
neurons per day = emails per day x 50
free emails/day = 10,000 / 50 = 200
Workers AI cost = max(0, neurons per day - 10,000) / 1,000 x $0.011 per day   (+ $5 a month Workers Paid plan, verify)
Gemini cost     = emails per day x $0.00075 per day
```

Steady state is about 5 candidate emails per user per day after the filter. The first sync reads 30 days: about 40 to 150 emails per user (an estimate: measure on your own inbox).

### 5.3 Scenarios

| Scenario | Emails/day | Gemini paid (default) | Cloudflare model (alternative) |
| --- | --- | --- | --- |
| You alone | 5 (first sync: about 80 once) | **$0.11 a month** | $0 |
| You + 10 testers | 55 | **$1.25 a month** | $0 (first syncs spread over a few days) |
| 100 testers (Google's Testing cap) | 500 | about **$11 a month** | about $10 a month ($5 plan + $5 usage) |
| 1,000 users (public, after verification) | 5,000 | about **$112 a month** | about $84 a month |

### 5.4 Guards that keep it at the low end

- The cheap filter drops receipts, alerts and newsletters before any model call.
- At most 60 model calls per sync, 150 per user per day, one manual sync every 5 minutes.
- If Workers Free runs out, the sync stops calling for 15 minutes and retries those messages tomorrow (the log only keeps mail that finished).
- Every sync records `tokensIn` and `tokensOut`, visible in `/api/gmail/status`, so spend is measured, not guessed.

## 6. Going public later

1. Move the consent screen to **In production**, which starts Google's verification of the restricted scope.
2. Complete the annual security assessment (CASA) with an approved lab; keep the privacy policy section 4a unchanged in substance.
3. Expect weeks. Budget for the lab fee; ask for current quotes.
4. Until then, stay in Testing with up to 100 invited users. This is fine for a private beta.

## 7. Checklist

- [ ] New Google project, Gmail API on, consent screen External + Testing, scope added, test users added
- [ ] Web client with the two redirect URIs; ID and secret in `.env.local`
- [ ] Gemini key shows **Paid** in AI Studio, so `GEMINI_PAID_TIER=1`
- [ ] Random keys generated and set (`GMAIL_TOKEN_KEY`, `GMAIL_STATE_SECRET`, `GMAIL_CRON_SECRET`)
- [ ] Tell Claude: it deploys the Worker and VM service, sets the secrets, sets the daily trigger and runs a first sync with you

## 8. Forwarding setup (path A): what to do once

Nothing in Google Cloud. Three things, about 15 minutes. Steps 1 and 2 are in Anish's Cloudflare account (the teammate guide below has the click path).

1. **Turn on Email Routing for a subdomain.** Use `in.agilepartners-ai.com`, not the main domain: the main domain's mail records belong to Zoho and must not change. Cloudflare adds the subdomain's own mail records itself.
   - Dashboard: the domain > Email > Email Routing > Settings > **Subdomains** > add `in`. Wait for the DNS records to appear.
   - Same page: turn on **Subaddressing**, so `jobs+anything@in.agilepartners-ai.com` reaches the rule for `jobs@in.agilepartners-ai.com`.
2. **Create one rule**: Custom address `jobs` at `in.agilepartners-ai.com` > Action **Send to a Worker** > `ajsa-inbound`. (Catch-all does not exist on subdomains, so one literal rule plus subaddressing is how a single rule serves every user.)
3. **Tell me.** I deploy the Worker (`ajsa-inbound`) and the VM service, set `INBOUND_SECRET`, and test with a real forwarded email.

Settings (VM `ajsa.env`, and as Worker variables for the web app): `INBOUND_ENABLED=1`, `INBOUND_DOMAIN=in.agilepartners-ai.com`, `INBOUND_SECRET` (24+ random characters, VM and the `ajsa-inbound` Worker only). The model must be the billed Gemini key (`GEMINI_PAID_TIER=1`), same as above.

What the user does (the dashboard shows these steps with their own address and a Copy button): in Gmail, add the forwarding address; Google sends a confirmation to it and the dashboard shows the code; then create a filter with the shown search and "Forward it to" the address. After that every matching email arrives on its own.

Limits and safety: messages over 1.5 MB are rejected; 200 emails per address per day; 150 model calls per user per day; the address contains a 26-character secret and can be replaced with one click; nothing from the email body is stored.

Cost of path A: Cloudflare Email Routing and Email Workers are free; the only cost is the model (section 5), the same as path B.
