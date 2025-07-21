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

export interface UpdateProfileData {
  displayName?: string;
  phoneNumber?: string;
}

class FirebaseAuthService {
  // Helper method to check if Firebase is initialized and ready
  private static isFirebaseReady(): boolean {
    return auth !== null && auth !== undefined && typeof auth === 'object';
  }

  // Helper method to throw error if Firebase is not ready
  private static ensureFirebaseReady(): void {
    if (!this.isFirebaseReady()) {
      throw new Error('Firebase authentication is not available. This may be due to missing configuration or the app running in build mode.');
    }
  }

  static async signUp(data: SignUpData): Promise<AuthUser> {
    this.ensureFirebaseReady();
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth!, data.email, data.password);
      const user = userCredential.user;

      // Update profile if fullName is provided
      if (data.fullName) {
        await firebaseUpdateProfile(user, {
          displayName: data.fullName,
        });
      }

      // Create user document in Firestore if db is available
      if (db && typeof db === 'object') {
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: data.fullName || null,
          phone: data.phone || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        phoneNumber: user.phoneNumber,
      };
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(authError.message || 'Failed to create account');
    }
  }

  static async signIn(data: SignInData): Promise<AuthUser> {
    this.ensureFirebaseReady();
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth!, data.email, data.password);
      const user = userCredential.user;

      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        phoneNumber: user.phoneNumber,
      };
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(authError.message || 'Failed to sign in');
    }
  }

  static async signOut(): Promise<void> {
    this.ensureFirebaseReady();
    
    try {
      await firebaseSignOut(auth!);
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(authError.message || 'Failed to sign out');
    }
  }

  static async sendPasswordResetEmail(email: string): Promise<void> {
    this.ensureFirebaseReady();
    
    try {
      await firebaseSendPasswordResetEmail(auth!, email);
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(authError.message || 'Failed to send password reset email');
    }
  }

  static async updatePassword(newPassword: string): Promise<void> {
    this.ensureFirebaseReady();
    
    const user = auth!.currentUser;
    if (!user) {
      throw new Error('No authenticated user found');
    }

    try {
      await firebaseUpdatePassword(user, newPassword);
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(authError.message || 'Failed to update password');
    }
  }

  static async updateProfile(data: UpdateProfileData): Promise<void> {
    this.ensureFirebaseReady();
    
    const user = auth!.currentUser;
    if (!user) {
      throw new Error('No authenticated user found');
    }

    try {
      // Update Firebase Auth profile
      await firebaseUpdateProfile(user, {
        displayName: data.displayName,
      });

      // Update Firestore document if db is available
      if (db && typeof db === 'object') {
        await updateDoc(doc(db, 'users', user.uid), {
          displayName: data.displayName || null,
          phoneNumber: data.phoneNumber || null,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(authError.message || 'Failed to update profile');
    }
  }

  static onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    if (!this.isFirebaseReady()) {
      // Return a no-op unsubscribe function if Firebase is not ready
      console.warn('Firebase authentication not available, auth state monitoring disabled');
      return () => {};
    }
    
    return onAuthStateChanged(auth!, (user: User | null) => {
      if (user) {
        callback({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          phoneNumber: user.phoneNumber,
        });
      } else {
        callback(null);
      }
    });
  }

  static getCurrentUser(): AuthUser | null {
    if (!this.isFirebaseReady()) {
      return null;
    }

    const currentUser = auth!.currentUser;
    if (!currentUser) {
      return null;
    }

    return {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
      phoneNumber: currentUser.phoneNumber,
    };
  }

  // Helper method to check if Firebase is available (useful for components)
  static isAvailable(): boolean {
    return this.isFirebaseReady();
  }
}

export default FirebaseAuthService;
