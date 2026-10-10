# Gmail job sync: scope and design

Reads the user's Gmail **Updates** tab, finds job-application emails, and fills the Applications board automatically
(company, role, status, dates, links, recruiter, salary and more). Built behind a feature flag; nothing runs until
the Google setup in section 8 is done.

Evidence labels: **[docs]** read from Google or Supabase documentation on 2026-10-10 · **[repo]** read from the
project's public README · **[measured]** run here · **[verify]** confirm before relying on it.

---

## 1. Verdict

Feasible, cheap to run, and the open-source projects that do it all use the same shape (Gmail query, cheap filter,
LLM extraction, fuzzy merge). Two things decide the plan, and neither is code:

1. **`gmail.readonly` is a restricted scope.** [docs: developers.google.com/workspace/gmail/api/auth/scopes] `gmail.metadata` is
   restricted too, and it hides the body, so it cannot do this job. While the Google app is in *Testing* it works for up to
   **100 test users**, with an "unverified app" screen, and **refresh tokens expire after 7 days** [docs: OAuth 2.0 page].
   For the public, Google requires app verification plus an **annual third-party security assessment (CASA)** because a
   server reads and stores data from the scope [docs: API Services User Data Policy; fees quoted by vendors range from about
   $500 to several thousand dollars a year, **[verify]** current lab quotes].
2. **Email text may only go to the paid Gemini tier.** Unpaid Gemini calls are used to improve Google products and can be read
   by human reviewers; paid calls are not [docs: ai.google.dev/gemini-api/terms]. The feature refuses to run unless
   `GEMINI_PAID_TIER=1` is set, which is Yatharth's statement that the key belongs to a billed project.

Recommended path: ship in Testing mode for yourself and up to 100 invited users now; start verification and the assessment
when you want it open to everyone.

## 2. How it works

```
User ── Connect Gmail ──► Google consent (gmail.readonly, offline) ──► /api/gmail/callback (Worker)
                                                                        └─ encrypts refresh token ─► Postgres
User ── Sync now / daily timer ─► /api/gmail/sync (Worker forwards) ─► VM service
   1. refresh access token (never stored)
   2. Gmail search:  category:updates newer_than:30d  (first run), then since last_sync
   3. cheap filter: ATS and job-board senders, subject keywords, drops newsletters (no AI call)
   4. fetch only the survivors, strip to plain text, cap at 6,000 characters
   5. Gemini (paid, JSON schema) -> email_type + fields + confidence
   6. merge: match to an existing application (company + role, fuzzy), status never moves backward
   7. write to job_applications; confidence < 0.70 is saved with needs_review = true
   8. remember the message id (not the text) so it is never processed twice
```

### Why a separate "Connect Gmail" step, not extra scopes in the sign-up button

| Option | Result |
| --- | --- |
| Gmail scope inside the Supabase Google sign-in | Supabase only hands back `provider_refresh_token` on that one sign-in, with `access_type=offline` and `prompt=consent`, and does not keep it [docs: supabase.com/docs/guides/auth/social-login/auth-google; session type reference]. Email/password users could never connect. Every sign-up would show the scary restricted-scope screen |
| **Separate Connect step (chosen)** | Works for every user, asks only people who want it (Google's incremental-authorization guidance), and we hold the token ourselves. A prompt right after sign-up and a card on the dashboard both start it |

## 3. Data collected and kept

| Stored | Not stored |
| --- | --- |
| Encrypted refresh token (AES-256-GCM, key in server env) | Email bodies, subjects, attachments, full sender addresses |
| Gmail address, scope, connected/last-sync times | Access tokens (fetched fresh each run) |
| Per message: id, thread id, received time, sender **domain**, type, confidence, which application it updated | Anything about messages the filter dropped, except the id |
| The extracted application fields (below) | |

Disconnect revokes the token at Google, deletes the connection and the message ledger, and leaves the applications (the user's
own data). A separate "delete imported applications" option removes rows with `source = 'gmail'`.

Limited Use rules we follow [docs: API Services User Data Policy]: use only for the visible feature; no ads, no sale, no
transfer except to run the feature (Gemini paid tier, same purpose); no human reads mail except with the user's consent for
specific messages or for security; the privacy policy says all of this. Text below is added to `privacy.tsx`.

## 4. Fields extracted

Maps onto the existing `job_applications` table, plus four new columns.

| Field | Source in the email | Column |
| --- | --- | --- |
| Company | signature, sender display name, body | `company_name` |
| Role | subject, body | `position` |
| Status | classification (applied, interviewing, offered, rejected) | `status` |
| Application date | first confirmation email date | `application_date` |
| Interview or assessment date | body, calendar text | `interview_date` |
| Response date | date of the latest reply | `response_date` |
| Follow-up date | deadline text ("complete within 5 days") | `follow_up_date` |
| Location, remote | body | `location`, `remote_option` |
| Employment type | body | `employment_type` |
| Salary | body | `salary_range` |
| Job link, portal link | links in the body | `job_posting_url` |
| Recruiter name, email | signature, reply-to | `contact_person`, `contact_email` |
| Short summary | model | `notes` |
| Job board or ATS | sender domain | `source` (`gmail:greenhouse`, `gmail:linkedin`, ...) |
| **New** `gmail_thread_id` | thread id | groups every email about one application |
| **New** `status_history` (jsonb) | each change with date and message id | timeline |
| **New** `confidence` | model | 0 to 1 |
| **New** `needs_review` | confidence < 0.70 or ambiguous match | review badge |

## 5. Reference projects (read, not copied)

Licences are unknown or restrictive, so this is a fresh implementation that borrows ideas only.

| Project | Idea we take | Licence |
| --- | --- | --- |
| [Devashish-Pisal/job-application-tracker](https://github.com/Devashish-Pisal/job-application-tracker) | Gemini with a JSON response schema, temperature 0.1, confidence under 0.70 goes to manual review, RapidFuzz `token_set_ratio` merge with company ≥ 0.90 and role ≥ 0.85, status may not move backward, skip already-seen message ids, prefer `text/plain` body | not stated |
| [24thAbhinav/mail.trace](https://github.com/24thAbhinav/mail.trace) | Classify first and stop on non-job mail to save tokens, then extract, then persist; timeline per application; Gmail push needs a Pub/Sub watch that expires every 7 days, so we poll instead | not stated |
| [benjaminbelloeil/jobbear](https://github.com/benjaminbelloeil/jobbear) | Read-only access, status history, "ghosted" after 21 days, response-rate analytics (README says sync is still in progress) | AGPL-3.0, so no code reuse |
| [zichengalexzhao/job-app-tracker](https://github.com/zichengalexzhao/job-app-tracker) | Scheduled run (hourly), dedupe, Sankey of statuses | check repo |
| [Abdullahifrh/job-tracker](https://github.com/Abdullahifrh/job-tracker) | Skip ambiguous matches and log them instead of guessing | check repo |
| [johnson00111/gmail_job_app_tracker](https://github.com/johnson00111/gmail_job_app_tracker) | Local-model option for privacy | check repo |

## 6. Cost and limits

| Item | Number |
| --- | --- |
| Gemini lite input per email | about 1,500 tokens after the 6,000-character cap |
| Candidates after the filter, 30-day first sync | about 40 to 150 emails per user **[verify on real inboxes]** |
| Cost per first sync | well under one US cent with the lite model |
| Gmail API quota | per-user rate limits apply and `messages.get` costs 5 units **[verify the current numbers in the Gmail API usage-limits page]**; a sync is capped at 120 messages, far below any limit |
| Guards | max 120 messages and 60 AI calls per sync, one manual sync per 5 minutes, daily auto-sync only |
| Where it runs | Gmail + Gemini wait time is not CPU, but the work and the 10 ms Worker limit do not mix: sync runs on the VM like generation |

## 7. Security

- Refresh tokens encrypted with AES-256-GCM (Web Crypto) using `GMAIL_TOKEN_KEY`; a random IV per token; key never in git.
- OAuth `state` is an HMAC-signed blob with user id, nonce and 10-minute expiry; the callback rejects anything else.
- Email text is untrusted: the prompt tells the model to ignore instructions inside it, the output must match a strict schema,
  and the model has no tools, so a hostile email can at worst produce a wrong row (which lands in review).
- Every route verifies the Supabase token; the cron route needs `GMAIL_CRON_SECRET`.
- Revocation (user removes access in Google, `invalid_grant`) marks the connection `revoked` and shows a Reconnect button.

## 8. What Yatharth must do in Google Cloud (cannot be automated)

1. In the Google Cloud project that owns the OAuth client: enable **Gmail API**.
2. OAuth consent screen: add scope `https://www.googleapis.com/auth/gmail.readonly`, keep status **Testing**, add test users.
3. On the OAuth client add the redirect URI `https://agilepartners-ai.com/api/gmail/callback` (and `http://localhost:3000/api/gmail/callback`).
4. Set on the VM `ajsa.env`: `GMAIL_SYNC_ENABLED=1`, `GMAIL_TOKEN_KEY` (32 random bytes, base64), `GMAIL_STATE_SECRET`, `GMAIL_CRON_SECRET`,
   `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GEMINI_PAID_TIER=1`, `GMAIL_REDIRECT_URI`. Same on the Worker for the callback.
5. For public launch: privacy policy and homepage must describe the Gmail use, then submit for verification and the security assessment.

## 9. Test plan

Unit: crypto, state signing, query building, MIME parsing, prefilter, schema validation, merge and status order, sync with a fake Gmail
and fake model. Opt-in live: `GMAIL_LIVE=1` runs ten realistic fixture emails through the real Gemini key and checks the extracted fields.
Manual: connect with a test Google account that has job emails.

## 10. References

- Gmail scopes: https://developers.google.com/workspace/gmail/api/auth/scopes
- API Services User Data Policy (Limited Use): https://developers.google.com/terms/api-services-user-data-policy
- OAuth 2.0 token lifetimes: https://developers.google.com/identity/protocols/oauth2
- Gmail search operators: https://support.google.com/mail/answer/7190
- Search and filter with the API: https://developers.google.com/workspace/gmail/api/guides/filtering
- Supabase Google login and provider tokens: https://supabase.com/docs/guides/auth/social-login/auth-google
- Gemini API terms: https://ai.google.dev/gemini-api/terms


---

## 11. Implementation status (2026-10-10)

Built and tested; **switched off** until section 8 is done. Migration `004_gmail_sync.sql` is applied to the database (additive).

| Piece | File |
| --- | --- |
| Token encryption, signed OAuth state | `src/server/gmail/crypto.ts` |
| Google OAuth (connect, refresh, revoke), the on/off gate | `src/server/gmail/oauth.ts` |
| Gmail REST client, query, MIME parsing | `src/server/gmail/messages.ts` |
| Cheap pre-filter (ATS and job-board senders, alert and receipt rules) | `src/server/gmail/prefilter.ts` |
| Gemini extraction, JSON schema, injection-safe prompt | `src/server/gmail/extract.ts` |
| Fuzzy match, status order, field filling | `src/server/gmail/merge.ts` |
| One sync run, limits, error handling | `src/server/gmail/sync.ts` |
| Database access (allow-listed columns) | `src/server/db/gmailRepo.ts` |
| Routes | `src/pages/api/gmail/{status,connect,callback,sync,disconnect,sync-all}.ts` |
| Dashboard control, review badge | `src/components/dashboard/GmailSync.tsx`, `ApplicationsTable.tsx` |
| Daily trigger | `workers/keepalive/index.ts` (`triggerGmailSync`) |
| Privacy text | `src/pages/privacy-policy.tsx`, section 4a |

Results

| Check | Result |
| --- | --- |
| Offline unit tests (crypto, state, query, MIME, filter, extraction, merge, sync) | 70 passing |
| Real database: encrypted token, ledger, jsonb history, review flag, full sync with a fake Gmail | 5 of 5 |
| Real Gemini on ten fixture emails (application, interview, rejection, assessment, LinkedIn confirmation, offer, alert digest, receipt, prompt injection, status update) | 10 of 10 correct; the injection email produced no row |
| Whole repository | 399 tests passing, type check clean |
| Worker bundle with the new routes | 1.82 MiB of the 3 MiB free limit |

Not tested (needs a real Google account and the Google Cloud steps): the consent screen, the redirect, and a sync over a real inbox.
Accuracy on messy real mail is unmeasured; the first real sync will show how many rows land in review, and the filter and prompt should be tuned from that.
