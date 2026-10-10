/**
 * Cloudflare Workers AI over its REST API. Server-only (the VM or local Node).
 *
 * Why it exists: Gmail text must not go to a service that trains on it or lets humans read it. Gemini's free tier does both;
 * Workers AI does neither ("Cloudflare does not use your Customer Content to train any AI models") and gives
 * 10,000 free neurons a day. Same call shape as generateText so the extractor can use either.
 */
import { GeminiError, type GenerateOptions, type TokenUsage } from './gemini';

// 70B scored 10/10 on the fixture set; the 8B model missed 3/10 and followed the prompt-injection email.
const DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const TIMEOUT_MS = 60_000;

export class WorkersAiError extends GeminiError {
  constructor(message: string, retryable = false, readonly quota = false) {
    super(message, retryable);
    this.name = 'WorkersAiError';
  }
}

/** After the free allowance is used up, stop calling for a while instead of failing every message one by one. */
let blockedUntil = 0;
export function __resetQuotaBlock(): void {
  blockedUntil = 0;
}

export function workersAiModel(): string {
  return process.env.WORKERS_AI_MODEL || DEFAULT_MODEL;
}

export function workersAiConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.CF_AI_ACCOUNT_ID && env.CF_AI_TOKEN);
}

type Schema = { type?: string; nullable?: boolean; enum?: unknown[]; properties?: Record<string, Schema>; required?: string[]; description?: string };

/** Gemini's response schema (upper-case types, `nullable`) to standard JSON Schema. */
export function toJsonSchema(s: Schema): Record<string, unknown> {
  const type = (s.type ?? 'string').toLowerCase();
  const out: Record<string, unknown> = { type: s.nullable ? [type, 'null'] : type };
  if (s.description) out.description = s.description;
  if (s.enum) out.enum = s.nullable ? [...s.enum, null] : s.enum;
  if (s.properties) {
    out.properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, toJsonSchema(v)]));
    out.required = s.required ?? Object.keys(s.properties);
    out.additionalProperties = false;
  }
  return out;
}

interface RunResponse {
  success?: boolean;
  errors?: { code?: number; message?: string }[];
  result?: {
    response?: unknown;
    choices?: { message?: { content?: string | null } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
}

export async function generateWithWorkersAi(options: GenerateOptions): Promise<string> {
  const account = process.env.CF_AI_ACCOUNT_ID;
  const token = process.env.CF_AI_TOKEN;
  if (!account || !token) throw new WorkersAiError('CF_AI_ACCOUNT_ID and CF_AI_TOKEN are not set');
  const model = workersAiModel();
  if (Date.now() < blockedUntil) throw new WorkersAiError('Workers AI: the free daily allowance is used up; it resets at 00:00 UTC', false, true);

  const body: Record<string, unknown> = {
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userPrompt },
    ],
    temperature: options.temperature ?? 0.1,
    max_tokens: options.maxOutputTokens ?? 800,
  };
  if (options.jsonSchema) body.response_format = { type: 'json_schema', json_schema: toJsonSchema(options.jsonSchema as Schema) };

  let res: Response;
  try {
    res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new WorkersAiError(`Workers AI request failed: ${e instanceof Error ? e.message : 'network'}`, true);
  }

  const json = (await res.json().catch(() => ({}))) as RunResponse;
  if (!res.ok || json.success === false) {
    const msg = json.errors?.[0]?.message ?? `HTTP ${res.status}`;
    // 4006: the free daily allowance of neurons is used up. It resets at 00:00 UTC.
    const quota = res.status === 429 || json.errors?.[0]?.code === 4006 || /neuron|daily/i.test(msg);
    if (quota) blockedUntil = Date.now() + 15 * 60_000;
    throw new WorkersAiError(`Workers AI: ${msg}`, res.status >= 500 || res.status === 429, quota);
  }

  const r = json.result ?? {};
  const usage: TokenUsage = { model, keyId: 'workers-ai', promptTokens: r.usage?.prompt_tokens ?? 0, outputTokens: r.usage?.completion_tokens ?? 0, cachedTokens: 0 };
  options.onUsage?.(usage);

  // JSON mode returns the parsed object in `response`; plain mode returns a string there or in `choices`.
  if (r.response !== undefined && r.response !== null) return typeof r.response === 'string' ? r.response : JSON.stringify(r.response);
  const content = r.choices?.[0]?.message?.content;
  if (content) return content;
  throw new WorkersAiError('Workers AI returned no content');
}
