import { FirebaseDBService } from './firebaseDBService';
import { JobApplication } from '../types/jobApplication';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export class FirebaseJobApplicationService {
  private static getCollectionPath(userId: string) {
    return `users/${userId}/job_applications`;
  }

  static async getUserApplications(userId: string): Promise<JobApplication[]> {
    const q = query(collection(db, this.getCollectionPath(userId)));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobApplication));
  }

  static async getApplicationStats(userId: string): Promise<{ total: number; interviews: number; offers: number; pending: number }> {
    const applications = await this.getUserApplications(userId);
    const total = applications.length;
    const interviews = applications.filter(app => app.status === 'interviewing').length;
    const offers = applications.filter(app => app.status === 'offered').length;
    const pending = applications.filter(app => !['rejected', 'accepted', 'declined'].includes(app.status)).length;
    return { total, interviews, offers, pending };
  }

  static async addApplication(userId: string, data: Omit<JobApplication, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<JobApplication> {
    const now = new Date().toISOString();
    const applicationData = {
      ...data,
      user_id: userId,
      created_at: now,
      updated_at: now,
    };
    const docId = await FirebaseDBService.create(this.getCollectionPath(userId), applicationData);
    return { id: docId, ...applicationData } as JobApplication;
  }

  static async updateApplication(userId: string, applicationId: string, data: Partial<JobApplication>): Promise<JobApplication> {
    const now = new Date().toISOString();
    const applicationData = {
      ...data,
      updated_at: now,
    };
    await FirebaseDBService.update(`${this.getCollectionPath(userId)}/${applicationId}`, applicationData);
    const updatedDoc = await FirebaseDBService.read<JobApplication>(`${this.getCollectionPath(userId)}/${applicationId}`);
    return { id: applicationId, ...updatedDoc } as JobApplication;
  }

  static async deleteApplication(userId: string, applicationId: string): Promise<void> {
    await FirebaseDBService.delete(`${this.getCollectionPath(userId)}/${applicationId}`);
  }
}
