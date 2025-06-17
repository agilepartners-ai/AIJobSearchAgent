import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAAvFzIm85R0C9Y5_AnhqpU7enInd2jwJU",
  authDomain: "myjobsearchagent.firebaseapp.com",
  projectId: "myjobsearchagent",
  storageBucket: "myjobsearchagent.firebasestorage.app",
  messagingSenderId: "948357728656",
  appId: "1:948357728656:web:5c1f7ef5658d7efcd0cb15",
  measurementId: "G-3V87TEMNEV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
