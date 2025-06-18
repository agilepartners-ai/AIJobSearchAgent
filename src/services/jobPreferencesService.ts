import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const COLLECTION_NAME = 'jobPreferences';

export interface JobPreferencesData {
  // Job Titles of Interest
  jobTitles: string[];
  
  // Preferred Industries
  preferredIndustries: string[];
  
  // Companies of Interest
  companiesOfInterest: string[];
  
  // Job Titles/Industries/Companies of No Interest
  noInterestJobTitles: string[];
  noInterestIndustries: string[];
  noInterestCompanies: string[];
  
  // Geographic Preferences
  willingToRelocate: boolean;
  preferredLocations: string[];
  notPreferredLocations: string[];
  travelPercentage: string;
  
  // Salary Expectations
  expectedSalaryFrom: string;
  expectedSalaryTo: string;
  currentSalaryFrom: string;
  currentSalaryTo: string;
  
  // Job Postings for Reference
  referenceJobPostings: string[];
  
  // Metadata
  created_at?: string;
  updated_at?: string;
}

export class JobPreferencesService {
  // Save user job preferences
  static async saveUserJobPreferences(userId: string, preferencesData: JobPreferencesData): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, userId);
      await setDoc(docRef, {
        ...preferencesData,
        updated_at: serverTimestamp(),
        created_at: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving job preferences:', error);
      throw new Error('Failed to save job preferences');
    }
  }

  // Get user job preferences
  static async getUserJobPreferences(userId: string): Promise<JobPreferencesData | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
          updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at
        } as JobPreferencesData;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting job preferences:', error);
      throw new Error('Failed to get job preferences');
    }
  }
}