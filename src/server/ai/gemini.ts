/**
 * Gemini client. Server-only.
 *
 * This used to run in the browser with NEXT_PUBLIC_GEMINI_API_KEY, which
 * shipped the API key to every visitor in the JS bundle. The key is now
 * server-side only and must be named GEMINI_API_KEY.
 *
 * The retry/backoff strategy is carried over from the old
 * aiEnhancementService — Gemini returns 503/429 often enough under load that
 * retrying is the difference between a working feature and a flaky one.
 */

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * A moving alias rather than a pinned version, deliberately.
 *
 * The previous default, gemini-2.0-flash, now returns
 * 404 "This model is no longer available" — Google retires pinned model ids,
 * and a hard-coded one turns into an outage later. `gemini-flash-latest`
 * always resolves to the current flash model.
 *
 * Override with GEMINI_MODEL to pin a specific version.
 */
const DEFAULT_MODEL = 'gemini-flash-latest';

/**
 * Output length is deliberately NOT capped.
 *
 * Current flash models are "thinking" models: internal reasoning tokens are
 * billed against maxOutputTokens before any visible text appears. Requesting
 * `thinkingBudget: 0` below only *asks* for that to stop — measured across 5
 * identical calls to gemini-3.7-flash, 4 still spent 389-563 tokens on
 * reasoning. It is best-effort, not a switch.
 *
 * That makes any fixed cap a liability: reasoning can silently eat the budget
 * and leave a truncated document (the original 8192 cap surfaced as an empty
 * response). Omitting maxOutputTokens lets each model apply its own maximum —
 * 65,536 on gemini-3.7-flash — so thinking costs latency, never correctness.
 *
 * Set `maxOutputTokens` per call only if you have a specific reason to.
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class GeminiError extends Error {
  constructor(message: string, readonly retryable = false) {
    super(message);
    this.name = 'GeminiError';
  }
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new GeminiError(
      'GEMINI_API_KEY is not configured. Set it in the server environment ' +
        '(it must not be a NEXT_PUBLIC_ variable — that would expose it to browsers).',
    );
  }
  return key;
}

function getModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

function isRetryable(status: number, body: string): boolean {
  if (status === 429 || status === 503 || status === 500 || status === 504) return true;
  return /UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded/i.test(body);
}

export interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  /** Low by default: this is extraction and rewriting, not creative writing. */
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Single completion. Returns the raw text — callers parse it.
 * Throws GeminiError with a message safe to log (never surfaced verbatim to users).
 */
export async function generateText(options: GenerateOptions): Promise<string> {
  const apiKey = getApiKey();
  const model = getModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const payload = {
    contents: [{ parts: [{ text: `${options.systemPrompt}\n\n${options.userPrompt}` }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.3,
      topK: 20,
      topP: 0.8,
      responseMimeType: 'text/plain',
      // Ask for reasoning to be skipped. Honoured inconsistently (see above),
      // but when it lands it roughly halves latency, and it never hurts.
      // Models that reject the field are handled by the 400 path below.
      thinkingConfig: { thinkingBudget: 0 },
      // Only set when a caller explicitly asks; otherwise the model's own
      // maximum applies. See the note above DEFAULT_MODEL.
      ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
    },
  };

  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');

        // Not every model accepts thinkingConfig — some reject the field, some
        // reject a particular level. It is an optimisation, not a requirement,
        // so drop it and carry on rather than failing the generation.
        if (response.status === 400 && /thinking/i.test(body) && 'thinkingConfig' in payload.generationConfig) {
          delete (payload.generationConfig as { thinkingConfig?: unknown }).thinkingConfig;
          console.warn(`[gemini] ${model} rejected thinkingConfig; retrying without it.`);
          continue;
        }

        if (isRetryable(response.status, body) && attempt < MAX_RETRIES) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        if (response.status === 401) {
          // A GEMINI_API_KEY beginning "AQ." is a short-lived OAuth access
          // token rather than an AI Studio API key, and starts 401ing about an
          // hour after it is issued.
          throw new GeminiError(
            apiKey.startsWith('AQ.')
              ? 'GEMINI_API_KEY is an expired OAuth token, not an API key. Create a ' +
                'permanent key (starts with "AIza") at https://aistudio.google.com/apikey.'
              : `Gemini rejected the credential: ${body.slice(0, 200)}`,
          );
        }
        if (response.status === 404) {
          throw new GeminiError(
            `Gemini model "${model}" is unavailable — Google retires model ids over time. ` +
              `Set GEMINI_MODEL to a current one, or unset it to use ${DEFAULT_MODEL}. ` +
              `Details: ${body.slice(0, 200)}`,
          );
        }
        throw new GeminiError(`Gemini returned ${response.status}: ${body.slice(0, 300)}`);
      }

      const data = await response.json();

      const finishReason = data?.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY' || finishReason === 'BLOCKED') {
        throw new GeminiError('Gemini blocked the request via its safety filters.');
      }
      if (data?.promptFeedback?.blockReason) {
        throw new GeminiError(`Gemini blocked the prompt: ${data.promptFeedback.blockReason}`);
      }

      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      // MAX_TOKENS means the output was truncated mid-macro, which the
      // sanitizer would reject anyway. Retrying is pointless — the budget is
      // the problem — so fail immediately with an actionable message.
      if (finishReason === 'MAX_TOKENS') {
        const thoughts = data?.usageMetadata?.thoughtsTokenCount ?? 0;
        throw new GeminiError(
          `Gemini hit the output token limit before finishing (${thoughts} tokens went to ` +
            'reasoning). Raise maxOutputTokens or choose a model with a larger output limit.',
        );
      }

      if (!text.trim()) {
        if (attempt < MAX_RETRIES) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        throw new GeminiError(
          `Gemini returned an empty response (finishReason: ${finishReason ?? 'none'}).`,
        );
      }

      return text;
    } catch (error) {
      if (error instanceof GeminiError) throw error;

      const aborted = error instanceof Error && error.name === 'AbortError';
      if (attempt < MAX_RETRIES) {
        await sleep(backoffDelay(attempt));
        continue;
      }
      throw new GeminiError(aborted ? 'Gemini request timed out.' : 'Could not reach Gemini.');
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Exponential backoff with jitter, so concurrent retries do not sync up. */
function backoffDelay(attempt: number): number {
  const base = Math.min(INITIAL_RETRY_DELAY_MS * 2 ** attempt, MAX_RETRY_DELAY_MS);
  return base + Math.random() * 1_000;
}
