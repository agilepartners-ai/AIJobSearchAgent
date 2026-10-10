/**
 * Email Worker: the front door for forwarded job emails (no Google permission involved).
 *
 *   user's mailbox --forward--> jobs+<token>@in.<domain> --Cloudflare Email Routing--> this Worker --POST--> VM /api/inbound/email
 *
 * It does almost no work on purpose: the free plan gives a Worker 10 ms of CPU, and parsing and AI belong on the VM.
 * It checks the address shape and size, streams the raw message to the VM with a shared secret, and returns.
 * Nothing is stored here.
 */
export interface Env {
  /** The VM service, for example https://gen.agilepartners-ai.com */
  INBOUND_ORIGIN: string;
  /** Shared with the VM (INBOUND_SECRET). */
  INBOUND_SECRET: string;
}

/** The part of Cloudflare's ForwardableEmailMessage this Worker uses. */
export interface InboundMessage {
  to: string;
  rawSize: number;
  raw: ReadableStream<Uint8Array>;
  setReject(reason: string): void;
}

export const MAX_RAW_BYTES = 1_500_000;
const ADDRESS = /^jobs\+[a-z2-7]{20,64}@[a-z0-9.-]+$/i;

export async function handleEmail(message: InboundMessage, env: Env, doFetch: typeof fetch = fetch): Promise<'delivered' | 'rejected'> {
  // A permanent rejection tells the sender's mail system to stop, which is right for a wrong address or an oversize message.
  if (!ADDRESS.test(message.to)) {
    message.setReject('Unknown address');
    return 'rejected';
  }
  if (message.rawSize > MAX_RAW_BYTES) {
    message.setReject('Message too large (limit 1.5 MB)');
    return 'rejected';
  }

  const raw = await new Response(message.raw).arrayBuffer();
  const res = await doFetch(`${env.INBOUND_ORIGIN.replace(/\/+$/, '')}/api/inbound/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'x-inbound-secret': env.INBOUND_SECRET, 'x-inbound-to': message.to },
    body: raw,
    signal: AbortSignal.timeout(25_000),
  });
  // 5xx or an unreachable VM: throw, so the mail is treated as undelivered and the sender retries, instead of being lost.
  if (res.status >= 500) throw new Error(`VM answered ${res.status}`);
  // 4xx means the VM refused us (bad secret); that is a configuration error worth failing loudly on too.
  if (res.status >= 400) throw new Error(`VM refused the message (${res.status})`);
  return 'delivered';
}

export default {
  async email(message: InboundMessage, env: Env): Promise<void> {
    await handleEmail(message, env);
  },

  /** Opening the Worker's URL only says it is alive; it never reveals anything. */
  async fetch(): Promise<Response> {
    return new Response('ajsa-inbound: email only', { status: 200, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } });
  },
};
