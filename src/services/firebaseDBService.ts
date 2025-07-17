import { db } from '../lib/firebase';
import { ref, set, get, update, remove, push, child } from 'firebase/database';

export class FirebaseDBService {
  static async create<T>(path: string, data: T): Promise<string> {
    const listRef = ref(db, path);
    const newItemRef = push(listRef);
    await set(newItemRef, data);
    return newItemRef.key!;
  }

  static async read<T>(path: string): Promise<T | null> {
    const dbRef = ref(db, path);
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
      return snapshot.val() as T;
    } else {
      return null;
    }
  }

  static async update<T>(path: string, data: Partial<T>): Promise<void> {
    const dbRef = ref(db, path);
    await update(dbRef, data);
  }

  static async delete(path: string): Promise<void> {
    const dbRef = ref(db, path);
    await remove(dbRef);
  }

  static async getList<T>(path: string): Promise<T[]> {
    const dbRef = ref(db, path);
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map(key => ({ ...data[key], id: key }));
    } else {
      return [];
    }
  }
}
