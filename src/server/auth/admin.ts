import type { Caller } from './verify';

/**
 * Admin accounts: no daily limits. Granted by email address in the ADMIN_EMAILS environment variable
 * (comma-separated, server-side only, never sent to a browser).
 *
 * The address must be one the identity provider has verified: an email/password account cannot sign in
 * until it confirms the address, Google only reports verified addresses, and Supabase applies an email
 * change only after the new address is confirmed. `emailVerified` is checked as well, as a second guard.
 */
export function adminEmails(env: string | undefined = process.env.ADMIN_EMAILS): Set<string> {
  return new Set(
    (env ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdmin(caller: Pick<Caller, 'email' | 'emailVerified'>, env?: string): boolean {
  if (!caller.email || !caller.emailVerified) return false;
  return adminEmails(env).has(caller.email.trim().toLowerCase());
}
