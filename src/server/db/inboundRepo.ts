import { query } from './pool';
import { aiCallsToday, appsForMerge, insertApplication, patchApplication, type LedgerRow } from './gmailRepo';
import { newToken } from '../gmail/tokens';

export { aiCallsToday, appsForMerge, insertApplication, patchApplication };

const TODAY_UTC = "(now() AT TIME ZONE 'utc')::date";

export interface InboundStatus {
  token: string;
  lastReceivedAt: string | null;
  receivedTotal: number;
  confirmation: { code: string | null; link: string | null; receivedAt: string } | null;
}

export async function getOrCreateAddress(userId: string): Promise<string> {
  const existing = await query<{ token: string }>('SELECT token FROM app.inbound_addresses WHERE user_id = $1', [userId]);
  if (existing.rows[0]) return existing.rows[0].token;
  const { rows } = await query<{ token: string }>(
    'INSERT INTO app.inbound_addresses (user_id, token) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id RETURNING token',
    [userId, newToken()],
  );
  return rows[0].token;
}

/** A new address; the old one stops working at once. Use when an address leaks or the user wants to start clean. */
export async function rotateAddress(userId: string): Promise<string> {
  const { rows } = await query<{ token: string }>(
    `INSERT INTO app.inbound_addresses (user_id, token) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token, day_date = NULL, day_count = 0 RETURNING token`,
    [userId, newToken()],
  );
  await query('DELETE FROM app.inbound_confirmations WHERE user_id = $1', [userId]);
  return rows[0].token;
}

export async function inboundStatus(userId: string): Promise<InboundStatus> {
  const token = await getOrCreateAddress(userId);
  const a = await query<{ last_received_at: string | null; received_total: number }>('SELECT last_received_at, received_total FROM app.inbound_addresses WHERE user_id = $1', [userId]);
  const c = await query<{ code: string | null; link: string | null; received_at: string }>('SELECT code, link, received_at FROM app.inbound_confirmations WHERE user_id = $1', [userId]);
  return {
    token,
    lastReceivedAt: a.rows[0]?.last_received_at ?? null,
    receivedTotal: a.rows[0]?.received_total ?? 0,
    confirmation: c.rows[0] ? { code: c.rows[0].code, link: c.rows[0].link, receivedAt: c.rows[0].received_at } : null,
  };
}

export async function userForToken(token: string): Promise<string | null> {
  const { rows } = await query<{ user_id: string }>('SELECT user_id FROM app.inbound_addresses WHERE token = $1', [token]);
  return rows[0]?.user_id ?? null;
}

export async function receivedToday(userId: string): Promise<number> {
  const { rows } = await query<{ n: number }>(`SELECT CASE WHEN day_date = ${TODAY_UTC} THEN day_count ELSE 0 END AS n FROM app.inbound_addresses WHERE user_id = $1`, [userId]);
  return rows[0]?.n ?? 0;
}

export async function noteReceived(userId: string): Promise<void> {
  await query(
    `UPDATE app.inbound_addresses SET received_total = received_total + 1, last_received_at = now(),
       day_count = CASE WHEN day_date = ${TODAY_UTC} THEN day_count + 1 ELSE 1 END, day_date = ${TODAY_UTC}
     WHERE user_id = $1`,
    [userId],
  );
}

export async function saveConfirmation(userId: string, c: { code: string | null; link: string | null }): Promise<void> {
  await query(
    `INSERT INTO app.inbound_confirmations (user_id, code, link, received_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code, link = EXCLUDED.link, received_at = now()`,
    [userId, c.code, c.link],
  );
}

export async function seen(userId: string, messageId: string): Promise<boolean> {
  const { rows } = await query("SELECT 1 FROM app.gmail_messages WHERE user_id = $1 AND message_id = $2 AND outcome <> 'error'", [userId, messageId]);
  return rows.length > 0;
}

export async function recordMessage(userId: string, r: Omit<LedgerRow, never>): Promise<void> {
  await query(
    `INSERT INTO app.gmail_messages (user_id, message_id, thread_id, received_at, sender_domain, outcome, email_type, confidence, application_id, channel)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'forwarded')
     ON CONFLICT (user_id, message_id) DO UPDATE SET outcome = EXCLUDED.outcome, email_type = EXCLUDED.email_type,
       confidence = EXCLUDED.confidence, application_id = EXCLUDED.application_id, processed_at = now()`,
    [userId, r.messageId, r.threadId, r.receivedAt, r.senderDomain, r.outcome, r.emailType ?? null, r.confidence ?? null, r.applicationId ?? null],
  );
}
