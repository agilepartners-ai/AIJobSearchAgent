/**
 * Gemini client. Server-only.
 *
 * This used to run in the browser with NEXT_PUBLIC_GEMINI_API_KEY, which
 * shipped the API key to every visitor in the JS bundle. Keys are server-side
 * only: GEMINI_API_KEYS (several, rotated by keyPool.ts) or GEMINI_API_KEY.
 *
 * Cost levers, in order of size:
 *   1. A lite model by default. Resume tailoring is extraction and rewriting
 *      against a fixed macro contract, not open-ended reasoning, so the cheap
 *      tier is the right fit. Override with GEMINI_MODEL.
 *   2. The static instructions go in `systemInstruction`, ahead of the
 *      per-request content. Gemini caches identical prompt prefixes
 *      automatically, so keeping that block byte-stable is what earns the
 *      discount.
 *   3. Thinking is switched off (best effort; see below) and output is capped.
 *   4. Every call reports its token usage so spend is measured, not guessed.
 */
import { getKeyPool, withKey, type AttemptResult } from './keyPool';

const REQUEST_TIMEOUT_MS = 120_000;

/**
 * A moving alias rather than a pinned version. Google retires pinned model ids
 * (gemini-2.0-flash now 404s), and a hard-coded one becomes an outage later.
 * `gemini-flash-lite-latest` always resolves to the current lite model.
 */
const DEFAULT_MODEL = 'gemini-flash-lite-latest';

/**
 * A resume plus cover letter plus analysis is ~3-5k tokens. The cap is far
 * above that, so it never truncates real output, but it bounds a runaway
 * generation (or reasoning that ignores thinkingBudget) to a known cost.
 * Raise it with GEMINI_MAX_OUTPUT_TOKENS if a model needs more room.
 */
const DEFAULT_MAX_OUTPUT_TOKENS = 16_384;

/**
 * Ways to ask a model not to spend tokens reasoning, newest API first.
 *
 * Model families disagree: Gemini 3 takes `thinkingLevel`, 2.5 takes
 * `thinkingBudget`, and some lite models take neither and answer 400 with a
 * generic "invalid argument" that never mentions thinking. So the request is
 * retried down this ladder on any 400, ending at "send nothing", and the mode
 * that worked is remembered per model so later calls go straight to it.
 */
const THINKING_LADDER: (Record<string, unknown> | null)[] = [{ thinkingLevel: 'minimal' }, { thinkingBudget: 0 }, null];
const thinkingModeByModel = new Map<string, number>();

export class GeminiError extends Error {
  constructor(message: string, readonly retryable = false) {
    super(message);
    this.name = 'GeminiError';
  }
}

export interface TokenUsage {
  model: string;
  /** Which pooled key served the call, e.g. "#2…a1b2". Never the secret. */
  keyId: string;
  promptTokens: number;
  /** Visible output plus any reasoning tokens, which are billed as output. */
  outputTokens: number;
  /** Prompt tokens served from Gemini's cache at a discount. */
  cachedTokens: number;
}

export function getModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

function getMaxOutputTokens(): number {
  const configured = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_OUTPUT_TOKENS;
}

export interface GenerateOptions {
  /** Stable instructions. Keep byte-identical between calls so they can be cached. */
  systemPrompt: string;
  /** Everything that varies per request. */
  userPrompt: string;
  /** Low by default: this is extraction and rewriting, not creative writing. */
  temperature?: number;
  maxOutputTokens?: number;
  /** Ask for JSON that matches this schema (Gemini `responseSchema`). Omit for plain text. */
  jsonSchema?: Record<string, unknown>;
  /** Called once per successful completion with the tokens it used. */
  onUsage?: (usage: TokenUsage) => void;
}

const RETRY_DELAY_IN_BODY = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/;

/** Gemini says how long to wait in a header or, more often, inside the error body. */
function retryAfterMs(response: Response, body: string): number | undefined {
  const header = Number(response.headers.get('retry-after'));
  if (Number.isFinite(header) && header > 0) return header * 1_000;
  const match = body.match(RETRY_DELAY_IN_BODY);
  return match ? Math.ceil(Number(match[1]) * 1_000) : undefined;
}

/**
 * Single completion. Returns the raw text — callers parse it.
 * Throws GeminiError with a message safe to log (never surfaced verbatim to users).
 */
export async function generateText(options: GenerateOptions): Promise<string> {
  const pool = getKeyPool('gemini');
  if (pool.size === 0) {
    throw new GeminiError(
      'No Gemini API key is configured. Set GEMINI_API_KEYS (comma separated) or GEMINI_API_KEY in ' +
        'the server environment. It must not be a NEXT_PUBLIC_ variable — that would expose it to browsers.',
    );
  }

  const model = getModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.3,
    topK: 20,
    topP: 0.8,
    responseMimeType: options.jsonSchema ? 'application/json' : 'text/plain',
    ...(options.jsonSchema ? { responseSchema: options.jsonSchema } : {}),
    maxOutputTokens: options.maxOutputTokens ?? getMaxOutputTokens(),
  };

  let thinkingMode = thinkingModeByModel.get(model) ?? 0;
  const applyThinking = () => {
    const config = THINKING_LADDER[thinkingMode];
    if (config) generationConfig.thinkingConfig = config;
    else delete generationConfig.thinkingConfig;
  };
  applyThinking();

  const body = () =>
    JSON.stringify({
      systemInstruction: { parts: [{ text: options.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: options.userPrompt }] }],
      generationConfig,
    });

  const attempt = async (key: { id: string; secret: string }): Promise<AttemptResult<string>> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const post = () =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.secret },
        body: body(),
        signal: controller.signal,
      });

    try {
      let response = await post();

      // Thinking control is an optimisation, never a requirement: on a 400,
      // step down the ladder and re-send instead of failing the generation.
      while (response.status === 400 && thinkingMode < THINKING_LADDER.length - 1) {
        thinkingMode += 1;
        applyThinking();
        response = await post();
      }
      if (response.ok) thinkingModeByModel.set(model, thinkingMode);

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const status = response.status;

        if (status === 429 || /RESOURCE_EXHAUSTED/i.test(text)) {
          return {
            ok: false,
            kind: 'rate_limited',
            retryAfterMs: retryAfterMs(response, text),
            error: new GeminiError(`Gemini rate limit on key ${key.id}.`, true),
          };
        }
        if (status === 401 || status === 403) {
          return {
            ok: false,
            kind: 'auth',
            error: new GeminiError(
              key.secret.startsWith('AQ.')
                ? 'A Gemini key is an expired OAuth token, not an API key. Create a permanent key ' +
                  '(starts with "AIza") at https://aistudio.google.com/apikey.'
                : `Gemini rejected key ${key.id}: ${text.slice(0, 160)}`,
            ),
          };
        }
        if (status === 404) {
          return {
            ok: false,
            kind: 'fatal',
            error: new GeminiError(
              `Gemini model "${model}" is unavailable — Google retires model ids over time. ` +
                `Set GEMINI_MODEL to a current one, or unset it to use ${DEFAULT_MODEL}. ` +
                `Details: ${text.slice(0, 200)}`,
            ),
          };
        }
        if (status >= 500 || /UNAVAILABLE|overloaded/i.test(text)) {
          return { ok: false, kind: 'server', error: new GeminiError(`Gemini returned ${status}.`, true) };
        }
        return {
          ok: false,
          kind: 'fatal',
          error: new GeminiError(`Gemini returned ${status}: ${text.slice(0, 300)}`),
        };
      }

      const data = await response.json();
      const finishReason = data?.candidates?.[0]?.finishReason;

      if (finishReason === 'SAFETY' || finishReason === 'BLOCKED' || data?.promptFeedback?.blockReason) {
        return {
          ok: false,
          kind: 'fatal',
          error: new GeminiError(
            data?.promptFeedback?.blockReason
              ? `Gemini blocked the prompt: ${data.promptFeedback.blockReason}`
              : 'Gemini blocked the request via its safety filters.',
          ),
        };
      }

      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      // Truncated mid-macro: the sanitizer would reject it and retrying spends
      // the same budget again, so fail now with something actionable.
      if (finishReason === 'MAX_TOKENS') {
        const thoughts = data?.usageMetadata?.thoughtsTokenCount ?? 0;
        return {
          ok: false,
          kind: 'fatal',
          error: new GeminiError(
            `Gemini hit the output token limit before finishing (${thoughts} tokens went to reasoning). ` +
              'Raise GEMINI_MAX_OUTPUT_TOKENS or choose a model with more room.',
          ),
        };
      }

      if (!text.trim()) {
        return {
          ok: false,
          kind: 'server',
          error: new GeminiError(`Gemini returned an empty response (finishReason: ${finishReason ?? 'none'}).`, true),
        };
      }

      const meta = data?.usageMetadata ?? {};
      options.onUsage?.({
        model,
        keyId: key.id,
        promptTokens: meta.promptTokenCount ?? 0,
        outputTokens: (meta.candidatesTokenCount ?? 0) + (meta.thoughtsTokenCount ?? 0),
        cachedTokens: meta.cachedContentTokenCount ?? 0,
      });

      return { ok: true, value: text };
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      return {
        ok: false,
        kind: 'server',
        error: new GeminiError(aborted ? 'Gemini request timed out.' : 'Could not reach Gemini.', true),
      };
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await withKey(pool, attempt);
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    throw new GeminiError(error instanceof Error ? error.message : 'Gemini request failed.', true);
  }
}
