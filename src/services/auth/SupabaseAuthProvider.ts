import type { AuthError, User } from '@supabase/supabase-js';
import { getSupabase } from '../../lib/supabase/client';
import type {
  AuthProvider,
  AuthUser,
  PasswordChangeData,
  PasswordResetData,
  ProfileUpdateData,
  SignInData,
  SignUpData,
} from '../authService';

/** Plain-language messages; Supabase's own are terse and some leak whether an account exists. */
function friendly(error: AuthError | Error): Error {
  const code = (error as AuthError).code ?? '';
  const message = error.message ?? '';
  const map: Record<string, string> = {
    invalid_credentials: 'Incorrect email or password.',
    email_not_confirmed: 'Please confirm your email first. Check your inbox for the link.',
    user_already_exists: 'An account with this email already exists. Try signing in.',
    email_exists: 'An account with this email already exists. Try signing in.',
    weak_password: 'Choose a stronger password (at least 8 characters).',
    over_email_send_rate_limit: 'Too many emails sent. Please wait a few minutes and try again.',
    over_request_rate_limit: 'Too many attempts. Please wait a moment and try again.',
    same_password: 'Your new password must be different from the current one.',
    signup_disabled: 'Sign-ups are currently disabled.',
  };
  if (map[code]) return new Error(map[code]);
  if (/failed to fetch|network/i.test(message)) return new Error('Network error. Check your connection and try again.');
  return new Error(message || 'Authentication failed. Please try again.');
}

function toAuthUser(user: User): AuthUser {
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: (meta.full_name as string) || (meta.name as string) || null,
    phoneNumber: (meta.phone as string) || user.phone || null,
    emailVerified: !!user.email_confirmed_at,
  };
}

const origin = () => (typeof window !== 'undefined' ? window.location.origin : '');

export class SupabaseAuthProvider implements AuthProvider {
  private get auth() {
    return getSupabase().auth;
  }

  async signUp(data: SignUpData): Promise<AuthUser> {
    const { data: res, error } = await this.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.fullName ?? '', phone: data.phone ?? '' },
        emailRedirectTo: `${origin()}/dashboard`,
      },
    });
    if (error) throw friendly(error);
    if (!res.user) throw new Error('Could not create the account. Please try again.');
    // An existing confirmed address comes back as a user with no identities (anti-enumeration).
    if (res.user.identities && res.user.identities.length === 0) {
      throw new Error('An account with this email already exists. Try signing in.');
    }
    try { sessionStorage.setItem('pendingVerificationEmail', data.email); } catch { /* private mode */ }
    return toAuthUser(res.user);
  }

  async signIn(data: SignInData): Promise<AuthUser> {
    const { data: res, error } = await this.auth.signInWithPassword({ email: data.email, password: data.password });
    if (error) throw friendly(error);
    return toAuthUser(res.user);
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await this.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin()}/dashboard`, queryParams: { prompt: 'select_account' } },
    });
    if (error) throw friendly(error);
  }

  async signOut(): Promise<void> {
    const { error } = await this.auth.signOut();
    if (error) throw friendly(error);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    // getSession reads local storage (no network); the API re-verifies every token server-side.
    const { data } = await this.auth.getSession();
    return data.session ? toAuthUser(data.session.user) : null;
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    const { error } = await this.auth.resetPasswordForEmail(email, { redirectTo: `${origin()}/reset-password` });
    if (error) throw friendly(error);
  }

  async sendPasswordReset(data: PasswordResetData): Promise<void> {
    if (data.method !== 'email' || !data.email) throw new Error('Password reset by SMS is not available. Use your email.');
    return this.sendPasswordResetEmail(data.email);
  }

  async changePassword(data: PasswordChangeData): Promise<void> {
    const { error } = await this.auth.updateUser({ password: data.newPassword });
    if (error) throw friendly(error);
  }

  async updateProfile(updates: ProfileUpdateData): Promise<AuthUser> {
    const meta: Record<string, string> = {};
    if (updates.displayName !== undefined) meta.full_name = updates.displayName;
    if (updates.phone !== undefined) meta.phone = updates.phone;
    const { data, error } = await this.auth.updateUser({ data: meta });
    if (error) throw friendly(error);
    return toAuthUser(data.user);
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const { data } = this.auth.onAuthStateChange((_event, session) => {
      callback(session ? toAuthUser(session.user) : null);
    });
    return () => data.subscription.unsubscribe();
  }

  async sendEmailVerification(): Promise<void> {
    const { data } = await this.auth.getSession();
    let email = data.session?.user.email;
    if (!email) {
      try { email = sessionStorage.getItem('pendingVerificationEmail') ?? undefined; } catch { /* private mode */ }
    }
    if (!email) throw new Error('Enter your email on the sign-up page to resend the confirmation email.');
    const { error } = await this.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${origin()}/dashboard` } });
    if (error) throw friendly(error);
  }
}
