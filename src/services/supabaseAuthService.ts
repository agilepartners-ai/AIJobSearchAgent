import { supabase } from '../lib/supabase';
import { AuthError, User } from '@supabase/supabase-js';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export class SupabaseAuthService {
  // Convert Supabase User to our AuthUser interface
  private static convertUser(user: User): AuthUser {
    return {
      uid: user.id,
      email: user.email || null,
      displayName: user.user_metadata?.full_name || null,
      phoneNumber: user.phone || null,
    };
  }

  // Sign up new user
  static async signUp(data: SignUpData): Promise<AuthUser> {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName || '',
            phone: data.phone || '',
          },
        },
      });

      if (error) throw error;
      if (!authData.user) throw new Error('User creation failed');

      return this.convertUser(authData.user);
    } catch (error) {
      throw new Error(
        error instanceof AuthError 
          ? error.message 
          : 'Failed to create account'
      );
    }
  }

  // Sign in existing user
  static async signIn(data: SignInData): Promise<AuthUser> {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;
      if (!authData.user) throw new Error('Sign in failed');

      return this.convertUser(authData.user);
    } catch (error) {
      throw new Error(
        error instanceof AuthError 
          ? error.message 
          : 'Failed to sign in'
      );
    }
  }

  // Sign out current user
  static async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      throw new Error('Failed to sign out');
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      // Handle expected "Auth session missing!" error gracefully
      if (error && error.message === 'Auth session missing!') {
        return null;
      }
      
      if (error) throw error;
      return user ? this.convertUser(user) : null;
    } catch (error) {
      return null;
    }
  }

  // Send password reset email
  static async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    } catch (error) {
      throw new Error('Failed to send password reset email');
    }
  }

  // Update password
  static async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    } catch (error) {
      throw new Error('Failed to update password');
    }
  }

  // Update user profile
  static async updateProfile(updates: { 
    displayName?: string; 
    phone?: string; 
  }): Promise<AuthUser> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: updates.displayName,
          phone: updates.phone,
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Profile update failed');

      return this.convertUser(data.user);
    } catch (error) {
      throw new Error('Failed to update profile');
    }
  }

  // Listen to auth state changes
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange((_, session) => {
      const user = session?.user ? this.convertUser(session.user) : null;
      callback(user);
    });
  }

  // Verify phone number (if using phone auth)
  static async verifyPhone(phone: string, otp: string): Promise<AuthUser> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;
      if (!data.user) throw new Error('Phone verification failed');

      return this.convertUser(data.user);
    } catch (error) {
      throw new Error('Failed to verify phone number');
    }
  }

  // Send phone OTP
  static async sendPhoneOTP(phone: string): Promise<void> {
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
    } catch (error) {
      throw new Error('Failed to send verification code');
    }
  }
}

export default SupabaseAuthService;