/**
 * Database Factory
 * 
 * Creates and manages database adapter instances based on configuration
 */

import { IDatabase, DatabaseConfig } from './interfaces/IDatabase';
import { FirebaseAdapter } from './adapters/FirebaseAdapter';
import { PostgreSQLAdapter } from './adapters/PostgreSQLAdapter';

export class DatabaseFactory {
  private static instance: IDatabase | null = null;
  private static config: DatabaseConfig | null = null;

  /**
   * Initialize the database with configuration
   */
  static async initialize(config: DatabaseConfig): Promise<void> {
    this.config = config;
    this.instance = this.createAdapter(config);
    await this.instance.connect();
  }

  /**
   * Get the current database instance
   */
  static getInstance(): IDatabase {
    if (!this.instance) {
      throw new Error('Database not initialized. Call DatabaseFactory.initialize() first.');
    }
    return this.instance;
  }

  /**
   * Create a database adapter based on configuration
   */
  private static createAdapter(config: DatabaseConfig): IDatabase {
    switch (config.type) {
      case 'firebase':
        return new FirebaseAdapter(config);
      
      case 'postgresql':
        return new PostgreSQLAdapter(config);
      
      // Add more database types as needed
      case 'mongodb':
        throw new Error('MongoDB adapter not implemented yet');
      
      case 'mysql':
        throw new Error('MySQL adapter not implemented yet');
      
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }

  /**
   * Switch to a different database configuration
   */
  static async switchDatabase(config: DatabaseConfig): Promise<void> {
    if (this.instance) {
      await this.instance.disconnect();
    }
    await this.initialize(config);
  }

  /**
   * Close the current database connection
   */
  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.disconnect();
      this.instance = null;
      this.config = null;
    }
  }

  /**
   * Get current database configuration
   */
  static getConfig(): DatabaseConfig | null {
    return this.config;
  }

  /**
   * Check if database is initialized and connected
   */
  static isInitialized(): boolean {
    return this.instance !== null && this.instance.isConnected();
  }
}

/**
 * Convenience function to get database instance
 */
export const getDatabase = (): IDatabase => {
  return DatabaseFactory.getInstance();
};

/**
 * Database configuration from environment variables
 */
export const getDatabaseConfig = (): DatabaseConfig => {
  const dbType = process.env.DATABASE_TYPE || 'firebase';

  switch (dbType) {
    case 'firebase':
      return {
        type: 'firebase',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      };

    case 'postgresql':
      return {
        type: 'postgresql',
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        database: process.env.DATABASE_NAME,
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        ssl: process.env.DATABASE_SSL === 'true',
      };

    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
};