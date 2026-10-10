# Gmail job sync: setup, state and costs

Companion to [GMAIL_JOB_SYNC_SCOPE.md](./GMAIL_JOB_SYNC_SCOPE.md) (design and references). This file answers three questions:
what exists, what you must do in Google Cloud, and what it costs.

## 1. Short answers

| Question | Answer |
| --- | --- |
| Do I need a Google subscription? | **No.** Gmail API is free. Nothing in Google Cloud needs billing for this feature. |
| Do I need Gemini's paid tier? | **No.** The default model is **Llama 3.3 70B on Cloudflare Workers AI**, free up to 10,000 neurons a day (about 200 to 330 emails a day) and Cloudflare does not train on your content. Gemini works too, but only on a billed project, and is optional. |
| What will it cost? | **$0** for you and a handful of testers. About **$10 a month** at 100 users. See section 5. |
| Can anything be paid by accident? | Google: no (no billing needed). Cloudflare: Workers Free stops at the allowance and the sync waits until tomorrow; you are only charged if you choose Workers Paid. |
| What is the one big future cost? | Opening Gmail access to the **public** needs Google verification and an annual security assessment. Vendors quote about $500 to a few thousand dollars a year. Not needed while you stay in Testing mode (up to 100 invited users). |

## 2. What is built (state of the project)

| Layer | Status |
| --- | --- |
| Database: `gmail_connections`, `gmail_messages`, 4 new columns on `job_applications` | Applied to the live database (migration 004) |
| Gmail client, OAuth, filter, extractor, merge, sync, 6 API routes | Done, tested |
| Models: Workers AI (default) and Gemini (optional) | Done, both scored 10/10 on the fixture emails (8B model 7/10, rejected) |
| Dashboard: Connect Gmail card, "Review" badge, privacy section 4a | Done |
| Daily trigger in the keep-alive Worker | Done, not deployed |
| **Switched on in production** | **No.** Needs section 3 and 4, then a redeploy |

Tests: 70 offline Gmail tests, 5 against the real database, 10 per model against real models, 406 across the repository, type check clean.

I wrote this from scratch rather than copying the reference projects: [Devashish-Pisal](https://github.com/Devashish-Pisal/job-application-tracker) and [mail.trace](https://github.com/24thAbhinav/mail.trace) state no licence (all rights reserved by default), and [jobbear](https://github.com/benjaminbelloeil/jobbear) is AGPL-3.0, which would force you to publish this app's source. The ideas are the same; the code is yours.

## 3. Google Cloud: what you do (about 10 minutes, no card)

Why a **new project**: a project has one consent screen. Your existing Google sign-in lives in project `756278134709`. If Gmail's restricted scope and "Testing" status went on that screen, normal users could lose Google sign-in. A separate project keeps sign-in untouched. (Done for you already: the Gmail API was enabled on `756278134709`; it is harmless and can stay.)

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
| `CF_AI_ACCOUNT_ID` | your own Cloudflare account id `d5470bbbaeb9c16b7e86a59732239b08` |
| `CF_AI_TOKEN` | Cloudflare dashboard (your own account) > My Profile > API Tokens > Create Token > template **Workers AI** |
| `GMAIL_LLM` | leave unset (Workers AI). `gemini` only if you want Gemini, and then `GEMINI_PAID_TIER=1` |

Why your **own** Cloudflare account for AI: the 10,000 free neurons are per account, and your own account needs nobody else's permission. The domain and the Worker stay in Anish's account.

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

| Scenario | Emails/day | Workers AI | Gemini paid |
| --- | --- | --- | --- |
| You alone | 5 (first sync: about 80 once) | **$0** | $0.11 a month |
| You + 10 testers | 55 | **$0** (first syncs spread over a few days) | $1.25 a month |
| 100 testers (Google's Testing cap) | 500 | about **$10 a month** ($5 plan + $5 usage) | about $11 a month |
| 1,000 users (public, after verification) | 5,000 | about **$84 a month** | about $112 a month |

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
- [ ] `CF_AI_TOKEN` created in your own Cloudflare account
- [ ] Random keys generated and set (`GMAIL_TOKEN_KEY`, `GMAIL_STATE_SECRET`, `GMAIL_CRON_SECRET`)
- [ ] Tell Claude: it deploys the Worker and VM service, sets the secrets, sets the daily trigger and runs a first sync with you
