/**
 * Single lazy Firebase Admin initialisation.
 *
 * Previously duplicated in enhance-with-ai.ts and save-generated-pdfs.ts, with
 * different error handling in each — one threw at module load (breaking the
 * whole route on a missing env var), the other returned a 500.
 */
import admin from 'firebase-admin';

export class FirebaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FirebaseConfigError';
  }
}

let initialised = false;

function ensureInitialised(): void {
  if (initialised || admin.apps.length > 0) {
    initialised = true;
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  const missing = [
    !projectId && 'FIREBASE_PROJECT_ID',
    !clientEmail && 'FIREBASE_CLIENT_EMAIL',
    !privateKey && 'FIREBASE_PRIVATE_KEY',
    !storageBucket && 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new FirebaseConfigError(`Missing Firebase environment variables: ${missing.join(', ')}`);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      // Env vars carry \n as a literal two-character sequence.
      privateKey: privateKey!.replace(/\\n/g, '\n'),
    }),
    storageBucket,
  });

  initialised = true;
}

export function getFirestore(): admin.firestore.Firestore {
  ensureInitialised();
  return admin.firestore();
}

export function getBucket() {
  ensureInitialised();
  return admin.storage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
}

export function getAuth(): admin.auth.Auth {
  ensureInitialised();
  return admin.auth();
}

export { admin };
