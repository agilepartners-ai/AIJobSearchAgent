import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  User,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  phone_verified: boolean;
  membership_status: 'free' | 'premium' | 'enterprise';
  created_at: string;
  updated_at: string;
}

export class AuthService {
  // Sign up with email and password
  static async signUp(email: string, password: string, phone?: string): Promise<User> {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore
      const userProfile: Omit<UserProfile, 'id'> = {
        email: user.email!,
        phone: phone || '',
        phone_verified: false,
        membership_status: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      
      return user;
    } catch (error: any) {
      console.error('Error signing up:', error);
      throw new Error(error.message || 'Failed to create account');
    }
  }

  // Sign in with email and password
  static async signIn(email: string, password: string): Promise<User> {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      return user;
    } catch (error: any) {
      console.error('Error signing in:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  // Sign out
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error('Error signing out:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  }

  // Send password reset email
  static async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }

  // Get user profile from Firestore
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as UserProfile;
      }
      
      return null;
    } catch (error: any) {
      console.error('Error getting user profile:', error);
      throw new Error(error.message || 'Failed to get user profile');
    }
  }

  // Update user profile
  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId);
      await setDoc(docRef, {
        ...updates,
        updated_at: new Date().toISOString()
      }, { merge: true });
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      throw new Error(error.message || 'Failed to update user profile');
    }
  }

  // Get current user
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }
}