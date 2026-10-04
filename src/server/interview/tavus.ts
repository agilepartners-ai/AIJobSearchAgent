/**
 * Tavus mock-interview conversations, called from the server only.
 *
 * This used to run in the browser with the API key in NEXT_PUBLIC_TAVUS_API_KEY, which published the
 * key to every visitor. The key now lives in TAVUS_API_KEY (never sent to a client) and the browser
 * talks to /api/interview, which requires a signed-in user and enforces a daily cap.
 */
export class TavusConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TavusConfigError';
  }
}

export class TavusError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'TavusError';
  }
}

const API = 'https://tavusapi.com/v2/conversations';
const MAX_CONTEXT_CHARS = 8000;

function apiKey(): string {
  const key = process.env.TAVUS_API_KEY;
  if (!key) throw new TavusConfigError('TAVUS_API_KEY is not set');
  return key;
}

export interface TavusConversation {
  conversation_id: string;
  conversation_url: string;
  status?: string;
}

export async function createConversation(context: string): Promise<TavusConversation> {
  const response = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey() },
    body: JSON.stringify({
      replica_id: process.env.TAVUS_REPLICA_ID || 'r9d30b0e55ac',
      persona_id: process.env.TAVUS_PERSONA_ID || 'pe13ed370726',
      conversational_context: context.slice(0, MAX_CONTEXT_CHARS) || undefined,
      properties: {
        max_call_duration: 1800, // 30 minutes
        enable_recording: true,
        enable_closed_captions: true,
        language: 'english',
      },
    }),
  });
  if (!response.ok) throw new TavusError(`Tavus responded ${response.status}`, response.status);
  return (await response.json()) as TavusConversation;
}

export async function endConversation(conversationId: string): Promise<void> {
  const response = await fetch(`${API}/${encodeURIComponent(conversationId)}`, {
    method: 'DELETE',
    headers: { 'x-api-key': apiKey() },
  });
  if (!response.ok && response.status !== 404) throw new TavusError(`Tavus responded ${response.status}`, response.status);
}
