-- Forwarding channel for job emails (docs/GMAIL_JOB_SYNC_SCOPE.md, "Channel B"): no Google permission involved.
-- A user forwards job emails to jobs+<token>@in.<domain>; Cloudflare Email Routing hands them to a Worker, which posts them here.
-- Bodies are never stored: only the extracted application fields and a ledger row per message.
SET search_path = app, public;

CREATE TABLE inbound_addresses (
  user_id           uuid PRIMARY KEY,
  -- Unguessable, URL-safe. Anyone who knows the address can add rows for this user, so it is treated like a password
  -- and can be replaced at any time.
  token             text NOT NULL UNIQUE CHECK (length(token) >= 20),
  created_at        timestamptz NOT NULL DEFAULT now(),
  last_received_at  timestamptz,
  received_total    integer NOT NULL DEFAULT 0,
  -- mail accepted today (UTC), to cap abuse of a leaked address
  day_date          date,
  day_count         integer NOT NULL DEFAULT 0
);

-- Gmail asks the forwarding address to confirm with a code before it starts forwarding. We catch that mail and show the
-- code in the dashboard, so the user never needs access to this mailbox.
CREATE TABLE inbound_confirmations (
  user_id      uuid PRIMARY KEY,
  code         text,
  link         text,
  received_at  timestamptz NOT NULL DEFAULT now()
);

-- Which channel a ledger row came from (gmail api or forwarded mail).
ALTER TABLE gmail_messages ADD COLUMN channel text NOT NULL DEFAULT 'gmail_api' CHECK (channel IN ('gmail_api','forwarded'));
