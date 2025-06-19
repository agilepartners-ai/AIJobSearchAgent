/**
 * Environment variables validation utility
 * Ensures all required environment variables are properly configured
 */

export interface EnvironmentConfig {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
  jsearch: {
    apiKey: string;
    apiHost: string;
  };
}

export class EnvironmentValidator {
  /**
   * Validates that all required environment variables are present
   * @throws Error if any required environment variables are missing
   */
  static validateEnvironment(): EnvironmentConfig {
    const config: EnvironmentConfig = {
      firebase: {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
      },
      jsearch: {
        apiKey: import.meta.env.VITE_JSEARCH_API_KEY,
        apiHost: import.meta.env.VITE_JSEARCH_API_HOST || 'jsearch.p.rapidapi.com',
      },
    };    // Check Firebase configuration
    const missingFirebaseVars = Object.entries(config.firebase)
      .filter(([, value]) => !value || value.trim() === '')
      .map(([key]) => `VITE_FIREBASE_${key.toUpperCase()}`);

    // Check JSearch configuration
    const missingJSearchVars = Object.entries(config.jsearch)
      .filter(([, value]) => !value || value.trim() === '')
      .map(([key]) => `VITE_JSEARCH_${key === 'apiKey' ? 'API_KEY' : 'API_HOST'}`);

    const missingVars = [...missingFirebaseVars, ...missingJSearchVars];

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}. ` +
        'Please check your .env file and ensure all variables are properly configured.'
      );
    }

    return config;
  }

  /**
   * Logs the current environment configuration status (without exposing sensitive data)
   */
  static logEnvironmentStatus(): void {
    try {
      const config = this.validateEnvironment();
      
      console.log('✅ Environment Configuration Status:');
      console.log('  🔥 Firebase: Configured');
      console.log(`    - Project ID: ${config.firebase.projectId}`);
      console.log(`    - Auth Domain: ${config.firebase.authDomain}`);
      console.log('  🔍 JSearch API: Configured');
      console.log(`    - API Host: ${config.jsearch.apiHost}`);
      console.log(`    - API Key: ${config.jsearch.apiKey ? '***configured***' : 'MISSING'}`);
      
    } catch (error) {
      console.error('❌ Environment Configuration Error:', error);
    }
  }
}

export default EnvironmentValidator;
