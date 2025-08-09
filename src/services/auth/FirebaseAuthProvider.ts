import { auth, db } from '../../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile,
  sendEmailVerification as firebaseSendEmailVerification,
  User,
  AuthError,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { 
  AuthProvider, 
  AuthUser, 
  SignUpData, 
  SignInData, 
  PasswordChangeData, 
  ProfileUpdateData,
  PasswordResetData
} from '../authService';

export class FirebaseAuthProvider implements AuthProvider {
  private convertUser(user: User): AuthUser {
    return {
      id: user.uid,
      email: user.email,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      emailVerified: user.emailVerified,
    };
  }

  async signUp(data: SignUpData): Promise<AuthUser> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      // Update profile with display name
      if (data.fullName) {
        await firebaseUpdateProfile(user, {
          displayName: data.fullName,
        });
      }

      // Store additional user data in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        fullName: data.fullName || '',
        phone: data.phone || '',
        email: user.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return this.convertUser(user);
    } catch (error) {
      throw new Error((error as AuthError).message || 'Failed to create account');
    }
  }

  async signIn(data: SignInData): Promise<AuthUser> {
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

  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      throw new Error('Failed to sign out');
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user ? this.convertUser(user) : null);
      });
    });
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await firebaseSendPasswordResetEmail(auth, email);
    } catch (error) {
      throw new Error('Failed to send password reset email');
    }
  }

  async sendPasswordResetSMS(phoneNumber: string): Promise<void> {
    // Firebase doesn't have built-in SMS password reset
    // This would require Firebase Functions + SMS service (Twilio, AWS SNS, etc.)
    console.log(`SMS password reset would be sent to: ${phoneNumber}`);
    throw new Error('SMS password reset not implemented for Firebase provider yet');
  }

  async sendPasswordReset(data: PasswordResetData): Promise<void> {
    if (data.method === 'email' && data.email) {
      return this.sendPasswordResetEmail(data.email);
    } else if (data.method === 'sms' && data.phoneNumber) {
      return this.sendPasswordResetSMS(data.phoneNumber);
    } else {
      throw new Error('Invalid password reset data');
    }
  }

  async verifyPasswordResetCode(code: string, identifier: string): Promise<boolean> {
    // Firebase handles password reset through email links, not codes
    // For SMS-based reset, this would verify the SMS code
    console.log(`Would verify code ${code} for ${identifier}`);
    return true; // Placeholder implementation
  }

  async changePassword(data: PasswordChangeData): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('No user is signed in');
    }

    try {
      await firebaseUpdatePassword(auth.currentUser, data.newPassword);
    } catch (error) {
      throw new Error('Failed to update password');
    }
  }

  async updateProfile(updates: ProfileUpdateData): Promise<AuthUser> {
    if (!auth.currentUser) {
      throw new Error('No user is signed in');
    }

    try {
      // Update Firebase Auth profile
      if (updates.displayName) {
        await firebaseUpdateProfile(auth.currentUser, { 
          displayName: updates.displayName 
        });
      }

      // Update Firestore user document
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const updateData: { [key: string]: any } = {
        updatedAt: new Date(),
      };

      if (updates.phone) updateData.phone = updates.phone;
      if (updates.displayName) updateData.fullName = updates.displayName;

      await updateDoc(userDocRef, updateData);

      return this.convertUser(auth.currentUser);
    } catch (error) {
      throw new Error('Failed to update profile');
    }
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(auth, (user) => {
      callback(user ? this.convertUser(user) : null);
    });
  }

  async sendEmailVerification(): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('No user is signed in');
    }

    try {
      await firebaseSendEmailVerification(auth.currentUser);
    } catch (error) {
      throw new Error('Failed to send email verification');
    }
  }

  // Note: Firebase handles email verification through links, not tokens
  async verifyEmail(token: string): Promise<void> {
    // This would typically be handled by Firebase's email verification flow
    // For custom implementation, you might need to use Firebase Admin SDK
    throw new Error('Email verification with token not implemented for Firebase provider');
  }
}