/**
 * PostgreSQL Database Adapter
 * 
 * Implements the IDatabase interface for PostgreSQL
 * This is a template implementation - you'll need to install pg and @types/pg
 */

import {
  IDatabase,
  ITransaction,
  DatabaseDocument,
  QueryOptions,
  WhereClause,
  DatabaseResult,
  DatabaseConfig
} from '../interfaces/IDatabase';

// Note: You'll need to install these packages:
// npm install pg @types/pg
// import { Pool, PoolClient } from 'pg';

export class PostgreSQLAdapter implements IDatabase {
  private pool: any; // Pool from 'pg'
  private connected: boolean = false;

  constructor(private config: DatabaseConfig) {
    // Initialize PostgreSQL connection pool
    // this.pool = new Pool({
    //   host: config.host,
    //   port: config.port || 5432,
    //   database: config.database,
    //   user: config.username,
    //   password: config.password,
    //   ssl: config.ssl,
    //   ...config.options
    // });
  }

  async connect(): Promise<void> {
    try {
      // await this.pool.connect();
      this.connected = true;
      console.log('Connected to PostgreSQL database');
    } catch (error) {
      console.error('Failed to connect to PostgreSQL:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      // await this.pool.end();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Document operations
  async create<T extends Record<string, any>>(tableName: string, data: T): Promise<string> {
    const client = await this.pool.connect();
    try {
      const columns = Object.keys(data).join(', ');
      const values = Object.values(data);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${tableName} (${columns}, created_at, updated_at) 
        VALUES (${placeholders}, NOW(), NOW()) 
        RETURNING id
      `;
      
      const result = await client.query(query, [...values]);
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  async read<T extends DatabaseDocument>(tableName: string, id: string): Promise<T | null> {
    const client = await this.pool.connect();
    try {
      const query = `SELECT * FROM ${tableName} WHERE id = $1`;
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToDocument<T>(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async update<T extends Record<string, any>>(tableName: string, id: string, data: Partial<T>): Promise<void> {
    const client = await this.pool.connect();
    try {
      const entries = Object.entries(data);
      const setClause = entries.map(([key], index) => `${key} = $${index + 2}`).join(', ');
      const values = entries.map(([, value]) => value);
      
      const query = `
        UPDATE ${tableName} 
        SET ${setClause}, updated_at = NOW() 
        WHERE id = $1
      `;
      
      await client.query(query, [id, ...values]);
    } finally {
      client.release();
    }
  }

  async delete(tableName: string, id: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `DELETE FROM ${tableName} WHERE id = $1`;
      await client.query(query, [id]);
    } finally {
      client.release();
    }
  }

  async set<T extends Record<string, any>>(tableName: string, id: string, data: T): Promise<void> {
    const client = await this.pool.connect();
    try {
      // PostgreSQL UPSERT using ON CONFLICT
      const columns = ['id', ...Object.keys(data), 'created_at', 'updated_at'];
      const values = [id, ...Object.values(data)];
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      const updateColumns = Object.keys(data).map(key => `${key} = EXCLUDED.${key}`).join(', ');
      
      const query = `
        INSERT INTO ${tableName} (${columns.join(', ')}) 
        VALUES (${placeholders}, COALESCE($${values.length + 1}, NOW()), NOW())
        ON CONFLICT (id) DO UPDATE SET 
        ${updateColumns}, updated_at = NOW()
      `;
      
      await client.query(query, [...values, data.created_at]);
    } finally {
      client.release();
    }
  }

  // Collection operations
  async list<T extends DatabaseDocument>(tableName: string, options?: QueryOptions): Promise<DatabaseResult<T>> {
    return this.query<T>(tableName, options || {});
  }

  async query<T extends DatabaseDocument>(tableName: string, options: QueryOptions): Promise<DatabaseResult<T>> {
    const client = await this.pool.connect();
    try {
      let query = `SELECT * FROM ${tableName}`;
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Add WHERE clauses
      if (options.where && options.where.length > 0) {
        const whereConditions = options.where.map(clause => {
          queryParams.push(clause.value);
          return `${clause.field} ${this.mapOperator(clause.operator)} $${paramIndex++}`;
        });
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      // Add ORDER BY
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
      }

      // Add LIMIT and OFFSET
      if (options.limit) {
        query += ` LIMIT $${paramIndex++}`;
        queryParams.push(options.limit);
      }

      if (options.offset) {
        query += ` OFFSET $${paramIndex++}`;
        queryParams.push(options.offset);
      }

      const result = await client.query(query, queryParams);
      const data = result.rows.map(row => this.mapRowToDocument<T>(row));

      // Get total count for pagination
      const countQuery = `SELECT COUNT(*) FROM ${tableName}`;
      const countResult = await client.query(countQuery);
      const total = parseInt(countResult.rows[0].count);

      return {
        data,
        total,
        hasMore: (options.offset || 0) + data.length < total
      };
    } finally {
      client.release();
    }
  }

  // Nested operations (using foreign keys in PostgreSQL)
  async createNested<T extends Record<string, any>>(
    parentTable: string,
    parentId: string,
    childTable: string,
    data: T
  ): Promise<string> {
    const foreignKeyField = `${parentTable.slice(0, -1)}_id`; // Remove 's' and add '_id'
    return this.create(childTable, { ...data, [foreignKeyField]: parentId });
  }

  async readNested<T extends DatabaseDocument>(
    parentTable: string,
    parentId: string,
    childTable: string,
    childId: string
  ): Promise<T | null> {
    return this.read<T>(childTable, childId);
  }

  async updateNested<T extends Record<string, any>>(
    parentTable: string,
    parentId: string,
    childTable: string,
    childId: string,
    data: Partial<T>
  ): Promise<void> {
    return this.update(childTable, childId, data);
  }

  async deleteNested(
    parentTable: string,
    parentId: string,
    childTable: string,
    childId: string
  ): Promise<void> {
    return this.delete(childTable, childId);
  }

  async listNested<T extends DatabaseDocument>(
    parentTable: string,
    parentId: string,
    childTable: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<T>> {
    const foreignKeyField = `${parentTable.slice(0, -1)}_id`;
    const whereClause = { field: foreignKeyField, operator: '==' as const, value: parentId };
    const queryOptions = {
      ...options,
      where: [...(options?.where || []), whereClause]
    };
    return this.query<T>(childTable, queryOptions);
  }

  // Transaction support
  async transaction<T>(callback: (transaction: ITransaction) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const transactionAdapter = new PostgreSQLTransactionAdapter(client);
      const result = await callback(transactionAdapter);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Helper methods
  private mapOperator(operator: WhereClause['operator']): string {
    const operatorMap = {
      '==': '=',
      '!=': '!=',
      '<': '<',
      '<=': '<=',
      '>': '>',
      '>=': '>=',
      'in': 'IN',
      'not-in': 'NOT IN',
      'array-contains': '@>' // PostgreSQL array contains operator
    };
    return operatorMap[operator] || '=';
  }

  private mapRowToDocument<T extends DatabaseDocument>(row: any): T {
    return {
      id: row.id,
      ...row,
      created_at: row.created_at?.toISOString(),
      updated_at: row.updated_at?.toISOString()
    } as T;
  }
}

/**
 * PostgreSQL Transaction Adapter
 */
class PostgreSQLTransactionAdapter implements ITransaction {
  constructor(private client: any) {} // PoolClient from 'pg'

  async create<T extends Record<string, any>>(tableName: string, data: T): Promise<string> {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${tableName} (${columns}, created_at, updated_at) 
      VALUES (${placeholders}, NOW(), NOW()) 
      RETURNING id
    `;
    
    const result = await this.client.query(query, [...values]);
    return result.rows[0].id;
  }

  async read<T extends DatabaseDocument>(tableName: string, id: string): Promise<T | null> {
    const query = `SELECT * FROM ${tableName} WHERE id = $1`;
    const result = await this.client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return {
      id: result.rows[0].id,
      ...result.rows[0],
      created_at: result.rows[0].created_at?.toISOString(),
      updated_at: result.rows[0].updated_at?.toISOString()
    } as T;
  }

  async update<T extends Record<string, any>>(tableName: string, id: string, data: Partial<T>): Promise<void> {
    const entries = Object.entries(data);
    const setClause = entries.map(([key], index) => `${key} = $${index + 2}`).join(', ');
    const values = entries.map(([, value]) => value);
    
    const query = `
      UPDATE ${tableName} 
      SET ${setClause}, updated_at = NOW() 
      WHERE id = $1
    `;
    
    await this.client.query(query, [id, ...values]);
  }

  async delete(tableName: string, id: string): Promise<void> {
    const query = `DELETE FROM ${tableName} WHERE id = $1`;
    await this.client.query(query, [id]);
  }

  async set<T extends Record<string, any>>(tableName: string, id: string, data: T): Promise<void> {
    const columns = ['id', ...Object.keys(data), 'created_at', 'updated_at'];
    const values = [id, ...Object.values(data)];
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    const updateColumns = Object.keys(data).map(key => `${key} = EXCLUDED.${key}`).join(', ');
    
    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')}) 
      VALUES (${placeholders}, COALESCE($${values.length + 1}, NOW()), NOW())
      ON CONFLICT (id) DO UPDATE SET 
      ${updateColumns}, updated_at = NOW()
    `;
    
    await this.client.query(query, [...values, data.created_at]);
  }
}