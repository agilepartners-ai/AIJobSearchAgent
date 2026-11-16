-- JobWing (the Claude Code job-search plugin) links to a user's account with a personal link code.
-- Only the SHA-256 hash of the code is stored, so a database leak does not expose working codes.
-- The plugin pushes the jobs it tracks into job_applications (keyed by external_key, so a re-sync updates instead of duplicating)
-- and reads back any status the user changed here.
SET search_path = app, public;

CREATE TABLE jobwing_links (
  user_id      uuid PRIMARY KEY,
  token_hash   text NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  -- a leaked code can write at most this many rows a day
  day_date     date,
  day_count    integer NOT NULL DEFAULT 0
);

ALTER TABLE job_applications ADD COLUMN external_key text;
CREATE UNIQUE INDEX job_applications_external_key_idx ON job_applications (user_id, external_key) WHERE external_key IS NOT NULL;
