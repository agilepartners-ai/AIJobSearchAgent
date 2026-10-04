# Data and authentication architecture

```
Browser ── Supabase Auth (email + Google) ──► access token (JWT, ES256)
   │
   └─ fetch /api/**   Authorization: Bearer <token>
          │
   Next.js API route ── verify token against Supabase's public keys ──► user id (uuid)
          │
          └─ pg pool (TLS, certificate verified, 2 connections) ──► PostgreSQL, database `jobsearch`
```

- **Supabase is authentication only.** Sign-in, Google OAuth, password reset and confirmation emails.
  No application data is stored there, and the app never holds a Supabase secret: tokens are verified
  with the project's published public keys (`/auth/v1/.well-known/jwks.json`), so the server needs only
  `NEXT_PUBLIC_SUPABASE_URL`.
- **All application data is in one PostgreSQL database** on our own server. The browser never talks to
  it. Every read and write goes through an `/api` route, which takes the user id from the verified
  token (never from the request) and puts it in every query's `WHERE` clause.
- **The database is isolated.** It is a separate database and login role on a shared server; that
  role can connect to nothing else, and nothing else can connect to it. Internet access is TLS-only,
  one role, one database (`db/hardening/pg_hba.conf`).

## Tables (`app` schema, migrations in `db/migrations`)

| Table | Holds | Key |
|---|---|---|
| `profiles` | email, name, phone, free-form profile fields (`extras`), the detailed profile form | `user_id` |
| `job_preferences` | job-search preferences (jsonb) | `user_id` |
| `job_applications` | the tracker, plus links to generated documents | `id`, scoped by `user_id` |
| `resumes` | Résumé Studio documents (whole document as jsonb, with the AI analysis) | `(user_id, id)`; `generation_id` unique per user |
| `documents` | generated PDF and LaTeX files (`bytea`), addressed by path | `(user_id, path)` |
| `rag_sources` | per-account memory: text chunks and int8 vectors (jsonb) | `(user_id, kind, id)` |
| `usage_daily`, `usage_system_daily` | daily generation count, token and cost totals | `(user_id, day)`, `day` |
| `schema_migrations` | applied migrations with checksums | `name` |

## Request rules

| Concern | How |
|---|---|
| Identity | `server/auth/verify.ts`: issuer, audience, expiry and subject are enforced; a missing or bad token is a 401 |
| Daily limit (5, admins exempt) | `server/db/usage.ts`: one conditional upsert, so concurrent requests cannot both pass at 4/5; refunded if generation fails. Admins are the verified emails in `ADMIN_EMAILS` (`server/auth/admin.ts`) |
| Idempotent generation | the browser's request id is stored as `resumes.generation_id`; a retry returns the same résumé with no second model call or charge |
| Files | stored in Postgres; served by `/api/documents/file` through HMAC-signed, expiring links (`DOCUMENT_SIGNING_SECRET`) that work in an `<iframe>`; `/api/documents/url` re-signs a stored path for its owner |
| Ownership | a path or id that belongs to another user simply does not exist for the caller |

## API

| Route | Methods |
|---|---|
| `/api/profile` | GET (creates on first call), PUT (merge) |
| `/api/applications`, `/api/applications/[id]` | list, create · get, patch, delete |
| `/api/resumes`, `/api/resumes/[id]` | list, find by generation · get, put, delete |
| `/api/preferences` | get, put, delete |
| `/api/interview`, `/api/interview/[id]` | start (5 per account per day) · end an AI mock-interview conversation; the Tavus key stays on the server |
| `/api/health` | `?db=1` also proves the database path; used by uptime checks |
| `/api/documents/generate`, `compile`, `url`, `file` | generate résumé and cover letter · recompile LaTeX · re-sign a link · serve a file |

## Operating it

- Bootstrap, hardening and migrations: [db/README.md](../db/README.md).
- Environment and verification: [SETUP.md](./SETUP.md), `pnpm check:env`.
- Backups: the database is backed up with the rest of the server's databases (nightly `pg_dump`).
