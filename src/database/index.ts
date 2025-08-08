/**
 * Database Module Entry Point
 * 
 * Exports all database-related functionality
 */

// Interfaces
export * from './interfaces/IDatabase';

// Adapters
export { FirebaseAdapter } from './adapters/FirebaseAdapter';
export { PostgreSQLAdapter } from './adapters/PostgreSQLAdapter';

// Factory and utilities
export { DatabaseFactory, getDatabase, getDatabaseConfig } from './DatabaseFactory';

// Database initialization
export { initializeDatabase } from './init';