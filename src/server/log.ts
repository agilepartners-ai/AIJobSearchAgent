/**
 * Request-scoped pipeline logging.
 *
 * One line per stage, all tagged with the same request id, so a single
 * generation can be followed end to end by searching the terminal for its id:
 *
 *   [generate rid=k3Jx9aQp2m] +1843ms llm {"calls":1,"promptTokens":1718,...}
 *
 * The id is created by the browser and sent with the request, so the same id
 * appears in the browser console and in the server log (and in the error the
 * user sees). Never log résumé text, tokens/keys, or full job descriptions:
 * only sizes, ids and outcomes.
 */

export interface RequestLog {
  readonly id: string;
  step(name: string, data?: Record<string, unknown>): void;
  warn(name: string, data?: Record<string, unknown>): void;
  error(name: string, error: unknown, data?: Record<string, unknown>): void;
}

const SAFE_ID = /^[A-Za-z0-9_-]{8,64}$/;

/** A client-supplied request id is only trusted if it is a plain short token. */
export function cleanRequestId(value: unknown): string | null {
  return typeof value === 'string' && SAFE_ID.test(value) ? value : null;
}

const compact = (data?: Record<string, unknown>) => (data && Object.keys(data).length ? ` ${JSON.stringify(data)}` : '');

export function createRequestLog(scope: string, id: string, sink: Pick<Console, 'info' | 'warn' | 'error'> = console): RequestLog {
  const started = Date.now();
  const prefix = (name: string) => `[${scope} rid=${id}] +${Date.now() - started}ms ${name}`;

  return {
    id,
    step: (name, data) => sink.info(`${prefix(name)}${compact(data)}`),
    warn: (name, data) => sink.warn(`${prefix(name)}${compact(data)}`),
    error: (name, error, data) => {
      const err = error instanceof Error ? error : new Error(String(error));
      // The stack's first frames are enough to find the throw site without flooding the log.
      const frames = (err.stack ?? '').split('\n').slice(1, 5).map((l) => l.trim()).join(' | ');
      sink.error(`${prefix(name)} ${err.name}: ${err.message}${compact(data)}${frames ? ` @ ${frames}` : ''}`);
    },
  };
}
