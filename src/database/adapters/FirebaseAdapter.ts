/**
 * Firebase Database Adapter
 * 
 * Implements the IDatabase interface for Firebase Firestore
 */

import { db } from '../../lib/firebase';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryConstraint,
  runTransaction,
  Transaction,
  WithFieldValue,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';

import {
  IDatabase,
  ITransaction,
  DatabaseDocument,
  QueryOptions,
  WhereClause,
  DatabaseResult,
  DatabaseConfig
} from '../interfaces/IDatabase';

export class FirebaseAdapter implements IDatabase {
  private connected: boolean = false;

  constructor(private config?: DatabaseConfig) {}

  async connect(): Promise<void> {
    // Firebase connection is handled by the SDK initialization
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    // Firebase doesn't require explicit disconnection
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Document operations
  async create<T extends Record<string, any>>(collectionName: string, data: T): Promise<string> {
    const collectionRef = collection(db, collectionName);
    const docRef = await addDoc(collectionRef, {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as WithFieldValue<DocumentData>);
    return docRef.id;
  }

  async read<T extends DatabaseDocument>(collectionName: string, id: string): Promise<T | null> {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as T;
    }
    
    return null;
  }

  async update<T extends Record<string, any>>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updated_at: new Date().toISOString()
    } as Partial<WithFieldValue<DocumentData>>);
  }

  async delete(collectionName: string, id: string): Promise<void> {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  }

  async set<T extends Record<string, any>>(collectionName: string, id: string, data: T): Promise<void> {
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, {
      ...data,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as WithFieldValue<DocumentData>);
  }

  // Collection operations
  async list<T extends DatabaseDocument>(collectionName: string, options?: QueryOptions): Promise<DatabaseResult<T>> {
    return this.query<T>(collectionName, options || {});
  }

  async query<T extends DatabaseDocument>(collectionName: string, options: QueryOptions): Promise<DatabaseResult<T>> {
    const collectionRef = collection(db, collectionName);
    const constraints: QueryConstraint[] = [];

    // Add where clauses
    if (options.where) {
      options.where.forEach(clause => {
        constraints.push(where(clause.field, clause.operator as any, clause.value));
      });
    }

    // Add ordering
    if (options.orderBy) {
      constraints.push(orderBy(options.orderBy, options.orderDirection || 'asc'));
    }

    // Add limit
    if (options.limit) {
      constraints.push(limit(options.limit));
    }

    const q = query(collectionRef, ...constraints);
    const querySnapshot = await getDocs(q);

    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as T));

    return {
      data,
      total: data.length,
      hasMore: data.length === (options.limit || 0)
    };
  }

  // Nested document operations
  async createNested<T extends Record<string, any>>(
    parentCollection: string,
    parentId: string,
    childCollection: string,
    data: T
  ): Promise<string> {
    const nestedCollectionRef = collection(db, parentCollection, parentId, childCollection);
    const docRef = await addDoc(nestedCollectionRef, {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as WithFieldValue<DocumentData>);
    return docRef.id;
  }

  async readNested<T extends DatabaseDocument>(
    parentCollection: string,
    parentId: string,
    childCollection: string,
    childId: string
  ): Promise<T | null> {
    const docRef = doc(db, parentCollection, parentId, childCollection, childId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as T;
    }
    
    return null;
  }

  async updateNested<T extends Record<string, any>>(
    parentCollection: string,
    parentId: string,
    childCollection: string,
    childId: string,
    data: Partial<T>
  ): Promise<void> {
    const docRef = doc(db, parentCollection, parentId, childCollection, childId);
    await updateDoc(docRef, {
      ...data,
      updated_at: new Date().toISOString()
    } as Partial<WithFieldValue<DocumentData>>);
  }

  async deleteNested(
    parentCollection: string,
    parentId: string,
    childCollection: string,
    childId: string
  ): Promise<void> {
    const docRef = doc(db, parentCollection, parentId, childCollection, childId);
    await deleteDoc(docRef);
  }

  async listNested<T extends DatabaseDocument>(
    parentCollection: string,
    parentId: string,
    childCollection: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<T>> {
    const nestedCollectionRef = collection(db, parentCollection, parentId, childCollection);
    const constraints: QueryConstraint[] = [];

    // Add where clauses
    if (options?.where) {
      options.where.forEach(clause => {
        constraints.push(where(clause.field, clause.operator as any, clause.value));
      });
    }

    // Add ordering
    if (options?.orderBy) {
      constraints.push(orderBy(options.orderBy, options.orderDirection || 'asc'));
    }

    // Add limit
    if (options?.limit) {
      constraints.push(limit(options.limit));
    }

    const q = query(nestedCollectionRef, ...constraints);
    const querySnapshot = await getDocs(q);

    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as T));

    return {
      data,
      total: data.length,
      hasMore: data.length === (options?.limit || 0)
    };
  }

  // Transaction support
  async transaction<T>(callback: (transaction: ITransaction) => Promise<T>): Promise<T> {
    return runTransaction(db, async (firebaseTransaction) => {
      const transactionAdapter = new FirebaseTransactionAdapter(firebaseTransaction);
      return callback(transactionAdapter);
    });
  }
}

/**
 * Firebase Transaction Adapter
 */
class FirebaseTransactionAdapter implements ITransaction {
  constructor(private transaction: Transaction) {}

  async create<T extends Record<string, any>>(collectionName: string, data: T): Promise<string> {
    const collectionRef = collection(db, collectionName);
    const docRef = doc(collectionRef);
    this.transaction.set(docRef, {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as WithFieldValue<DocumentData>);
    return docRef.id;
  }

  async read<T extends DatabaseDocument>(collectionName: string, id: string): Promise<T | null> {
    const docRef = doc(db, collectionName, id);
    const docSnap = await this.transaction.get(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as T;
    }
    
    return null;
  }

  async update<T extends Record<string, any>>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(db, collectionName, id);
    this.transaction.update(docRef, {
      ...data,
      updated_at: new Date().toISOString()
    } as Partial<WithFieldValue<DocumentData>>);
  }

  async delete(collectionName: string, id: string): Promise<void> {
    const docRef = doc(db, collectionName, id);
    this.transaction.delete(docRef);
  }

  async set<T extends Record<string, any>>(collectionName: string, id: string, data: T): Promise<void> {
    const docRef = doc(db, collectionName, id);
    this.transaction.set(docRef, {
      ...data,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as WithFieldValue<DocumentData>);
  }
}