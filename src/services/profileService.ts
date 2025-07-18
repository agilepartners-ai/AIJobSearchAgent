import { FirebaseDBService } from './firebaseDBService';

export interface UserProfileData {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  portfolio?: string;
  github?: string;
  linkedin?: string;
  resume_url?: string;
  cover_letter_template?: string;
  subscription_status?: string;
}

export class ProfileService {
  private static basePath(userId: string) {
    return `users/${userId}/profile`;
  }

  static async getUserProfile(userId: string): Promise<UserProfileData | null> {
    return FirebaseDBService.read<UserProfileData>(this.basePath(userId));
  }

  static async updateUserProfile(userId: string, profileData: Partial<UserProfileData>): Promise<void> {
    return FirebaseDBService.update(this.basePath(userId), profileData);
  }

  static async getOrCreateProfile(userId: string, email: string, fullName?: string): Promise<UserProfileData> {
    let profile = await this.getUserProfile(userId);
    if (!profile) {
      profile = {
        email,
        fullName: fullName || '',
        subscription_status: 'free',
      };
      await FirebaseDBService.create(this.basePath(userId), profile);
    }
    return profile;
  }
}
