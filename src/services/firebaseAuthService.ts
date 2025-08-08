import { auth, db } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile,
  User,
  AuthError,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

// Re-defining interfaces here, ideally these would be in a shared types file.
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

export class FirebaseAuthService {
  private static convertUser(user: User): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
    };
  }

  static async signUp(data: SignUpData): Promise<AuthUser> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      await firebaseUpdateProfile(user, {
        displayName: data.fullName,
      });

      // 🔄 Store additional user data in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        fullName: data.fullName || '',
        phone: data.phone || '',
        email: user.email,
      });

      return this.convertUser(user);
    } catch (error) {
      throw new Error((error as AuthError).message || 'Failed to create account');
    }
  }

  static async signIn(data: SignInData): Promise<AuthUser> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      return this.convertUser(userCredential.user);
    } catch (error) {
      throw new Error((error as AuthError).message || 'Failed to sign in');
    }
  }

  static async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      throw new Error('Failed to sign out');
    }
  }

  static getCurrentUser(): Promise<AuthUser | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user ? this.convertUser(user) : null);
      });
    });
  }

  static async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      // Validate email format
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      // Check if we're in browser environment
      const continueUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/login`
        : process.env.NEXT_PUBLIC_APP_URL 
          ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
          : 'https://your-app-domain.com/login'; // fallback

      await firebaseSendPasswordResetEmail(auth, email, {
        // Customize the email template
        url: continueUrl,
        handleCodeInApp: false,
      });
    } catch (error) {
      const authError = error as AuthError;
      
      // Handle specific Firebase auth errors
      switch (authError.code) {
        case 'auth/user-not-found':
          throw new Error('No account found with this email address');
        case 'auth/invalid-email':
          throw new Error('Invalid email address');
        case 'auth/too-many-requests':
          throw new Error('Too many password reset requests. Please try again later');
        case 'auth/network-request-failed':
          throw new Error('Network error. Please check your connection and try again');
        default:
          throw new Error(authError.message || 'Failed to send password reset email');
      }
    }
  }

  static async updatePassword(newPassword: string): Promise<void> {
    if (!auth.currentUser) throw new Error('No user is signed in.');
    
    try {
      // Validate password strength
      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      await firebaseUpdatePassword(auth.currentUser, newPassword);
    } catch (error) {
      const authError = error as AuthError;
      
      switch (authError.code) {
        case 'auth/weak-password':
          throw new Error('Password is too weak. Please choose a stronger password');
        case 'auth/requires-recent-login':
          throw new Error('Please sign in again before changing your password');
        default:
          throw new Error(authError.message || 'Failed to update password');
      }
    }
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
  } {
    const errors: string[] = [];
    let score = 0;

    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    } else if (password.length >= 8) {
      score += 1;
    }

    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (password.length >= 6 && score < 2) {
      errors.push('Password should contain a mix of letters, numbers, and symbols');
    }

    const strength = score <= 2 ? 'weak' : score <= 3 ? 'medium' : 'strong';

    return {
      isValid: password.length >= 6 && errors.length === 0,
      errors,
      strength
    };
  }

  /**
   * Check if email exists in the system (for password reset validation)
   */
  static async checkEmailExists(email: string): Promise<boolean> {
    try {
      // This is a workaround since Firebase doesn't provide a direct way to check if email exists
      // We'll try to send a password reset email and catch the user-not-found error
      await firebaseSendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      const authError = error as AuthError;
      if (authError.code === 'auth/user-not-found') {
        return false;
      }
      // If it's any other error, assume the email exists
      return true;
    }
  }

  static async updateProfile(updates: { displayName?: string; phone?: string }): Promise<AuthUser> {
    if (!auth.currentUser) throw new Error('No user is signed in.');
    try {
      if (updates.displayName) {
        await firebaseUpdateProfile(auth.currentUser, { displayName: updates.displayName });
      }

      // 🔄 Update Firestore user document
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userDocRef, {
        ...(updates.phone && { phone: updates.phone }),
        ...(updates.displayName && { fullName: updates.displayName }),
      });

      return this.convertUser(auth.currentUser);
    } catch (error) {
      throw new Error('Failed to update profile');
    }
  }

  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return onAuthStateChanged(auth, (user) => {
      callback(user ? this.convertUser(user) : null);
    });
  }
}

export default FirebaseAuthService;

