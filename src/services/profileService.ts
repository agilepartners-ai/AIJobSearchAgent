import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const COLLECTION_NAME = 'userProfiles';

export interface UserProfileData {
  // Personal Information
  fullName: string;
  streetAddress: string;
  city: string;
  county: string;
  state: string;
  zipCode: string;
  contactNumber: string;
  hasPhoneAccess: boolean;
  gender: string;
  dateOfBirth: string;
  includeAge: boolean;
  ethnicity: string;
  race: string;
  hasDisabilities: boolean;
  disabilityDescription: string;
  veteranStatus: string;
  travelPercentage: string;
  openToTravel: boolean;
  willingToRelocate: boolean;
  canWorkEveningsWeekends: boolean;
  otherLanguages: string;
  nationality: string;
  additionalNationalities: string;
  hasOtherCitizenship: boolean;
  visaType: string;
  expectedSalaryFrom: string;
  expectedSalaryTo: string;
  salaryNotes: string;
  linkedin_url: string; // Added LinkedIn URL field

  // Professional Information
  authorizedToWork: boolean;
  requiresSponsorship: boolean;
  sponsorshipType: string;

  // References
  references: Array<{
    fullName: string;
    relationship: string;
    companyName: string;
    jobTitle: string;
    companyAddress: string;
    phoneNumber: string;
    email: string;
  }>;

  // Education
  education: Array<{
    degreeType: string;
    universityName: string;
    universityAddress: string;
    major: string;
    minor: string;
    timeframeFrom: string;
    timeframeTo: string;
    gpa: string;
  }>;

  // Certifications
  certifications: Array<{
    name: string;
    licenseNumber: string;
    issuingOrganization: string;
    dateAchieved: string;
    expirationDate: string;
  }>;

  // Additional Questions
  governmentEmployment: boolean;
  governmentDetails: string;
  hasAgreements: boolean;
  agreementDetails: string;
  hasConvictions: boolean;
  convictionDetails: string;
  interviewAvailability: string;

  // Metadata
  created_at?: string;
  updated_at?: string;
}

export class ProfileService {
  // Save user profile
  static async saveUserProfile(userId: string, profileData: UserProfileData): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, userId);
      await setDoc(docRef, {
        ...profileData,
        updated_at: serverTimestamp(),
        created_at: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw new Error('Failed to save profile');
    }
  }

  // Get user profile
  static async getUserProfile(userId: string): Promise<UserProfileData | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
          updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at
        } as UserProfileData;
      }

      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('Failed to get profile');
    }
  }
}