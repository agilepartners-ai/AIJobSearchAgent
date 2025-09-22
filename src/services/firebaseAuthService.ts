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
      await firebaseSendPasswordResetEmail(auth, email);
    } catch (error) {
      const errorMessage = this.getPasswordResetErrorMessage(error as AuthError);
      throw new Error(errorMessage);
    }
  }

  private static getPasswordResetErrorMessage(error: AuthError): string {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address';
      case 'auth/invalid-email':
        return 'Please enter a valid email address';
      case 'auth/too-many-requests':
        return 'Too many requests. Please wait before trying again';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again';
      default:
        return 'Failed to send password reset email. Please try again';
    }
  }

  static async updatePassword(newPassword: string): Promise<void> {
    if (!auth.currentUser) throw new Error('No user is signed in.');
    try {
      await firebaseUpdatePassword(auth.currentUser, newPassword);
    } catch (error) {
      throw new Error('Failed to update password');
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
