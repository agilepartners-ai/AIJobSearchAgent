import { db } from '../lib/firebase';
import { ref, set, get, child } from 'firebase/database';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  created_at?: string;
}

export class FirebaseProfileService {
  static async getOrCreateProfile(uid: string, email: string, fullName: string): Promise<Profile> {
    const profileRef = ref(db, `users/${uid}`);
    const snapshot = await get(profileRef);

    if (snapshot.exists()) {
      return snapshot.val() as Profile;
    } else {
      const newProfile: Profile = {
        id: uid,
        email,
        full_name: fullName,
        created_at: new Date().toISOString(),
      };
      await set(profileRef, newProfile);
      return newProfile;
    }
  }
}
