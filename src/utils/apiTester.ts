/**
 * API Test Utility
 * Simple functions to test if the integrated APIs are working correctly
 */

import { JobSearchService } from '../services/jobSearchService';
import { EnvironmentValidator } from './environmentValidator';

export class APITester {
  /**
   * Test Firebase connection (basic check)
   */
  static async testFirebaseConnection(): Promise<boolean> {
    try {
      const config = EnvironmentValidator.validateEnvironment();
      console.log('🔥 Firebase configuration validated:', {
        projectId: config.firebase.projectId,
        authDomain: config.firebase.authDomain
      });
      return true;
    } catch (error) {
      console.error('❌ Firebase configuration test failed:', error);
      return false;
    }
  }

  /**
   * Test JSearch API connection with a simple search
   */
  static async testJSearchAPI(): Promise<boolean> {
    try {
      console.log('🔍 Testing JSearch API...');
      
      const testParams = {
        jobProfile: 'software developer',
        experience: 'Experienced' as const,
        location: 'Chicago',
        numPages: 1
      };

      const response = await JobSearchService.searchJobs(testParams);
      
      if (response.success && response.jobs) {
        console.log('✅ JSearch API test successful!');
        console.log(`   Found ${response.jobs.length} job results`);
        console.log(`   Search criteria: ${response.search_criteria.job_profile} in ${response.search_criteria.location}`);
        
        if (response.jobs.length > 0) {
          console.log(`   Sample job: "${response.jobs[0].title}" at "${response.jobs[0].company}"`);
        }
        
        return true;
      } else {
        console.warn('⚠️ JSearch API returned no results');
        return false;
      }
      
    } catch (error) {
      console.error('❌ JSearch API test failed:', error);
      return false;
    }
  }

  /**
   * Run all API tests
   */
  static async runAllTests(): Promise<{ firebase: boolean; jsearch: boolean }> {
    console.log('🧪 Running API Tests...');
    
    const firebaseResult = await this.testFirebaseConnection();
    const jsearchResult = await this.testJSearchAPI();
    
    console.log('📊 Test Results:');
    console.log(`   Firebase: ${firebaseResult ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   JSearch API: ${jsearchResult ? '✅ PASS' : '❌ FAIL'}`);
    
    return {
      firebase: firebaseResult,
      jsearch: jsearchResult
    };
  }
}

// Export for use in browser console or debugging
(window as any).APITester = APITester;

export default APITester;
