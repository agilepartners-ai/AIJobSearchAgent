/**
 * Which runtime is this code running in?
 *
 * The same code serves two homes: Node (local dev, the VM generation service) and Cloudflare Workers
 * (the public site). They differ in two ways that matter here: a Worker cannot keep a database connection
 * between requests, and it has a hard CPU limit. See docs/CLOUDFLARE_MIGRATION_SCOPE.md.
 */
export function isWorkers(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
}

export interface WorkerBindings {
  HYPERDRIVE?: { connectionString: string };
}

export interface WorkerContext {
  env: WorkerBindings;
  waitUntil: (promise: Promise<unknown>) => void;
}

/** Bindings and execution context of the current request. Only valid on Workers. */
export async function workerContext(): Promise<WorkerContext> {
  const { getCloudflareContext } = await import('@opennextjs/cloudflare');
  const { env, ctx } = await getCloudflareContext({ async: true });
  return { env: env as unknown as WorkerBindings, waitUntil: (p) => ctx.waitUntil(p) };
}
