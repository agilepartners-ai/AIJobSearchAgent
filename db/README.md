# Database (PostgreSQL on the shared VM)

Same Postgres server as Notera, **separate database and role** (`jobsearch` / `jobsearch_app`).
The app role cannot connect to `notera`, and Notera's role cannot connect to `jobsearch`
(verified in `docs/POSTGRES_SUPABASE_MIGRATION_PLAN.md` §3 and by the bootstrap test below).

```
db/init/00_create_jobsearch.sql   one-time bootstrap, run as the server admin
db/migrations/NNN_*.sql           schema, applied once each, checksummed
db/migrate.mjs                    migration runner (advisory-locked, transactional)
db/hardening/pg_hba.conf          lets Netlify in without exposing Notera's PHI database
```

## 1. Bootstrap (once, VM running)

Generate a password and keep it only in your password manager / Netlify env:

```bash
openssl rand -base64 36 | tr -d '/+=' | cut -c1-40
```

Run the bootstrap as `notera_admin` against the **`postgres`** maintenance database:

```bash
docker exec -i notera-postgres psql -U notera_admin -d postgres \
  -v app_password="'<generated password>'" < db/init/00_create_jobsearch.sql
```

Re-running is safe; it rotates the role password.

> Note: it runs `REVOKE CONNECT ON DATABASE notera FROM PUBLIC` and grants it back to `notera_admin`.
> Notera's compose connects as `notera_admin`, so nothing changes for it. If you ever add another
> Notera database role, `GRANT CONNECT ON DATABASE notera TO <role>`.

## 2. Create the schema

```bash
DATABASE_URL="postgres://jobsearch_app:<password>@<vm-host>:5432/jobsearch" PG_SSL_CA="$(cat ca.pem)" node db/migrate.mjs
# local test DB only: PGSSLMODE=disable
```

## 3. Publish 5432 safely (needed for Netlify)

Netlify has no fixed egress IPs, so an IP allow-list is not possible. Compensate with TLS + one role
+ one database + a firewall rate limit:

1. **TLS certificate** on the server (Let's Encrypt for a DNS name such as `db.agilepartners-ai.com`, or a
   private CA; with a private CA give the CA PEM to the app as `PG_SSL_CA`).
2. **`docker-compose.prod.yml`** (Notera): add `ports: ["5432:5432"]` to `postgres`, mount cert + key
   read-only, and add `-c ssl=on -c ssl_cert_file=… -c ssl_key_file=… -c ssl_min_protocol_version=TLSv1.3`
   (the key must be owned by uid 999 with mode 0600).
3. **`pg_hba.conf`** from `db/hardening/pg_hba.conf` (internet may only reach `jobsearch` as `jobsearch_app`
   over `hostssl`; Notera's database stays private).
4. **GCP firewall**: allow tcp:5432 from anywhere, nothing else new; keep Cloudflare/Caddy rules as they are.
   Optionally add a per-IP connection rate limit (`iptables -m hashlimit`) or `fail2ban` on the postgres log.
5. `ALTER ROLE jobsearch_app CONNECTION LIMIT 20` is already set by the bootstrap so a flood cannot starve Notera.
6. Verify from outside: `psql "postgresql://jobsearch_app@<host>/jobsearch?sslmode=verify-full"` works and
   `psql … -d notera` is refused.

## Environment (Netlify + local `.env.local`)

| Var | Meaning |
|---|---|
| `DATABASE_URL` | `postgres://jobsearch_app:<pw>@<host>:5432/jobsearch` |
| `PG_SSL_CA` | CA certificate PEM (newlines as `\n`) → certificate verified |
| `PGSSLMODE` | `disable` for a local Docker DB only |
| `PG_POOL_MAX` | per-instance pool size, default 2 |

## Local throwaway database for development / tests

```bash
docker run -d --name pgtest -e POSTGRES_PASSWORD=adm -e POSTGRES_DB=notera -p 55432:5432 postgres:18
docker exec -i -e PGPASSWORD=adm pgtest psql -U postgres -d postgres \
  -v app_password="'dev-pass'" < db/init/00_create_jobsearch.sql
DATABASE_URL=postgres://jobsearch_app:dev-pass@localhost:55432/jobsearch PGSSLMODE=disable node db/migrate.mjs
```

## Backups and recovery

Two independent layers, both set up on the VM:

| Layer | What | When | Kept | Where |
|---|---|---|---|---|
| Logical dumps | `pg_dump -Fc` of `notera` and `jobsearch`, plus roles | nightly 03:15 UTC (`pg-backup.timer`) | 7 days | `/var/backups/postgres` on the VM |
| Disk snapshots | whole boot disk, includes the Postgres data | daily 04:00 UTC (`notera-daily-snapshots`) | 7 days | Google Cloud, outside the VM |

Each dump is verified before it is kept (size check and `pg_restore --list`). The setup lives in
`db/backup/`; reinstall or update with `sudo bash install.sh` on the VM (it is idempotent).

Check it:

```bash
systemctl list-timers pg-backup.timer          # next run
journalctl -u pg-backup.service -n 20          # last run
sudo ls -la /var/backups/postgres              # the files
gcloud compute snapshots list --project medproject-506019
```

Restore one database from a dump (into a scratch database first if you are unsure):

```bash
sudo docker exec -i notera-postgres psql -U notera_admin -d postgres -c "CREATE DATABASE jobsearch_restored"
sudo docker exec -i notera-postgres pg_restore -U notera_admin -d jobsearch_restored --no-owner < /var/backups/postgres/jobsearch_<timestamp>.dump
```

Restore the whole machine: create a disk from a snapshot, then a VM from that disk.
A restore of both databases from the nightly dumps was tested: every table and row count matched.
