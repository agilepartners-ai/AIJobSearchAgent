-- ─────────────────────────────────────────────────────────────────────────────
-- AIJobSearchAgent — one-time bootstrap on the shared VM Postgres server.
-- Run ONCE as the server admin (notera_admin), connected to the `postgres`
-- maintenance database, NOT to `notera`:
--
--   psql "postgres://notera_admin@<host>:5432/postgres" \
--        -v app_password="'<generated password>'" -f db/init/00_create_jobsearch.sql
--
-- Creates an isolated role + database. The application role cannot see Notera's
-- PHI database and Notera's roles cannot see this one.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on

SELECT format('CREATE ROLE jobsearch_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE CONNECTION LIMIT 20', :app_password)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'jobsearch_app') \gexec

-- Re-running with a new password rotates it.
SELECT format('ALTER ROLE jobsearch_app PASSWORD %L', :app_password) \gexec

SELECT 'CREATE DATABASE jobsearch OWNER jobsearch_app ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'jobsearch') \gexec

-- Hard isolation: nobody but owner/superuser connects to jobsearch, and the
-- app role can never connect to Notera's database.
REVOKE ALL ON DATABASE jobsearch FROM PUBLIC;
GRANT CONNECT ON DATABASE jobsearch TO jobsearch_app;
-- Postgres grants CONNECT to PUBLIC by default, so revoking from one role is not enough.
-- The owner (notera_admin) and superusers keep access; the Notera app connects as the owner.
REVOKE CONNECT ON DATABASE notera FROM PUBLIC;
GRANT  CONNECT ON DATABASE notera TO notera_admin;

-- Bounded blast radius on a box shared with Notera.
ALTER ROLE jobsearch_app SET statement_timeout = '30s';
ALTER ROLE jobsearch_app SET idle_in_transaction_session_timeout = '15s';
ALTER ROLE jobsearch_app SET lock_timeout = '10s';

\connect jobsearch
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive email
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO jobsearch_app;   -- extension types (citext) live here
