import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Aggressive build-time detection
const isServer = typeof window === 'undefined';
const isBuild = process.env.NODE_ENV === 'production' && isServer;
const isNextBuild = process.env.NEXT_PHASE === 'phase-production-build';

// Validate Firebase configuration
const hasValidConfig = firebaseConfig.apiKey && 
                      firebaseConfig.authDomain && 
                      firebaseConfig.projectId &&
                      firebaseConfig.apiKey !== 'undefined' &&
                      firebaseConfig.apiKey !== '';

let app: any = null;
let auth: any = null;
let db: any = null;
let analytics: any = null;

// Only initialize Firebase in browser environment with valid config
if (!isServer && !isBuild && !isNextBuild && hasValidConfig) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    analytics = getAnalytics(app);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
    app = null;
    auth = null;
    db = null;
    analytics = null;
  }
} else {
  console.log('Firebase initialization skipped:', {
    isServer,
    isBuild,
    isNextBuild,
    hasValidConfig,
    apiKeyPresent: !!firebaseConfig.apiKey
  });
}

export { app, auth, db, analytics };
