# Sign-in: how it works and how to run it

Accounts, passwords and sessions live in the `jobsearch` PostgreSQL on the VM (schema `app`, migration `008_auth.sql`). Nothing about
sign-in depends on a hosted provider. If the VM is up, sign-in works.

## Where things run

| Piece | Where | Does |
| --- | --- | --- |
| `/api/auth/*` | **VM** (`ajsa-generate` container) | sign-up, login, refresh, logout, reset, Google, mail. All password and token logic. |
| Worker (`ajsa-web`) | Cloudflare | forwards `/api/auth/*` to the VM through the tunnel (`gen.agilepartners-ai.com`); checks access tokens locally with the **public** key only |
| Database | VM, `notera-postgres` container, database `jobsearch` | `app.auth_users`, `auth_sessions`, `auth_tokens`, `auth_identities`, `auth_rate`, `auth_events` |

## Tokens

- **Access token**: ES256 JWT, 15 minutes, held in browser memory only. Claims: `sub` (user id), `email`, `email_verified`, `sid`.
- **Refresh token**: 32 random bytes in cookie `ajsa_rt` (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/api/auth`). Only its SHA-256 is stored.
  It rotates on every use. Reusing an old one (after a 10-second grace for two tabs) revokes that whole session, on the assumption it was stolen.
  Lifetime 30 days, hard cap 90 days.
- Passwords: scrypt (N=2^15, r=8, p=3), 8 to 128 characters, common-password list, not equal to the email. Hashes upgrade on login if parameters change.

## Rules worth knowing

- **No account exists until the emailed link is used.** Sign-up stores a pending registration for 24 hours. A newer sign-up for the same address replaces the older link.
- **Same answer for known and unknown emails** on sign-up, forgot password and login (a dummy hash keeps timing equal).
- **Accounts from before the move** are re-linked by email: when the owner of an address proves the mailbox (sign-up link, reset link, or Google), the new account takes the id already used in `app.profiles`, so résumés and applications stay attached.
- **Rate limits** (table `auth_rate`): login 40 per IP and 10 per email per 15 minutes; sign-up 10 per IP and 4 per email per hour; forgot 20 per IP and 5 per email per hour.
- **CSRF**: `Origin` must be this site. Cookie endpoints (`refresh`, `logout`) also need header `X-Requested-With: ajsa`.
- **Client IP**: the Worker sends `x-ajsa-edge` (= `EDGE_SHARED_SECRET`) and `x-ajsa-client-ip`. The VM trusts that IP only when the secret matches.
- Audit trail: `select * from app.auth_events order by id desc limit 50` (no passwords or tokens are ever written there).

## Configuration

| Variable | Where | Notes |
| --- | --- | --- |
| `AUTH_JWT_PRIVATE_KEY` | VM `ajsa.env` only | PEM, newlines as `\n` |
| `AUTH_JWT_PUBLIC_KEY` | VM `ajsa.env` and `wrangler.jsonc` `vars` | public by design |
| `AUTH_JWT_PREVIOUS_PUBLIC_KEY` | both, optional | during key rotation |
| `EDGE_SHARED_SECRET` | VM `ajsa.env` and Worker secret | `wrangler secret put EDGE_SHARED_SECRET` |
| `AUTH_ISSUER`, `NEXT_PUBLIC_SITE_URL` | VM `ajsa.env` | `https://agilepartners-ai.com` (the token issuer must equal the Worker's `NEXT_PUBLIC_SITE_URL`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | VM `ajsa.env` | needed for sign-up and "forgot password" |
| `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET` | VM `ajsa.env` | optional; redirect URI `https://agilepartners-ai.com/api/auth/google/callback` |

`GET /api/auth/config` reports `{"email":…,"google":…}`; the screens hide Google and pause sign-up when those are false.

## Runbook

**Owner cannot get in (or email is not set up yet)**: print a one-hour reset link on the VM, open it yourself and choose a password. Do not paste the link anywhere.
```bash
# from a machine with gcloud; the script is sent base64-encoded because plink eats the first character of stdin
B=$(base64 -w0 scripts/auth-admin.mjs)
gcloud compute ssh notera-app --tunnel-through-iap --zone us-central1-a --project medproject-506019 \
  --command "echo $B | base64 -d | sudo docker exec -i ajsa-generate node --input-type=module - reset-link you@example.com"
```

**New key pair** (`node scripts/auth-admin.mjs keygen <file>` writes `AUTH_JWT_*` and an `EDGE_SHARED_SECRET`, prints only the public key).
Rotation without logging anyone out: put the old public key in `AUTH_JWT_PREVIOUS_PUBLIC_KEY` on both sides, switch the private and public key,
and remove the old one after 15 minutes (the access-token lifetime).

**Deploy the VM service**: `docker build -f deploy/vm/Dockerfile -t ajsa-generate:new .`, `docker save | gzip` to a file, `gcloud compute scp` it
(piping binary through `gcloud compute ssh` corrupts it), `gunzip -c | docker load` on the VM, `docker tag ajsa-generate:latest ajsa-generate:prev`
then `docker tag ajsa-generate:new ajsa-generate:latest`, and recreate only this service with `docker compose … up -d --no-deps ajsa-generate`.
Rollback: `docker tag ajsa-generate:prev ajsa-generate:latest` and the same compose command.

**Deploy the Worker**: build in WSL (`opennextjs-cloudflare build`), copy `.open-next` back with `cp -rL`, then `wrangler deploy`
(set `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` to any postgres URL, it is only used for local emulation).

**Check it is healthy**: `curl https://agilepartners-ai.com/api/auth/config`. The `ajsa-keepalive` Worker calls the same URL daily and fails visibly if the VM path is down.

## JobWing desktop app (same account)

The Windows app signs up and signs in through the same routes as the website. It sends `X-Requested-With: ajsa` and no `Origin` header, keeps the
`ajsa_rt` refresh cookie encrypted with Windows DPAPI, and holds the 15-minute access token in memory. A website sign-up and an app sign-up are the same
row in `app.auth_users`. The plugin's old `jwk_` link code still works for the plugin on its own (`userForBearer` accepts either).

Data it sends goes to the `jw` schema (migration `009_jobwing_tenant.sql`):

- **Isolation.** Every table has `user_id` and `FORCE ROW LEVEL SECURITY`. `withTenant(userId, fn)` sets `jw.user_id` for one transaction, so a query that forgets
  its `WHERE` still sees only that user's rows. The owner view sets `jw.admin = 'on'`, which only adds a read policy: it cannot write across users.
- **Consent first.** `PUT /api/jobwing/v2/consent {activityLog}`; `POST /api/jobwing/v2/ingest` stores nothing until it is `true`. Turning it off deletes the user's
  activity, runs and daily rows. `GET/DELETE /api/jobwing/v2/mine` shows and deletes everything held.
- **Allow-list intake** (`parseIngest`): unknown fields are refused, names and codes are restricted to a safe character set (no emails, links or paths), sizes are capped.
- **Retention.** Activity is partitioned by month; whole months older than 90 days are dropped (`purgeExpiredActivity`, at most every six hours per process, triggered by ingest).
- **Owner page.** `/admin/jobwing` reads `GET /api/admin/jobwing`, which requires the caller's email in `ADMIN_EMAILS` **and verified**. An owner account created
  without email verification (`AUTH_SIGNUP_WITHOUT_EMAIL=1`) must be verified, or the page answers 403.

Applying the migration on the VM (the jobsearch database only; take a dump first):
```bash
sudo docker exec notera-postgres pg_dump -U jobsearch_app -d jobsearch -Fc > ~/backups/jobsearch-before-009.dump
# then the migration file plus its row in app.schema_migrations, in one transaction
sudo docker exec -i notera-postgres psql -U jobsearch_app -d jobsearch -v ON_ERROR_STOP=1 --single-transaction < apply.sql
```

## Not built (decide later)

Two-factor sign-in (authenticator app or passkeys), account deletion from the dashboard, and email-address change.
