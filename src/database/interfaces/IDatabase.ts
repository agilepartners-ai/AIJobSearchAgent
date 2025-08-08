/**
 * Database Abstraction Layer Interfaces
 * 
 * This file defines the contract that any database implementation must follow.
 * This allows us to easily switch between Firebase, PostgreSQL, or other databases.
 */

export interface DatabaseDocument {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  where?: WhereClause[];
}

export interface WhereClause {
  field: string;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not-in' | 'array-contains';
  value: any;
}

export interface DatabaseResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

/**
 * Core database operations interface
 */
export interface IDatabase {
  // Document operations
  create<T extends Record<string, any>>(collection: string, data: T): Promise<string>;
  read<T extends DatabaseDocument>(collection: string, id: string): Promise<T | null>;
  update<T extends Record<string, any>>(collection: string, id: string, data: Partial<T>): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  set<T extends Record<string, any>>(collection: string, id: string, data: T): Promise<void>;

  // Collection operations
  list<T extends DatabaseDocument>(collection: string, options?: QueryOptions): Promise<DatabaseResult<T>>;
  query<T extends DatabaseDocument>(collection: string, options: QueryOptions): Promise<DatabaseResult<T>>;

  // Nested document operations (for subcollections)
  createNested<T extends Record<string, any>>(parentCollection: string, parentId: string, childCollection: string, data: T): Promise<string>;
  readNested<T extends DatabaseDocument>(parentCollection: string, parentId: string, childCollection: string, childId: string): Promise<T | null>;
  updateNested<T extends Record<string, any>>(parentCollection: string, parentId: string, childCollection: string, childId: string, data: Partial<T>): Promise<void>;
  deleteNested(parentCollection: string, parentId: string, childCollection: string, childId: string): Promise<void>;
  listNested<T extends DatabaseDocument>(parentCollection: string, parentId: string, childCollection: string, options?: QueryOptions): Promise<DatabaseResult<T>>;

  // Transaction support
  transaction<T>(callback: (transaction: ITransaction) => Promise<T>): Promise<T>;

  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

/**
 * Transaction interface for atomic operations
 */
export interface ITransaction {
  create<T extends Record<string, any>>(collection: string, data: T): Promise<string>;
  read<T extends DatabaseDocument>(collection: string, id: string): Promise<T | null>;
  update<T extends Record<string, any>>(collection: string, id: string, data: Partial<T>): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  set<T extends Record<string, any>>(collection: string, id: string, data: T): Promise<void>;
}

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  type: 'firebase' | 'postgresql' | 'mongodb' | 'mysql';
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  // Firebase specific
  projectId?: string;
  apiKey?: string;
  authDomain?: string;
  // Additional provider-specific options
  options?: Record<string, any>;
}