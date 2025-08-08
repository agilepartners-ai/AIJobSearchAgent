/**
 * Database Initialization
 * 
 * Initialize the database based on environment configuration
 */

import { DatabaseFactory, getDatabaseConfig } from './DatabaseFactory';

/**
 * Initialize the database with environment-based configuration
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const config = getDatabaseConfig();
    console.log(`Initializing database: ${config.type}`);
    
    await DatabaseFactory.initialize(config);
    
    console.log(`Database initialized successfully: ${config.type}`);
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Initialize database for Next.js application
 * Call this in your _app.tsx or layout component
 */
export async function initializeDatabaseForNextJS(): Promise<void> {
  // Only initialize on client side to avoid SSR issues
  if (typeof window !== 'undefined') {
    if (!DatabaseFactory.isInitialized()) {
      await initializeDatabase();
    }
  }
}