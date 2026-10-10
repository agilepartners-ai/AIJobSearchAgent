-- Gmail job sync (docs/GMAIL_JOB_SYNC_SCOPE.md). Stores an encrypted refresh token and a per-message ledger.
-- Email bodies, subjects and full sender addresses are never stored.
SET search_path = app, public;

CREATE TABLE gmail_connections (
  user_id            uuid PRIMARY KEY,
  google_email       citext NOT NULL,
  scope              text NOT NULL,
  -- "v1.<iv>.<ciphertext>" AES-256-GCM, key from GMAIL_TOKEN_KEY (see src/server/gmail/crypto.ts)
  refresh_token_enc  text NOT NULL,
  status             text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','error')),
  connected_at       timestamptz NOT NULL DEFAULT now(),
  last_sync_at       timestamptz,
  last_sync_summary  jsonb,
  last_error         text,
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER gmail_connections_touch BEFORE UPDATE ON gmail_connections FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- One row per Gmail message we looked at, so nothing is processed twice. No content.
CREATE TABLE gmail_messages (
  user_id         uuid NOT NULL,
  message_id      text NOT NULL,
  thread_id       text NOT NULL,
  received_at     timestamptz NOT NULL,
  sender_domain   text,
  outcome         text NOT NULL CHECK (outcome IN ('skipped','not_job','job','low_confidence','error')),
  email_type      text,
  confidence      real,
  application_id  uuid REFERENCES job_applications(id) ON DELETE SET NULL,
  processed_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, message_id)
);
CREATE INDEX gmail_messages_thread_idx ON gmail_messages (user_id, thread_id);
CREATE INDEX gmail_messages_recent_idx ON gmail_messages (user_id, received_at DESC);

ALTER TABLE job_applications
  ADD COLUMN gmail_thread_id text,
  ADD COLUMN status_history  jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN confidence      real,
  ADD COLUMN needs_review    boolean NOT NULL DEFAULT false;
CREATE INDEX job_applications_gmail_thread_idx ON job_applications (user_id, gmail_thread_id) WHERE gmail_thread_id IS NOT NULL;
CREATE INDEX job_applications_review_idx ON job_applications (user_id) WHERE needs_review;
