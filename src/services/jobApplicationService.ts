import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { JobApplication } from '../types/jobApplication';

const COLLECTION_NAME = 'jobApplications';

export interface JobApplicationInput {
  company_name: string;
  position: string;
  status: string;
  application_date: string;
  job_posting_url?: string;
  job_description?: string;
  notes?: string;
  resume_url?: string;
  cover_letter_url?: string;
  correspondence_urls?: string[];
}

export class JobApplicationService {
  // Add a new job application
  static async addApplication(userId: string, applicationData: JobApplicationInput): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...applicationData,
        user_id: userId,
        application_date: new Date(applicationData.application_date),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        last_updated: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding application:', error);
      throw new Error('Failed to add application');
    }
  }

  // Get all applications for a user
  static async getUserApplications(userId: string): Promise<JobApplication[]> {
    try {
      // Remove orderBy to avoid composite index requirement
      const q = query(
        collection(db, COLLECTION_NAME),
        where('user_id', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const applications: JobApplication[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        applications.push({
          id: doc.id,
          user_id: data.user_id,
          company_name: data.company_name,
          position: data.position,
          status: data.status,
          application_date: data.application_date instanceof Timestamp 
            ? data.application_date.toDate().toISOString()
            : data.application_date,
          last_updated: data.last_updated instanceof Timestamp 
            ? data.last_updated.toDate().toISOString()
            : data.last_updated,
          job_posting_url: data.job_posting_url,
          job_description: data.job_description,
          notes: data.notes,
          resume_url: data.resume_url,
          cover_letter_url: data.cover_letter_url,
          correspondence_urls: data.correspondence_urls || [],
          created_at: data.created_at instanceof Timestamp 
            ? data.created_at.toDate().toISOString()
            : data.created_at,
          updated_at: data.updated_at instanceof Timestamp 
            ? data.updated_at.toDate().toISOString()
            : data.updated_at
        });
      });
      
      // Sort by application_date in JavaScript instead of Firestore
      applications.sort((a, b) => {
        const dateA = new Date(a.application_date);
        const dateB = new Date(b.application_date);
        return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
      });
      
      return applications;
    } catch (error) {
      console.error('Error fetching applications:', error);
      throw new Error('Failed to fetch applications');
    }
  }

  // Update an existing application
  static async updateApplication(applicationId: string, updates: Partial<JobApplicationInput>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, applicationId);
      const updateData: any = {
        ...updates,
        updated_at: serverTimestamp(),
        last_updated: serverTimestamp()
      };

      // Convert application_date to Date if provided
      if (updates.application_date) {
        updateData.application_date = new Date(updates.application_date);
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating application:', error);
      throw new Error('Failed to update application');
    }
  }

  // Delete an application
  static async deleteApplication(applicationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, applicationId));
    } catch (error) {
      console.error('Error deleting application:', error);
      throw new Error('Failed to delete application');
    }
  }

  // Get application statistics for a user
  static async getApplicationStats(userId: string): Promise<{
    total: number;
    interviews: number;
    offers: number;
    pending: number;
  }> {
    try {
      const applications = await this.getUserApplications(userId);
      
      return {
        total: applications.length,
        interviews: applications.filter(app => app.status === 'interview').length,
        offers: applications.filter(app => app.status === 'offer' || app.status === 'accepted').length,
        pending: applications.filter(app => app.status === 'applied' || app.status === 'screening').length
      };
    } catch (error) {
      console.error('Error getting application stats:', error);
      throw new Error('Failed to get application statistics');
    }
  }
}