import { db } from '../lib/firebase';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  WithFieldValue,
  DocumentData
} from 'firebase/firestore';

export class FirebaseDBService {
  // Create a new document in a collection and return its ID
  static async create<T extends WithFieldValue<DocumentData>>(collectionPath: string, data: T): Promise<string> {
    if (!collectionPath || typeof collectionPath !== 'string') {
      throw new Error(`[Firestore] Invalid collection path: "${collectionPath}"`);
    }

    const collectionRef = collection(db, collectionPath);
    const newDocRef = await addDoc(collectionRef, data);
    return newDocRef.id;
  }

  // Read a single document from Firestore
  static async read<T>(documentPath: string): Promise<T | null> {
    if (!documentPath || typeof documentPath !== 'string') {
      throw new Error(`[Firestore] Invalid document path: "${documentPath}"`);
    }

    const pathSegments = documentPath.split('/');
    if (pathSegments.length % 2 !== 0) {
      throw new Error(`[Firestore] Document path must have an even number of segments: "${documentPath}"`);
    }

    const docRef = doc(db, documentPath); // ✅ FIXED
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? (snapshot.data() as T) : null;
  }

  // Update specific fields in a document
  static async update<T extends Partial<WithFieldValue<DocumentData>>>(documentPath: string, data: T): Promise<void> {
    if (!documentPath || typeof documentPath !== 'string') {
      throw new Error(`[Firestore] Invalid document path: "${documentPath}"`);
    }

    const pathSegments = documentPath.split('/');
    if (pathSegments.length % 2 !== 0) {
      throw new Error(`[Firestore] Document path must have an even number of segments: "${documentPath}"`);
    }

    const docRef = doc(db, documentPath); // ✅ FIXED
    await updateDoc(docRef, data);
  }

  // Set (overwrite) a document entirely
  static async set<T extends WithFieldValue<DocumentData>>(documentPath: string, data: T): Promise<void> {
    if (!documentPath || typeof documentPath !== 'string') {
      throw new Error(`[Firestore] Invalid document path: "${documentPath}"`);
    }

    const pathSegments = documentPath.split('/');
    if (pathSegments.length % 2 !== 0) {
      throw new Error(`[Firestore] Document path must have an even number of segments: "${documentPath}"`);
    }

    const docRef = doc(db, documentPath); // ✅ FIXED
    await setDoc(docRef, data);
  }

  // Delete a document
  static async delete(documentPath: string): Promise<void> {
    if (!documentPath || typeof documentPath !== 'string') {
      throw new Error(`[Firestore] Invalid document path: "${documentPath}"`);
    }

    const pathSegments = documentPath.split('/');
    if (pathSegments.length % 2 !== 0) {
      throw new Error(`[Firestore] Document path must have an even number of segments: "${documentPath}"`);
    }

    const docRef = doc(db, documentPath); // ✅ FIXED
    await deleteDoc(docRef);
  }

  // Fetch all documents in a collection as an array
  static async getList<T = DocumentData>(collectionPath: string): Promise<(T & { id: string })[]> {
    if (!collectionPath || typeof collectionPath !== 'string') {
      throw new Error(`[Firestore] Invalid collection path: "${collectionPath}"`);
    }

    const collectionRef = collection(db, collectionPath);
    const querySnapshot = await getDocs(collectionRef);
    return querySnapshot.docs.map(docSnap => ({
      ...(docSnap.data() as T),
      id: docSnap.id
    }));
  }
}







