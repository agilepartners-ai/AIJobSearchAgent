/**
 * Texapi LaTeX compiler (https://texapi.ovh).
 *
 * Behaviour here is driven by what the live service actually does, which
 * differs from its published docs in three ways that all matter:
 *
 *   1. Docs: "Compilation errors return HTTP 200 with status: 'error'".
 *      Actual: HTTP 422 with application/problem+json and no log.
 *   2. Docs: `outputFiles` carries the compile log. Actual: always null, so
 *      there is never any compiler output to diagnose a failure with.
 *   3. Undocumented and most dangerous: when the 20 req/min limit is exceeded
 *      the service does NOT return 429 — it returns 422 and 500 for documents
 *      that compile fine moments later. Measured directly: a hello-world that
 *      returned 200 began returning 422 after ~50 rapid requests, then
 *      returned 200 again after a 75-second pause.
 *
 * Consequence: a single 422 cannot be trusted to mean "this LaTeX is broken".
 * We self-throttle below the published limit and re-check a 422 after a pause
 * before reporting a compile failure to the user.
 *
 * The multipart /compile/file endpoint is deliberately unused: it reported
 * status:"success" for a deliberately broken document and returned a garbage
 * PDF, so its error signal is worthless.
 */
import { LatexCompileError, type CompileResult, type LatexCompiler } from './types';

const ENDPOINT = 'https://texapi.ovh/api/latex/compile';
const TIMEOUT_MS = 60_000;

/** Published limit is 20/min; we stay under it to leave headroom. */
const MAX_REQUESTS_PER_MINUTE = 15;
const WINDOW_MS = 60_000;

/** Pause before re-checking a 422, to let a rate-limit window clear. */
const RATE_LIMIT_RECHECK_MS = 20_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Best-effort in-process throttle. On serverless this is per-instance, not
 * global, which is exactly why compile() still re-checks a 422 rather than
 * trusting the limiter to have prevented one.
 */
class RateLimiter {
  private timestamps: number[] = [];

  async acquire(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < WINDOW_MS);

    if (this.timestamps.length >= MAX_REQUESTS_PER_MINUTE) {
      const oldest = this.timestamps[0];
      await sleep(WINDOW_MS - (now - oldest) + 250);
      return this.acquire();
    }

    this.timestamps.push(Date.now());
  }
}

export class TexapiCompiler implements LatexCompiler {
  readonly name = 'texapi';
  private readonly limiter = new RateLimiter();

  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new Error('TEXAPI_KEY is not configured.');
    }
  }

  async compile(tex: string): Promise<CompileResult> {
    const first = await this.attempt(tex);
    if (first.kind === 'pdf') return { pdf: first.pdf };
    if (first.kind === 'error') throw first.error;

    // first.kind === 'rejected' — a 422. This is either genuinely broken LaTeX
    // or a disguised rate limit. Pause past the window and ask once more; only
    // a second rejection is treated as a real compile failure.
    await sleep(RATE_LIMIT_RECHECK_MS);

    const second = await this.attempt(tex);
    if (second.kind === 'pdf') return { pdf: second.pdf };
    if (second.kind === 'error') throw second.error;

    throw new LatexCompileError('The LaTeX document failed to compile.', 422);
  }

  private async attempt(tex: string): Promise<
    | { kind: 'pdf'; pdf: Buffer }
    | { kind: 'rejected' }
    | { kind: 'error'; error: LatexCompileError }
  > {
    await this.limiter.acquire();

    let response: Response;
    try {
      response = await this.post(tex);
    } catch (error) {
      return {
        kind: 'error',
        error:
          error instanceof LatexCompileError
            ? error
            : new LatexCompileError('Could not reach the LaTeX compile service.'),
      };
    }

    if (response.status === 422) return { kind: 'rejected' };

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return {
        kind: 'error',
        error: new LatexCompileError(
          `LaTeX compile service returned ${response.status}.`,
          response.status,
          detail.slice(0, 500),
        ),
      };
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/pdf')) {
      const detail = await response.text().catch(() => '');
      return {
        kind: 'error',
        error: new LatexCompileError(
          'LaTeX compile service returned a non-PDF response.',
          response.status,
          detail.slice(0, 500),
        ),
      };
    }

    const pdf = Buffer.from(await response.arrayBuffer());

    // Every valid PDF starts with %PDF-. Cheap guard against a truncated body
    // or a proxy error page arriving with the wrong content-type.
    if (!pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      return {
        kind: 'error',
        error: new LatexCompileError('LaTeX compile service returned malformed PDF data.'),
      };
    }

    return { kind: 'pdf', pdf };
  }

  /** Retries transient network failures and 5xx with backoff. Never retries 422. */
  private async post(tex: string, attempt = 0): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: tex }),
        signal: controller.signal,
      });

      if (response.status >= 500 && attempt < 2) {
        clearTimeout(timer);
        await sleep(2_000 * (attempt + 1));
        return this.post(tex, attempt + 1);
      }

      return response;
    } catch (error) {
      if (attempt < 2) {
        clearTimeout(timer);
        await sleep(1_000 * (attempt + 1));
        return this.post(tex, attempt + 1);
      }
      throw new LatexCompileError(
        error instanceof Error && error.name === 'AbortError'
          ? 'LaTeX compilation timed out.'
          : 'Could not reach the LaTeX compile service.',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
