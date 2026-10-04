-- Align the schema with what the application actually stores (the shapes the app code reads and writes).
SET search_path = app, public;

-- ── job applications ────────────────────────────────────────────────────────
-- The UI writes ISO strings of varying precision; text keeps them exactly as sent and sorts correctly.
ALTER TABLE job_applications
  ALTER COLUMN application_date TYPE text USING application_date::text,
  ALTER COLUMN interview_date   TYPE text USING interview_date::text,
  ALTER COLUMN response_date    TYPE text USING response_date::text,
  ALTER COLUMN follow_up_date   TYPE text USING follow_up_date::text;

ALTER TABLE job_applications DROP CONSTRAINT job_applications_status_check;
ALTER TABLE job_applications ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('not_applied','applied','interviewing','offered','rejected','accepted','declined'));

ALTER TABLE job_applications
  DROP COLUMN resume_doc_id,
  DROP COLUMN cover_letter_doc_id,
  ADD COLUMN resume_url             text,
  ADD COLUMN cover_letter_url       text,
  -- Paths never expire (signed URLs do); /api/documents/url re-signs from them.
  ADD COLUMN resume_path            text,
  ADD COLUMN cover_letter_path      text,
  ADD COLUMN resume_tex_path        text,
  ADD COLUMN cover_letter_tex_path  text,
  ADD COLUMN generated_with         text,
  ADD COLUMN generated_at           timestamptz;

-- ── stored files: addressed by a per-user path, overwritten in place on regenerate ──
DROP INDEX documents_user_sha_kind_uq;
ALTER TABLE documents ADD COLUMN path text;
UPDATE documents SET path = id::text WHERE path IS NULL;
ALTER TABLE documents ALTER COLUMN path SET NOT NULL;
ALTER TABLE documents DROP CONSTRAINT documents_kind_check;
ALTER TABLE documents DROP COLUMN kind;
CREATE UNIQUE INDEX documents_user_path_uq ON documents (user_id, path);

-- ── RAG sources: one row per source, chunks (text + int8 vector) in jsonb ───
ALTER TABLE rag_sources DROP CONSTRAINT rag_sources_kind_check;
ALTER TABLE rag_sources ADD CONSTRAINT rag_sources_kind_check CHECK (kind IN ('resume','job'));
ALTER TABLE rag_sources
  ALTER COLUMN content_hash DROP NOT NULL,
  ALTER COLUMN vectors      DROP NOT NULL,
  ADD COLUMN label       text   NOT NULL DEFAULT '',
  ADD COLUMN created_ms  bigint NOT NULL DEFAULT 0;
CREATE INDEX rag_sources_recent_idx ON rag_sources (user_id, kind, created_ms DESC);

-- ── usage ───────────────────────────────────────────────────────────────────
ALTER TABLE usage_daily RENAME COLUMN input_tokens TO prompt_tokens;
ALTER TABLE usage_daily
  ADD COLUMN llm_calls         integer       NOT NULL DEFAULT 0,
  ADD COLUMN cached_tokens     bigint        NOT NULL DEFAULT 0,
  ADD COLUMN cost_usd          numeric(14,6) NOT NULL DEFAULT 0,
  ADD COLUMN rag_generations   integer       NOT NULL DEFAULT 0,
  ADD COLUMN rag_chars_saved   bigint        NOT NULL DEFAULT 0;

ALTER TABLE usage_system_daily RENAME COLUMN input_tokens TO prompt_tokens;
ALTER TABLE usage_system_daily
  ADD COLUMN llm_calls         integer       NOT NULL DEFAULT 0,
  ADD COLUMN cached_tokens     bigint        NOT NULL DEFAULT 0,
  ADD COLUMN cost_usd          numeric(14,6) NOT NULL DEFAULT 0,
  ADD COLUMN rag_generations   integer       NOT NULL DEFAULT 0,
  ADD COLUMN rag_chars_saved   bigint        NOT NULL DEFAULT 0;

-- ── résumés: the whole document (including the AI block) lives in `document` ──
ALTER TABLE resumes DROP COLUMN ai;
