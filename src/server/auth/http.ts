/**
 * The /api/auth/* endpoints (one catch-all route). Runs on the VM; the Worker forwards here (see proxy.ts).
 *
 * Browser contract: sign-in answers with a short-lived access token in the body (kept in memory by the page) and a refresh
 * token in an HttpOnly, SameSite=Lax cookie that only /api/auth ever receives. POSTs must come from our own origin.
 */
import { timingSafeEqual } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { DbConfigError } from '../db/pool';
import { finishGoogle, GOOGLE_COOKIE, googleConfigured, startGoogle } from './google';
import * as auth from './service';
import { AuthError, type ClientInfo, type SessionResult } from './service';
import { AuthConfigError, UnauthenticatedError, requireUser } from './verify';

export const REFRESH_COOKIE = 'ajsa_rt';

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://agilepartners-ai.com').replace(/\/+$/, '');
const secureCookies = () => siteUrl().startsWith('https://');

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** The visitor's address. The Worker passes it along with a shared secret; without that secret the header is not believed. */
export function clientInfo(req: NextApiRequest): ClientInfo {
  const h = (n: string) => {
    const v = req.headers[n];
    return typeof v === 'string' ? v : undefined;
  };
  const secret = process.env.EDGE_SHARED_SECRET;
  const edge = h('x-ajsa-edge');
  let ip: string | undefined;
  if (secret && edge && safeEqual(edge, secret)) ip = h('x-ajsa-client-ip');
  ip ??= h('cf-connecting-ip') ?? h('x-forwarded-for')?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown';
  return { ip: ip.slice(0, 64), userAgent: h('user-agent') ?? '' };
}

function allowedOrigins(): Set<string> {
  const out = new Set([siteUrl(), ...(process.env.AUTH_ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean)]);
  if (process.env.NODE_ENV !== 'production') out.add('http://localhost:3000');
  return out;
}

/** State-changing requests must come from our own pages. Browsers always send Origin on a POST. */
function checkOrigin(req: NextApiRequest, needsHeader: boolean): void {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins().has(origin)) throw new AuthError(403, 'This request is not allowed from here.', 'bad_origin');
  if (needsHeader && req.headers['x-requested-with'] !== 'ajsa') throw new AuthError(403, 'This request is not allowed from here.', 'bad_origin');
}

function cookieFrom(req: NextApiRequest, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

function setCookies(res: NextApiResponse, cookies: string[]): void {
  const prior = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', [...(Array.isArray(prior) ? prior : prior ? [String(prior)] : []), ...cookies]);
}

const cookie = (name: string, value: string, maxAge: number) =>
  `${name}=${value}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureCookies() ? '; Secure' : ''}`;

function sessionResponse(res: NextApiResponse, s: SessionResult) {
  setCookies(res, [cookie(REFRESH_COOKIE, s.refreshToken, s.refreshMaxAgeSeconds)]);
  return { accessToken: s.accessToken, expiresAt: s.expiresAt, user: s.user };
}

const only = (req: NextApiRequest, res: NextApiResponse, ...methods: string[]): boolean => {
  if (methods.includes(req.method ?? '')) return true;
  res.setHeader('Allow', methods.join(', '));
  res.status(405).json({ error: 'Method not allowed' });
  return false;
};

const body = (req: NextApiRequest): Record<string, unknown> => (req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {});

export async function handleAuth(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  const action = (Array.isArray(req.query.action) ? req.query.action : [req.query.action ?? '']).join('/');
  const info = clientInfo(req);
  try {
    switch (action) {
      case 'config':
        if (!only(req, res, 'GET')) return;
        return void res.status(200).json(auth.authFeatures());

      case 'signup':
        if (!only(req, res, 'POST')) return;
        checkOrigin(req, false);
        {
          const r = await auth.signUp({ email: body(req).email, password: body(req).password, fullName: body(req).fullName, phone: body(req).phone }, info);
          return void res.status(200).json('refreshToken' in r ? { status: 'signed_in', ...sessionResponse(res, r) } : r);
        }

      case 'resend':
        if (!only(req, res, 'POST')) return;
        checkOrigin(req, false);
        return void res.status(200).json(await auth.resendSignup(body(req).email, info));

      case 'verify': {
        if (!only(req, res, 'POST')) return;
        checkOrigin(req, false);
        return void res.status(200).json(sessionResponse(res, await auth.verifySignup(body(req).token, info)));
      }

      case 'login':
        if (!only(req, res, 'POST')) return;
        checkOrigin(req, false);
        return void res.status(200).json(sessionResponse(res, await auth.signIn({ email: body(req).email, password: body(req).password }, info)));

      case 'refresh': {
        if (!only(req, res, 'POST')) return;
        checkOrigin(req, true);
        try {
          return void res.status(200).json(sessionResponse(res, await auth.refresh(cookieFrom(req, REFRESH_COOKIE), info)));
        } catch (e) {
          // A dead session also clears the cookie, so the browser stops sending it.
          if (e instanceof AuthError && e.status === 401) setCookies(res, [cookie(REFRESH_COOKIE, '', 0)]);
          throw e;
        }
      }

      case 'logout':
        if (!only(req, res, 'POST')) return;
        checkOrigin(req, true);
        await auth.signOut(cookieFrom(req, REFRESH_COOKIE));
        setCookies(res, [cookie(REFRESH_COOKIE, '', 0)]);
        return void res.status(204).end();

      case 'forgot':
        if (!only(req, res, 'POST')) return;
        checkOrigin(req, false);
        return void res.status(200).json(await auth.forgotPassword(body(req).email, info));

      case 'reset':
        if (!only(req, res, 'POST')) return;
        checkOrigin(req, false);
        return void res.status(200).json(sessionResponse(res, await auth.resetPassword({ token: body(req).token, password: body(req).password }, info)));

      case 'change-password': {
        if (!only(req, res, 'POST')) return;
        checkOrigin(req, false);
        const caller = await requireUser(req);
        await auth.changePassword({ userId: caller.userId, sessionId: caller.sessionId }, { currentPassword: body(req).currentPassword, newPassword: body(req).newPassword }, info);
        return void res.status(204).end();
      }

      case 'me': {
        if (!only(req, res, 'GET', 'PATCH')) return;
        const caller = await requireUser(req);
        if (req.method === 'PATCH') {
          checkOrigin(req, false);
          return void res.status(200).json(await auth.updateProfile(caller.userId, { fullName: body(req).fullName, phone: body(req).phone }));
        }
        return void res.status(200).json(await auth.me(caller.userId));
      }

      case 'google/start': {
        if (!only(req, res, 'GET')) return;
        if (!googleConfigured()) return void res.redirect(302, '/login?error=google_unavailable');
        const g = startGoogle();
        setCookies(res, [cookie(GOOGLE_COOKIE, g.cookieValue, g.maxAge)]);
        return void res.redirect(302, g.url);
      }

      case 'google/callback': {
        if (!only(req, res, 'GET')) return;
        const clear = cookie(GOOGLE_COOKIE, '', 0);
        const code = typeof req.query.code === 'string' ? req.query.code : '';
        const state = typeof req.query.state === 'string' ? req.query.state : '';
        if (!googleConfigured() || !code || !state || req.query.error) {
          setCookies(res, [clear]);
          return void res.redirect(302, '/login?error=google_cancelled');
        }
        try {
          const profile = await finishGoogle({ code, state, cookie: cookieFrom(req, GOOGLE_COOKIE) });
          const session = await auth.signInWithGoogleProfile(profile, info);
          setCookies(res, [clear, cookie(REFRESH_COOKIE, session.refreshToken, session.refreshMaxAgeSeconds)]);
          return void res.redirect(302, '/dashboard');
        } catch (e) {
          console.error('[auth] google sign-in failed:', e instanceof Error ? e.message : e);
          setCookies(res, [clear]);
          const code2 = e instanceof AuthError && e.code === 'google_unverified' ? 'google_unverified' : 'google_failed';
          return void res.redirect(302, `/login?error=${code2}`);
        }
      }

      default:
        return void res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return void res.status(error.status).json({ error: error.message, code: error.code });
    }
    if (error instanceof UnauthenticatedError) return void res.status(401).json({ error: error.message, code: 'unauthenticated' });
    if (error instanceof AuthConfigError || error instanceof DbConfigError) {
      console.error('[auth] misconfigured:', error.message);
      return void res.status(500).json({ error: 'Server configuration error.' });
    }
    console.error('[auth] failed:', error instanceof Error ? error.message : error);
    return void res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
