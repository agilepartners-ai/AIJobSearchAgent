import { accessTokenOrNull } from '../../lib/api/authedFetch';
import { clearSession, currentUser, getUser, onSessionChange, setSession, setUser } from '../../lib/auth/session';
import type { AuthProvider, AuthUser, PasswordChangeData, PasswordResetData, ProfileUpdateData, SignInData, SignUpData } from '../authService';

/** Our own sign-in: the /api/auth/* endpoints, with accounts in our database. */
async function call<T = unknown>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (init.auth) {
    const t = await accessTokenOrNull();
    if (!t) throw new Error('You must be signed in.');
    headers.Authorization = `Bearer ${t}`;
  }
  let res: Response;
  try {
    res = await fetch(`/api/auth/${path}`, { method: init.method ?? 'GET', headers, credentials: 'same-origin', body: init.body === undefined ? undefined : JSON.stringify(init.body) });
  } catch {
    throw new Error('Network error. Check your connection and try again.');
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error || 'Authentication failed. Please try again.');
  return data as T;
}

interface SessionBody {
  accessToken: string;
  expiresAt: number;
  user: AuthUser;
}

const PENDING = 'pendingVerificationEmail';

export class CustomAuthProvider implements AuthProvider {
  async signUp(data: SignUpData): Promise<AuthUser> {
    const r = await call<{ status: string } & Partial<SessionBody>>('signup', { method: 'POST', body: { email: data.email, password: data.password, fullName: data.fullName ?? '', phone: data.phone ?? '' } });
    if (r.status === 'signed_in' && r.accessToken && r.user) {
      // The site cannot send email right now, so the account was opened directly (unconfirmed) and the person is signed in.
      setSession(r as SessionBody);
      return r.user;
    }
    try { sessionStorage.setItem(PENDING, data.email); } catch { /* private mode */ }
    // No account exists until the emailed link is used; this is only the address to show on the "check your email" page.
    return { id: '', email: data.email, displayName: data.fullName ?? null, phoneNumber: data.phone ?? null, emailVerified: false };
  }

  async signIn(data: SignInData): Promise<AuthUser> {
    const s = await call<SessionBody>('login', { method: 'POST', body: { email: data.email, password: data.password } });
    setSession(s);
    return s.user;
  }

  async signInWithGoogle(): Promise<void> {
    window.location.assign('/api/auth/google/start');
  }

  async signOut(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'ajsa' } });
    } finally {
      clearSession();
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return getUser();
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    await call('forgot', { method: 'POST', body: { email } });
  }

  async sendPasswordReset(data: PasswordResetData): Promise<void> {
    if (data.method !== 'email' || !data.email) throw new Error('Password reset by SMS is not available. Use your email.');
    return this.sendPasswordResetEmail(data.email);
  }

  /** The link in the reset email: sets the password and signs the person in. */
  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    setSession(await call<SessionBody>('reset', { method: 'POST', body: { token, password: newPassword } }));
  }

  async changePassword(data: PasswordChangeData): Promise<void> {
    await call('change-password', { method: 'POST', auth: true, body: { currentPassword: data.currentPassword ?? '', newPassword: data.newPassword } });
  }

  async updateProfile(updates: ProfileUpdateData): Promise<AuthUser> {
    const u = await call<AuthUser>('me', { method: 'PATCH', auth: true, body: { fullName: updates.displayName, phone: updates.phone } });
    setUser(u);
    return u;
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    return onSessionChange(callback);
  }

  async sendEmailVerification(): Promise<void> {
    const email = currentUser()?.email ?? (() => { try { return sessionStorage.getItem(PENDING); } catch { return null; } })();
    if (!email) throw new Error('Enter your email on the sign-up page to resend the confirmation email.');
    await call('resend', { method: 'POST', body: { email } });
  }

  /** The link in the confirmation email: creates the account and signs the person in. */
  async verifyEmail(token: string): Promise<void> {
    setSession(await call<SessionBody>('verify', { method: 'POST', body: { token } }));
    try { sessionStorage.removeItem(PENDING); } catch { /* private mode */ }
  }
}

/** What the sign-in and sign-up screens may offer (email sending and Google are optional parts of the setup). */
export interface AuthFeatures {
  email: boolean;
  google: boolean;
  /** Whether new accounts can be made at all. */
  signup: boolean;
  /** Whether sign-up confirms the address by email (false: the account opens at once, unconfirmed). */
  verifiedSignup: boolean;
}

export async function authFeatures(): Promise<AuthFeatures> {
  try {
    const res = await fetch('/api/auth/config', { credentials: 'same-origin' });
    if (res.ok) {
      const f = (await res.json()) as Partial<AuthFeatures>;
      return { email: !!f.email, google: !!f.google, signup: f.signup ?? !!f.email, verifiedSignup: f.verifiedSignup ?? !!f.email };
    }
  } catch { /* offline: fall through */ }
  return { email: true, google: false, signup: true, verifiedSignup: true };
}
