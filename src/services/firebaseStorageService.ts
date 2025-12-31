import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { app as firebaseApp, db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * Firebase Storage Service
 * Handles dynamic URL generation and expiration checking for Firebase Storage files
 */

export class FirebaseStorageService {
  private static get storage() {
    return getStorage(firebaseApp);
  }
  /**
   * Check if a Firebase Storage URL has expired or is about to expire
   * @param url The Firebase Storage signed URL
   * @param bufferMinutes Minutes before expiration to consider URL as expired (default: 60)
   * @returns true if URL is expired or will expire soon
   */
  static isUrlExpired(url: string, bufferMinutes: number = 60): boolean {
    if (!url || typeof url !== 'string') return true;

    try {
      // Check if this is a signed URL with expiration
      const urlObj = new URL(url);
      
      // For signed URLs (v4), extract X-Goog-Date and X-Goog-Expires
      const googDate = urlObj.searchParams.get('X-Goog-Date');
      const googExpires = urlObj.searchParams.get('X-Goog-Expires');
      
      if (googDate && googExpires) {
        // Parse the date: format is like "20250920T133421Z"
        const year = parseInt(googDate.substring(0, 4));
        const month = parseInt(googDate.substring(4, 6)) - 1; // months are 0-indexed
        const day = parseInt(googDate.substring(6, 8));
        const hour = parseInt(googDate.substring(9, 11));
        const minute = parseInt(googDate.substring(11, 13));
        const second = parseInt(googDate.substring(13, 15));
        
        const signedDate = new Date(Date.UTC(year, month, day, hour, minute, second));
        const expirySeconds = parseInt(googExpires);
        const expiryDate = new Date(signedDate.getTime() + expirySeconds * 1000);
        
        // Check if expired or will expire within buffer time
        const now = new Date();
        const bufferMs = bufferMinutes * 60 * 1000;
        return now.getTime() >= (expiryDate.getTime() - bufferMs);
      }
      
      // For token-based URLs, check if the token is in the URL
      const token = urlObj.searchParams.get('token');
      if (!token) {
        // No token means it's either a public URL or gs:// format
        // gs:// format should be converted to downloadURL
        return url.startsWith('gs://');
      }
      
      // If we can't determine expiry, assume it's not expired
      return false;
    } catch (error) {
      console.error('[FirebaseStorageService] Error checking URL expiration:', error);
      // If we can't parse the URL, treat it as expired to trigger refresh
      return true;
    }
  }

  /**
   * Get a fresh download URL for a Firebase Storage file
   * @param storagePath The path to the file in storage (e.g., "ApplicationDocuments/abc123_resume.pdf")
   * @returns A fresh download URL
   */
  static async getDownloadURL(storagePath: string): Promise<string> {
    try {
      const fileRef = ref(this.storage, storagePath);
      const url = await getDownloadURL(fileRef);
      return url;
    } catch (error) {
      console.error('[FirebaseStorageService] Error getting download URL:', error);
      throw new Error(`Failed to get download URL for ${storagePath}`);
    }
  }

  /**
   * Extract storage path from a Firebase Storage URL
   * @param url Firebase Storage URL (signed or gs://)
   * @returns The storage path or null if not a valid Firebase Storage URL
   */
  static extractStoragePath(url: string): string | null {
    if (!url) return null;

    try {
      // Handle gs:// format
      if (url.startsWith('gs://')) {
        const match = url.match(/^gs:\/\/[^\/]+\/(.+)$/);
        return match ? match[1] : null;
      }

      // Handle https://storage.googleapis.com or https://firebasestorage.googleapis.com format
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('googleapis.com')) {
        // Extract path from URL
        const pathMatch = urlObj.pathname.match(/\/[^\/]+\/[^\/]+\/(.+?)(\?|$)/);
        if (pathMatch) {
          return decodeURIComponent(pathMatch[1]);
        }
      }

      return null;
    } catch (error) {
      console.error('[FirebaseStorageService] Error extracting storage path:', error);
      return null;
    }
  }

  /**
   * Refresh a Firebase Storage URL if it's expired
   * @param url Current Firebase Storage URL
   * @param bufferMinutes Minutes before expiration to trigger refresh (default: 60)
   * @returns Fresh URL if refreshed, original URL if still valid
   */
  static async refreshUrlIfExpired(url: string, bufferMinutes: number = 60): Promise<string> {
    if (!url) {
      throw new Error('URL is required');
    }

    // Check if URL is expired or about to expire
    if (!this.isUrlExpired(url, bufferMinutes)) {
      return url; // URL is still valid
    }

    console.log('[FirebaseStorageService] URL expired or expiring soon, refreshing...');

    // Extract storage path from URL
    const storagePath = this.extractStoragePath(url);
    if (!storagePath) {
      console.error('[FirebaseStorageService] Could not extract storage path from URL:', url);
      throw new Error('Invalid Firebase Storage URL format');
    }

    // Get fresh download URL
    try {
      const freshUrl = await this.getDownloadURL(storagePath);
      console.log('[FirebaseStorageService] Successfully refreshed URL');
      return freshUrl;
    } catch (error) {
      console.error('[FirebaseStorageService] Failed to refresh URL:', error);
      throw error;
    }
  }

  /**
   * Batch refresh multiple URLs
   * @param urls Array of Firebase Storage URLs
   * @param bufferMinutes Minutes before expiration to trigger refresh
   * @returns Array of refreshed URLs in the same order
   */
  static async refreshUrlsIfExpired(urls: string[], bufferMinutes: number = 60): Promise<string[]> {
    const promises = urls.map(url => 
      this.refreshUrlIfExpired(url, bufferMinutes).catch(error => {
        console.error('[FirebaseStorageService] Failed to refresh URL:', url, error);
        return url; // Return original URL if refresh fails
      })
    );
    return Promise.all(promises);
  }

  /**
   * Update job application URLs in Firestore
   * @param userId Firebase user ID
   * @param jobApplicationId Job application document ID
   * @param resumeUrl New resume URL (optional)
   * @param coverLetterUrl New cover letter URL (optional)
   */
  static async updateJobApplicationUrls(
    userId: string,
    jobApplicationId: string,
    resumeUrl?: string,
    coverLetterUrl?: string
  ): Promise<void> {
    try {
      const applicationRef = doc(db, 'users', userId, 'jobApplications', jobApplicationId);
      const updates: Record<string, string> = {};
      
      if (resumeUrl !== undefined) {
        updates.resume_url = resumeUrl;
      }
      if (coverLetterUrl !== undefined) {
        updates.cover_letter_url = coverLetterUrl;
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(applicationRef, updates);
        console.log('[FirebaseStorageService] ✅ Updated job application URLs in Firestore');
      }
    } catch (error) {
      console.error('[FirebaseStorageService] Failed to update job application URLs:', error);
      throw error;
    }
  }

  /**
   * Refresh job application URLs and update Firestore
   * @param userId Firebase user ID
   * @param jobApplicationId Job application document ID
   * @param resumeUrl Current resume URL
   * @param coverLetterUrl Current cover letter URL
   * @returns Object with refreshed URLs
   */
  static async refreshAndUpdateJobApplicationUrls(
    userId: string,
    jobApplicationId: string,
    resumeUrl?: string,
    coverLetterUrl?: string
  ): Promise<{ resumeUrl: string | undefined; coverLetterUrl: string | undefined }> {
    let refreshedResumeUrl = resumeUrl;
    let refreshedCoverLetterUrl = coverLetterUrl;
    let needsUpdate = false;

    // Refresh resume URL if provided and expired
    if (resumeUrl) {
      try {
        const newResumeUrl = await this.refreshUrlIfExpired(resumeUrl);
        if (newResumeUrl !== resumeUrl) {
          refreshedResumeUrl = newResumeUrl;
          needsUpdate = true;
        }
      } catch (error) {
        console.error('[FirebaseStorageService] Failed to refresh resume URL:', error);
      }
    }

    // Refresh cover letter URL if provided and expired
    if (coverLetterUrl) {
      try {
        const newCoverLetterUrl = await this.refreshUrlIfExpired(coverLetterUrl);
        if (newCoverLetterUrl !== coverLetterUrl) {
          refreshedCoverLetterUrl = newCoverLetterUrl;
          needsUpdate = true;
        }
      } catch (error) {
        console.error('[FirebaseStorageService] Failed to refresh cover letter URL:', error);
      }
    }

    // Update Firestore if any URLs were refreshed
    if (needsUpdate) {
      await this.updateJobApplicationUrls(
        userId,
        jobApplicationId,
        refreshedResumeUrl,
        refreshedCoverLetterUrl
      );
    }

    return {
      resumeUrl: refreshedResumeUrl,
      coverLetterUrl: refreshedCoverLetterUrl
    };
  }
}

export default FirebaseStorageService;
