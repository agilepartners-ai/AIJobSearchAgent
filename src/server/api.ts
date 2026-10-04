/**
 * One place for what every authenticated JSON route needs: method dispatch,
 * the caller's identity, and consistent error responses. The user id comes only
 * from the verified token, never from the request body or URL.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdmin } from './auth/admin';
import { AuthConfigError, requireUser, UnauthenticatedError } from './auth/verify';
import { DbConfigError } from './db/pool';
import { ApplicationValidationError } from './db/applicationsRepo';
import { ResumeValidationError } from './db/resumesRepo';

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

type Ctx = { req: NextApiRequest; res: NextApiResponse; userId: string; email: string | null; admin: boolean };
type Handler = (ctx: Ctx) => Promise<unknown>;

/** A handler returning `undefined` answers 204; anything else is sent as JSON with 200. */
export function route(name: string, methods: Partial<Record<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', Handler>>) {
  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    const run = methods[req.method as keyof typeof methods];
    if (!run) {
      res.setHeader('Allow', Object.keys(methods).join(', '));
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const caller = await requireUser(req);
      const out = await run({ req, res, userId: caller.userId, email: caller.email, admin: isAdmin(caller) });
      if (res.writableEnded) return;
      if (out === undefined) return res.status(204).end();
      return res.status(200).json(out);
    } catch (error) {
      if (error instanceof UnauthenticatedError) return res.status(401).json({ error: error.message });
      if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
      if (error instanceof ApplicationValidationError || error instanceof ResumeValidationError) {
        return res.status(400).json({ error: error.message });
      }
      if (error instanceof AuthConfigError || error instanceof DbConfigError) {
        console.error(`[${name}] misconfigured:`, error.message);
        return res.status(500).json({ error: 'Server configuration error.' });
      }
      console.error(`[${name}] failed:`, error instanceof Error ? error.message : error);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  };
}

export function bodyObject(req: NextApiRequest): Record<string, unknown> {
  const b = req.body;
  if (!b || typeof b !== 'object' || Array.isArray(b)) throw new HttpError(400, 'Expected a JSON object.');
  return b as Record<string, unknown>;
}

export function idParam(req: NextApiRequest): string {
  const id = req.query.id;
  if (typeof id !== 'string' || !id || id.length > 64) throw new HttpError(400, 'Invalid id.');
  return id;
}
