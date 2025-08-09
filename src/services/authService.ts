// Abstract authentication interfaces
export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  emailVerified?: boolean;
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

export interface PasswordResetData {
  email?: string;
  phoneNumber?: string;
  method: 'email' | 'sms';
}

export interface PasswordChangeData {
  currentPassword?: string;
  newPassword: string;
}

export interface ProfileUpdateData {
  displayName?: string;
  phone?: string;
}

// Abstract authentication provider interface
export interface AuthProvider {
  // Authentication methods
  signUp(data: SignUpData): Promise<AuthUser>;
  signIn(data: SignInData): Promise<AuthUser>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
  
  // Password management
  sendPasswordResetEmail(email: string): Promise<void>;
  sendPasswordResetSMS?(phoneNumber: string): Promise<void>;
  sendPasswordReset(data: PasswordResetData): Promise<void>;
  verifyPasswordResetCode?(code: string, identifier: string): Promise<boolean>;
  changePassword(data: PasswordChangeData): Promise<void>;
  
  // Profile management
  updateProfile(updates: ProfileUpdateData): Promise<AuthUser>;
  
  // State management
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
  
  // Email verification
  sendEmailVerification?(): Promise<void>;
  verifyEmail?(token: string): Promise<void>;
}

// Main authentication service
export class AuthService {
  private static provider: AuthProvider | null = null;

  static setProvider(provider: AuthProvider) {
    this.provider = provider;
  }

  static getProvider(): AuthProvider {
    if (!this.provider) {
      throw new Error('Authentication provider not initialized');
    }
    return this.provider;
  }

  static async initializeProvider() {
    const { getAuthConfig } = await import('../config/authConfig');
    const config = getAuthConfig();
    
    switch (config.provider) {
      case 'firebase':
        const { FirebaseAuthProvider } = await import('./auth/FirebaseAuthProvider');
        this.setProvider(new FirebaseAuthProvider());
        break;
      case 'auth0':
        // TODO: Implement Auth0 provider
        throw new Error('Auth0 provider not implemented yet');
      case 'supabase':
        // TODO: Implement Supabase provider
        throw new Error('Supabase provider not implemented yet');
      case 'custom':
        // TODO: Implement custom provider
        throw new Error('Custom provider not implemented yet');
      default:
        throw new Error(`Unknown auth provider: ${config.provider}`);
    }
  }

  // Delegate all methods to the current provider
  static async signUp(data: SignUpData): Promise<AuthUser> {
    return this.getProvider().signUp(data);
  }

  static async signIn(data: SignInData): Promise<AuthUser> {
    return this.getProvider().signIn(data);
  }

  static async signOut(): Promise<void> {
    return this.getProvider().signOut();
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    return this.getProvider().getCurrentUser();
  }

  static async sendPasswordResetEmail(email: string): Promise<void> {
    return this.getProvider().sendPasswordResetEmail(email);
  }

  static async sendPasswordResetSMS(phoneNumber: string): Promise<void> {
    const provider = this.getProvider();
    if (provider.sendPasswordResetSMS) {
      return provider.sendPasswordResetSMS(phoneNumber);
    }
    throw new Error('SMS password reset not supported by current provider');
  }

  static async sendPasswordReset(data: PasswordResetData): Promise<void> {
    return this.getProvider().sendPasswordReset(data);
  }

  static async verifyPasswordResetCode(code: string, identifier: string): Promise<boolean> {
    const provider = this.getProvider();
    if (provider.verifyPasswordResetCode) {
      return provider.verifyPasswordResetCode(code, identifier);
    }
    throw new Error('Password reset code verification not supported by current provider');
  }

  static async changePassword(data: PasswordChangeData): Promise<void> {
    return this.getProvider().changePassword(data);
  }

  static async updateProfile(updates: ProfileUpdateData): Promise<AuthUser> {
    return this.getProvider().updateProfile(updates);
  }

  static onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    return this.getProvider().onAuthStateChange(callback);
  }

  static async sendEmailVerification(): Promise<void> {
    const provider = this.getProvider();
    if (provider.sendEmailVerification) {
      return provider.sendEmailVerification();
    }
    throw new Error('Email verification not supported by current provider');
  }

  static async verifyEmail(token: string): Promise<void> {
    const provider = this.getProvider();
    if (provider.verifyEmail) {
      return provider.verifyEmail(token);
    }
    throw new Error('Email verification not supported by current provider');
  }
}