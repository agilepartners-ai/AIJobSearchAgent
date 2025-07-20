import { db } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  DocumentReference,
  DocumentData
} from 'firebase/firestore';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  resume_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  created_at?: string;
}

export class FirebaseProfileService {
  static async getOrCreateProfile(
    uid: string,
    email: string,
    fullName: string
  ): Promise<Profile> {
    const profileDocRef: DocumentReference<DocumentData> = doc(db, 'users', uid);
    const docSnap = await getDoc(profileDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as Profile;
      return { ...data, id: uid };
    } else {
      const newProfile: Profile = {
        id: uid,
        email,
        full_name: fullName,
        created_at: new Date().toISOString(),
      };
      await setDoc(profileDocRef, newProfile);
      return newProfile;
    }
  }
}
