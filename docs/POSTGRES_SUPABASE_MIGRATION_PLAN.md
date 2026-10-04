# Firebase → Postgres (VM) + Supabase Auth — migration plan

Status: **Phase 1 (database) built and tested locally; Phases 2-5 pending.** Decisions taken: publish 5432 with hardening (A), files as `bytea`, start clean (no Firebase data migration). Written after reading the Notera project
(`D:\Current Projects\Notera-Health-Ai`) and inventorying this repo's Firebase surface.

## 1. What exists today

### Notera's database (the one on the VM)
- PostgreSQL 18 in Docker (`db/docker-compose.postgres.yml` locally, `docker-compose.prod.yml` on the VM).
- One database `notera`, owner `notera_admin`. Schemas: `auth` (clinician logins, audit log), `clinical`,
  `lab`, `ops`, `upgrader`. Extensions already used: `citext`, `pgcrypto`.
- **Production publishes no host port** — Postgres is reachable only on the private compose network. Caddy
  (TLS) fronts the Notera backend only. Netlify functions cannot reach the database as deployed.
- Nightly `pg_dump -Fc` sidecar, 7-day retention. No `pgvector` (stock `postgres:18`).
- The data is **health data** (PHI, HIPAA posture in `DEPLOYMENT_GCP_VERCEL.md`).

### This repo's Firebase surface (48 files, 256 references)
| Concern | Today | Files |
|---|---|---|
| Auth | Firebase Auth (email/password) via `FirebaseAuthProvider` | `src/lib/firebase.ts`, `src/services/auth/*`, `authService.ts`, `hooks/useAuth.ts`, `config/authConfig.ts` |
| Profile | Firestore `users/{uid}` | `firebaseProfileService.ts`, `profileService.ts` |
| Job applications | Firestore `users/{uid}/jobApplications` | `firebaseJobApplicationService.ts`, `DashboardMain.tsx`, `api/documents/*` |
| Job preferences | Firestore | `firebaseJobPreferencesService.ts`, `jobPreferencesService.ts` |
| Résumés (Studio) | Firestore `users/{uid}/resumes` (client SDK + admin) | `services/resumeService.ts`, `server/resumes/saveGenerated.ts` |
| RAG store | Firestore `users/{uid}/rag_*` (int8 vectors) | `server/rag/store.ts` |
| Usage / limits | Firestore `users/{uid}/usage/{day}`, `system/usage_{day}` | `server/ai/usageLedger.ts`, `limiter.ts`, `server/firebase/usage.ts` |
| Files (PDF, .tex, uploads) | Firebase Storage + signed URLs | `server/firebase/storage.ts`, `firebaseStorageService.ts`, `api/documents/url.ts` |
| Server token check | `firebase-admin` `verifyIdToken` | `server/firebase/admin.ts`, every `api/**` route |
| Analytics | Firebase Analytics | `lib/firebase.ts` |
| Deploy config | Firebase env vars, Cloud Run Dockerfile build args | `.env.example`, `ci-cd-cloudrun/*`, `netlify.toml` |

`@supabase/ssr` is already a dependency (unused for DB).

## 2. Target architecture

```
Browser ── Supabase Auth (Google OAuth + email) ──► JWT (access token)
   │
   └─ fetch /api/** with  Authorization: Bearer <JWT>
          │
   Netlify function ── verify JWT (jose + Supabase JWKS, no Supabase DB) ──► user_id (uuid)
          │
          └─ pg Pool (TLS, tiny pool) ──► VM Postgres  database `jobsearch`
```

- **Supabase is auth only.** No Supabase tables, no RLS, no Supabase Storage unless chosen below.
- **All data access moves server-side.** Today the browser talks to Firestore directly (`resumeService`,
  profile, applications). With Postgres there is no browser-safe connection, so every read/write goes
  through an `/api/**` route that authenticates and scopes by `user_id`. This is also a security
  upgrade: authorisation is one place in code, not Firestore rules.
- Firebase is removed completely: packages, env vars, `.firebaserc`-style files, docs, Cloud Run build args,
  file/folder names (`firebase*Service.ts` → `*Repo.ts`), Analytics.

## 3. Database design — same server, isolated database

**Do not put this in Notera's `notera` database.** It holds PHI under a different compliance scope; a
shared database means shared backups, shared audit scope, and a bug here could touch clinical tables.
Same VM and same Postgres server, but:

```sql
CREATE ROLE jobsearch_app LOGIN PASSWORD '…' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE DATABASE jobsearch OWNER jobsearch_app;
REVOKE ALL ON DATABASE jobsearch FROM PUBLIC;   -- and notera DB: REVOKE CONNECT from jobsearch_app
```

Run once by `notera_admin`. `jobsearch_app` cannot see `notera`; Notera roles cannot see `jobsearch`.
One extra line in the backup sidecar (`pg_dump -d jobsearch`) covers backups.

Schema `app` (migrations tracked in `app.schema_migrations`, plain SQL files in `db/migrations/NNN_*.sql`,
a ~60-line node runner — same pattern Notera already uses, no ORM):

| Table | Key columns | Replaces |
|---|---|---|
| `profiles` | `user_id uuid PK`, email, full_name, phone, extras jsonb, timestamps | `users/{uid}` |
| `job_preferences` | `user_id PK`, preferences jsonb | Firestore prefs |
| `job_applications` | `id uuid PK`, `user_id`, company_name, position, status (CHECK), dates, urls, notes, `resume_doc_id`, `cover_letter_doc_id`, `created_at/updated_at` | `jobApplications` |
| `resumes` | `id`, `user_id`, `document jsonb`, `template`, `generation_id` (unique per user), `ai jsonb`, `updated_at` | `resumes` |
| `rag_sources` | `(user_id, kind, id)` PK, `content_hash`, `chunks jsonb`, `vectors bytea` | `rag_*` |
| `usage_daily` | `(user_id, day)` PK, counters + token columns | `usage/{day}` |
| `usage_system_daily` | `day` PK, totals | `system/usage_{day}` |
| `generation_requests` | `(user_id, request_id)` PK, status, result ref | idempotency records |
| `documents` | `id`, `user_id`, `kind` (resume_pdf/tex/cover_pdf/upload), `mime`, `size`, `sha256`, `data bytea` | Firebase Storage objects |

Principles: every table keyed by `user_id uuid` (Supabase `sub`), FK-less to Supabase (it lives elsewhere);
`ON DELETE` handled by an app-level "delete my account" routine; indexes on `(user_id, updated_at DESC)`;
`updated_at` triggers; jsonb only for genuinely document-shaped data (résumé, preferences).
Vectors stay int8 `bytea` — the per-user set is small, no `pgvector` needed (and stock `postgres:18` lacks it).

## 4. Phases (you asked for DB first, then auth)

**Phase 1 — Database (no app behaviour change)**
1. `db/` folder: `init/00_create_jobsearch.sql` (role + database, run by admin), `migrations/001…`, `migrate.mjs`.
2. `src/server/db/pool.ts` (lazy `pg` Pool, `max: 2` for serverless, TLS from env, statement timeout),
   `src/server/db/*Repo.ts` (profiles, applications, preferences, resumes, rag, usage, documents).
3. Tests against a throwaway Postgres (Docker) — repos + migration idempotency.
4. `scripts/check-env.mjs`: add DB connectivity check.
Deliverable: database live on the VM with schema, repos passing tests. Needs the VM on.

**Phase 2 — Auth (Supabase)**
1. `src/lib/supabase/{client,server}.ts` (`@supabase/ssr`), Google OAuth + email, callback route.
2. `server/auth/verify.ts` (JWKS verify) replaces `verifyIdToken` in every API route.
3. Replace `FirebaseAuthProvider` with `SupabaseAuthProvider` behind the existing `AuthProvider` interface,
   so the UI barely changes. `useAuth` updated.
4. Profile row created on first sign-in (server-side upsert).

**Phase 3 — Data layer swap**
1. New `/api/**` routes: profile, applications (CRUD), preferences, resumes (list/get/save/delete),
   documents (get file, authenticated stream — replaces signed URLs).
2. Rewrite client services to `fetch` those routes; `server/**` (RAG, usage, saveGenerated, generate)
   switch from Firestore/Storage to repos.
3. Keep the idempotency + recovery behaviour intact (same request-id semantics, now a SQL upsert).

**Phase 4 — Remove Firebase**
Delete `firebase`, `firebase-admin`, `@google-cloud/*` leftovers, `src/lib/firebase.ts`, `server/firebase/*`,
renamed services, env vars, docs, Cloud Run build args; grep gate in CI: zero `firebase` matches.

**Phase 5 — Deploy (Netlify)**
Env on Netlify: `DATABASE_URL`, `PG_SSL_CA`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_JWT_SECRET`/JWKS URL. Remove stale `/* → /index.html` redirect from `netlify.toml`.
Verify with a staged deploy preview before the domain switch.

## 5. Risks and open decisions

1. **Reachability (blocking for production).** Netlify functions have no static IPs, so an IP allow-list is
   impossible and the VM's Postgres is currently unpublished. Options:
   - **A. Publish 5432 on the VM with hardening** — TLS (`ssl=on`, verify-full from the app), SCRAM only,
     `pg_hba.conf` allowing only `jobsearch_app` on `jobsearch` from `0.0.0.0/0` over `hostssl`, firewall,
     fail2ban/connection limits, strong generated password. Simple; internet-exposed DB port.
   - **B. Thin HTTPS data gateway on the VM** behind the existing Caddy, DB stays private. Safer, more code
     and one more service to run.
   - **C. Host the Next app on the VM too** (Caddy + Node, DB private) and drop Netlify.
2. **File storage.** Recommended: PDFs/`.tex` as `bytea` in Postgres (small, one backup, no extra infra),
   served through an authenticated route. Alternatives: Supabase Storage (extra vendor surface), MinIO on VM.
3. **Existing Firebase data/users.** If production already has users: export Firestore + Auth, import users into
   Supabase (Firebase scrypt hashes are importable so passwords survive), build a `firebase_uid → supabase_uid`
   map by email, and re-key rows. If it is test data only, skip and start clean.
4. **Co-tenancy blast radius.** Even with a separate database, a shared server shares CPU/RAM/disk. Set
   `ALTER ROLE jobsearch_app CONNECTION LIMIT 20`, and watch the small VM's memory (Notera runs ASR/LLM calls).
5. **Serverless connections.** Each Netlify function instance opens its own pool; keep `max: 2`, short idle
   timeout, and consider PgBouncer if concurrency grows.
6. **Secrets hygiene.** Notera's `.env`/`.env.production` contain live credentials (DB, SMTP, SA key JSON in
   the repo folder). They stay in Notera; this repo gets only its own `jobsearch_app` credentials.

## 6. What I need from you
- Answers to the decisions in §5 (1–3).
- When ready for Phase 1: the VM running, and either SSH access or the ability to run one SQL file as
  `notera_admin` (I will hand you the exact command).
