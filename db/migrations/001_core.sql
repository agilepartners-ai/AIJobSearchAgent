-- Core application schema. Every row is owned by `user_id` = the Supabase Auth user id (uuid).
-- Supabase lives elsewhere, so there is deliberately no FK to it; account deletion is app-level.

CREATE SCHEMA IF NOT EXISTS app;
SET search_path = app, public;

CREATE OR REPLACE FUNCTION app.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ── profiles ────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  user_id     uuid PRIMARY KEY,
  email       citext,
  full_name   text NOT NULL DEFAULT '',
  phone       text NOT NULL DEFAULT '',
  extras      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER profiles_touch BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- ── job preferences ─────────────────────────────────────────────────────────
CREATE TABLE job_preferences (
  user_id      uuid PRIMARY KEY,
  preferences  jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER job_preferences_touch BEFORE UPDATE ON job_preferences FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- ── stored files (PDF, .tex, uploads) — replaces object storage ─────────────
CREATE TABLE documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('resume_pdf','resume_tex','cover_letter_pdf','cover_letter_tex','upload')),
  filename    text NOT NULL,
  mime        text NOT NULL,
  size_bytes  integer NOT NULL CHECK (size_bytes >= 0 AND size_bytes <= 10485760),
  sha256      text NOT NULL,
  data        bytea NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX documents_user_idx ON documents (user_id, created_at DESC);
-- Identical content per user is stored once.
CREATE UNIQUE INDEX documents_user_sha_kind_uq ON documents (user_id, kind, sha256);

-- ── résumés (Studio documents) ──────────────────────────────────────────────
CREATE TABLE resumes (
  id             text NOT NULL,
  user_id        uuid NOT NULL,
  title          text NOT NULL DEFAULT '',
  template       text NOT NULL DEFAULT '',
  document       jsonb NOT NULL,
  ai             jsonb,
  generation_id  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
CREATE INDEX resumes_user_updated_idx ON resumes (user_id, updated_at DESC);
-- One résumé per generation request: the idempotency / reload-recovery key.
CREATE UNIQUE INDEX resumes_generation_uq ON resumes (user_id, generation_id) WHERE generation_id IS NOT NULL;
CREATE TRIGGER resumes_touch BEFORE UPDATE ON resumes FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- ── job applications ────────────────────────────────────────────────────────
CREATE TABLE job_applications (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL,
  company_name         text NOT NULL,
  position             text NOT NULL,
  status               text NOT NULL DEFAULT 'not_applied'
                       CHECK (status IN ('not_applied','applied','interviewing','offered','rejected','withdrawn')),
  application_date     date,
  location             text,
  job_posting_url      text,
  job_description      text,
  notes                text,
  salary_range         text,
  employment_type      text,
  remote_option        boolean,
  contact_person       text,
  contact_email        text,
  interview_date       date,
  response_date        date,
  follow_up_date       date,
  priority             smallint NOT NULL DEFAULT 1,
  source               text,
  resume_doc_id        uuid REFERENCES documents(id) ON DELETE SET NULL,
  cover_letter_doc_id  uuid REFERENCES documents(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_applications_user_idx ON job_applications (user_id, application_date DESC NULLS LAST, created_at DESC);
CREATE TRIGGER job_applications_touch BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- ── per-account RAG ─────────────────────────────────────────────────────────
CREATE TABLE rag_sources (
  user_id       uuid NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('resume','job_description')),
  id            text NOT NULL,
  content_hash  text NOT NULL,
  model         text NOT NULL,
  chunks        jsonb NOT NULL,
  vectors       bytea NOT NULL,           -- int8-quantised, as written by server/rag/vector.ts
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, id)
);

-- ── usage and daily limits ──────────────────────────────────────────────────
CREATE TABLE usage_daily (
  user_id        uuid NOT NULL,
  day            date NOT NULL,
  generations    integer NOT NULL DEFAULT 0,
  input_tokens   bigint  NOT NULL DEFAULT 0,
  output_tokens  bigint  NOT NULL DEFAULT 0,
  embed_tokens   bigint  NOT NULL DEFAULT 0,
  by_model       jsonb   NOT NULL DEFAULT '{}'::jsonb,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
CREATE TABLE usage_system_daily (
  day            date PRIMARY KEY,
  generations    integer NOT NULL DEFAULT 0,
  input_tokens   bigint  NOT NULL DEFAULT 0,
  output_tokens  bigint  NOT NULL DEFAULT 0,
  embed_tokens   bigint  NOT NULL DEFAULT 0,
  by_model       jsonb   NOT NULL DEFAULT '{}'::jsonb
);

-- ── generation idempotency ──────────────────────────────────────────────────
CREATE TABLE generation_requests (
  user_id     uuid NOT NULL,
  request_id  text NOT NULL,
  status      text NOT NULL CHECK (status IN ('running','succeeded','failed')),
  result      jsonb,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, request_id)
);
CREATE INDEX generation_requests_created_idx ON generation_requests (created_at);
CREATE TRIGGER generation_requests_touch BEFORE UPDATE ON generation_requests FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
