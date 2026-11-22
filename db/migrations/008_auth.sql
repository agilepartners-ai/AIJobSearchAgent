-- Authentication, owned by us. Replaces the previous hosted sign-in provider: accounts, sign-in sessions, one-time email tokens, rate limits and an
-- audit trail, all in this database on the VM (next to the application data), so signing in works whenever the VM does.
--
-- An account's id is the same uuid every other table already uses as `user_id`. Accounts created before this migration (they lived in
-- Supabase) are re-linked the first time their owner proves control of the email address: the new row is created with the id found in
-- app.profiles for that address, so their résumés and applications stay theirs.

SET search_path = app, public;

CREATE TABLE auth_users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               citext NOT NULL UNIQUE,
  -- scrypt$N$r$p$salt$hash. NULL: the account has no password (Google sign-in only); "forgot password" adds one.
  password_hash       text,
  -- Every account has proved its address (sign-up only creates the row after the email link is used), so this is set at creation.
  email_verified_at   timestamptz,
  full_name           text NOT NULL DEFAULT '',
  phone               text NOT NULL DEFAULT '',
  disabled_at         timestamptz,
  last_login_at       timestamptz,
  password_changed_at timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER auth_users_touch BEFORE UPDATE ON auth_users FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- A Google account linked to a user. Matched by Google's stable subject id, never by email alone.
CREATE TABLE auth_identities (
  provider          text NOT NULL,
  provider_user_id  text NOT NULL,
  user_id           uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  email             citext,
  created_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_user_id)
);
CREATE INDEX auth_identities_user_idx ON auth_identities (user_id);

-- One row per signed-in browser. The refresh token is stored only as a hash and rotates on every use; the previous hash is kept
-- so a replayed (stolen) token is detected and the whole session is revoked.
CREATE TABLE auth_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  token_hash    text NOT NULL UNIQUE,
  prev_hash     text,
  rotated_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz,
  user_agent    text,
  ip            text
);
CREATE INDEX auth_sessions_user_idx ON auth_sessions (user_id) WHERE revoked_at IS NULL;
CREATE INDEX auth_sessions_prev_idx ON auth_sessions (prev_hash) WHERE prev_hash IS NOT NULL;

-- One-time email links. `signup` holds a pending registration (the password hash waits here: no account exists until the link is
-- used, so nobody can register someone else's address). `reset_password` has user_id NULL when the address belongs to a
-- pre-existing profile that has no account yet.
CREATE TABLE auth_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose     text NOT NULL CHECK (purpose IN ('signup','reset_password')),
  token_hash  text NOT NULL UNIQUE,
  email       citext NOT NULL,
  user_id     uuid REFERENCES auth_users(id) ON DELETE CASCADE,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz
);
-- At most one open link per purpose and address: asking again replaces the earlier link.
CREATE UNIQUE INDEX auth_tokens_open_uq ON auth_tokens (purpose, email) WHERE used_at IS NULL;

-- Fixed-window counters for sign-in, sign-up and reset attempts.
CREATE TABLE auth_rate (
  key           text PRIMARY KEY,
  window_start  timestamptz NOT NULL,
  hits          integer NOT NULL
);

-- What happened, for the owner to read: no passwords or tokens are ever written here.
CREATE TABLE auth_events (
  id       bigserial PRIMARY KEY,
  at       timestamptz NOT NULL DEFAULT now(),
  user_id  uuid,
  email    citext,
  kind     text NOT NULL,
  ip       text,
  detail   text
);
CREATE INDEX auth_events_at_idx ON auth_events (at DESC);
CREATE INDEX auth_events_user_idx ON auth_events (user_id, at DESC);
