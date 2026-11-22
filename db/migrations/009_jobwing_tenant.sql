-- JobWing in the same database as the website: what the desktop app is allowed to send, kept per user.
--
-- Isolation is enforced by PostgreSQL itself. Every table has a user_id and FORCED row-level security: a query only sees the
-- rows of the user named in the transaction setting jw.user_id, even if application code forgets a WHERE clause, and even for the
-- table owner. The owner's own reporting view (jw.admin = 'on') can read across users and can never write across them.
--
-- Nothing here holds free text from the user: résumé text, email text, tool arguments and results never arrive (the intake
-- allow-list rejects them). Names are short codes; `code` is a short error code, not a message.

CREATE SCHEMA IF NOT EXISTS jw;
SET search_path = jw, app, public;

-- A computer running JobWing for a user.
CREATE TABLE devices (
  user_id      uuid NOT NULL REFERENCES app.auth_users(id) ON DELETE CASCADE,
  device_id    text NOT NULL CHECK (length(device_id) BETWEEN 8 AND 64),
  app_version  text NOT NULL DEFAULT '' CHECK (length(app_version) <= 24),
  os           text NOT NULL DEFAULT '' CHECK (length(os) <= 24),
  first_seen   timestamptz NOT NULL DEFAULT now(),
  last_seen    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);

-- The user's choice about the activity log. Without a row, or with activity_log = false, the server accepts none of it.
CREATE TABLE consents (
  user_id         uuid PRIMARY KEY REFERENCES app.auth_users(id) ON DELETE CASCADE,
  activity_log    boolean NOT NULL,
  policy_version  text NOT NULL CHECK (length(policy_version) <= 24),
  decided_at      timestamptz NOT NULL DEFAULT now()
);

-- One row per run the app started (the id is the app's own counter, so it is unique per device).
CREATE TABLE runs (
  user_id      uuid NOT NULL REFERENCES app.auth_users(id) ON DELETE CASCADE,
  device_id    text NOT NULL,
  run_id       bigint NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('daily','find','gmail','apply','people','sync','report','custom','followup')),
  trigger      text NOT NULL CHECK (trigger IN ('user','schedule')),
  state        text NOT NULL CHECK (state IN ('starting','running','idle','done','failed','stopped')),
  started_at   timestamptz NOT NULL,
  ended_at     timestamptz,
  duration_ms  integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  tool_uses    integer NOT NULL DEFAULT 0 CHECK (tool_uses >= 0),
  turns        integer CHECK (turns IS NULL OR turns >= 0),
  error_code   text CHECK (error_code IS NULL OR length(error_code) <= 40),
  received_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id, run_id)
);
CREATE INDEX runs_started ON runs (started_at DESC);

-- Counts per day, taken on the user's computer: how big the search was, not what it found.
CREATE TABLE daily (
  user_id     uuid NOT NULL REFERENCES app.auth_users(id) ON DELETE CASCADE,
  day         date NOT NULL,
  found       integer NOT NULL DEFAULT 0 CHECK (found >= 0),
  open_jobs   integer NOT NULL DEFAULT 0 CHECK (open_jobs >= 0),
  matching    integer NOT NULL DEFAULT 0 CHECK (matching >= 0),
  applied     integer NOT NULL DEFAULT 0 CHECK (applied >= 0),
  by_status   jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(by_status) = 'object' AND pg_column_size(by_status) < 600),
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

-- What happened and how it went, never with what it was about. Monthly partitions keep the table easy to age out.
CREATE SEQUENCE activity_id_seq;
CREATE TABLE activity (
  id           bigint NOT NULL DEFAULT nextval('jw.activity_id_seq'),
  user_id      uuid NOT NULL REFERENCES app.auth_users(id) ON DELETE CASCADE,
  device_id    text NOT NULL,
  at           timestamptz NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('tool','event','run','sync','app')),
  name         text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  ms           integer CHECK (ms IS NULL OR ms >= 0),
  ok           boolean,
  code         text CHECK (code IS NULL OR length(code) <= 40),
  received_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, at, id)
) PARTITION BY RANGE (at);
CREATE INDEX activity_kind ON activity (kind, name, at DESC);

CREATE OR REPLACE FUNCTION jw.ensure_activity_partition(month date) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  from_d date := date_trunc('month', month)::date;
  to_d   date := (date_trunc('month', month) + interval '1 month')::date;
  part   text := format('activity_%s', to_char(from_d, 'YYYY_MM'));
BEGIN
  IF to_regclass('jw.' || part) IS NULL THEN
    EXECUTE format('CREATE TABLE jw.%I PARTITION OF jw.activity FOR VALUES FROM (%L) TO (%L)', part, from_d, to_d);
    EXECUTE format('ALTER TABLE jw.%I ENABLE ROW LEVEL SECURITY', part);
    EXECUTE format('ALTER TABLE jw.%I FORCE ROW LEVEL SECURITY', part);
    EXECUTE format('CREATE POLICY tenant ON jw.%I USING (user_id = nullif(current_setting(''jw.user_id'', true), '''')::uuid) WITH CHECK (user_id = nullif(current_setting(''jw.user_id'', true), '''')::uuid)', part);
    EXECUTE format('CREATE POLICY owner_read ON jw.%I FOR SELECT USING (current_setting(''jw.admin'', true) = ''on'')', part);
  END IF;
END $$;

DO $$
DECLARE m date;
BEGIN
  FOR m IN SELECT generate_series(date '2026-11-01', date '2027-12-01', interval '1 month')::date LOOP
    PERFORM jw.ensure_activity_partition(m);
  END LOOP;
END $$;
CREATE TABLE activity_other PARTITION OF activity DEFAULT;

-- Row-level security on every table (the partitions got theirs above).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['devices','consents','runs','daily','activity','activity_other'] LOOP
    EXECUTE format('ALTER TABLE jw.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE jw.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY tenant ON jw.%I USING (user_id = nullif(current_setting(''jw.user_id'', true), '''')::uuid) WITH CHECK (user_id = nullif(current_setting(''jw.user_id'', true), '''')::uuid)', t);
    EXECUTE format('CREATE POLICY owner_read ON jw.%I FOR SELECT USING (current_setting(''jw.admin'', true) = ''on'')', t);
  END LOOP;
END $$;
