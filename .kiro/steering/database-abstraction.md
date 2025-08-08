---
inclusion: fileMatch
fileMatchPattern: 'src/services/*.ts'
---

# Database Abstraction Layer Guidelines

## Overview
The application uses a database abstraction layer that allows switching between different database backends (Firebase, PostgreSQL, etc.) without changing service code.

## Core Principles
- **Database Agnostic**: Services should work with any database adapter
- **Consistent Interface**: Use the `IDatabase` interface for all database operations
- **Type Safety**: Extend `DatabaseDocument` for all data models
- **Error Handling**: Handle database errors consistently across adapters

## Using the Database Abstraction

### Import Pattern
```typescript
import { getDatabase } from '../database/DatabaseFactory';
import { DatabaseDocument } from '../database/interfaces/IDatabase';
```

### Data Model Pattern
```typescript
export interface YourDataType extends DatabaseDocument {
  user_id: string;
  name: string;
  // other fields
  // Note: id, created_at, updated_at are inherited from DatabaseDocument
}
```

### Service Class Pattern
```typescript
export class YourService {
  private static readonly COLLECTION = 'your_collection';
  private static readonly USER_COLLECTION = 'users';

  static async getData(userId: string): Promise<YourDataType[]> {
    const db = getDatabase();
    const result = await db.query<YourDataType>(this.COLLECTION, {
      where: [{ field: 'user_id', operator: '==', value: userId }],
      orderBy: 'created_at',
      orderDirection: 'desc'
    });
    return result.data;
  }

  static async createData(data: Omit<YourDataType, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const db = getDatabase();
    return await db.create(this.COLLECTION, data);
  }

  static async updateData(id: string, updates: Partial<YourDataType>): Promise<void> {
    const db = getDatabase();
    await db.update(this.COLLECTION, id, updates);
  }

  static async deleteData(id: string): Promise<void> {
    const db = getDatabase();
    await db.delete(this.COLLECTION, id);
  }
}
```

## Database-Specific Handling
When you need database-specific behavior:

```typescript
static async handleNestedData(userId: string, data: DataType): Promise<string> {
  const db = getDatabase();
  const config = await import('../database/DatabaseFactory').then(m => m.DatabaseFactory.getConfig());
  
  if (config?.type === 'firebase') {
    // Use nested collections for Firebase
    return db.createNested(this.USER_COLLECTION, userId, this.COLLECTION, data);
  } else {
    // Use foreign keys for SQL databases
    return db.create(this.COLLECTION, { ...data, user_id: userId });
  }
}
```

## Query Operations
```typescript
// Simple query
const result = await db.query<DataType>('collection', {
  where: [{ field: 'status', operator: '==', value: 'active' }],
  limit: 10
});

// Complex query with multiple conditions
const result = await db.query<DataType>('collection', {
  where: [
    { field: 'user_id', operator: '==', value: userId },
    { field: 'created_at', operator: '>=', value: startDate }
  ],
  orderBy: 'created_at',
  orderDirection: 'desc',
  limit: 20,
  offset: 0
});
```

## Transaction Support
```typescript
static async performAtomicOperation(data1: DataType1, data2: DataType2): Promise<void> {
  const db = getDatabase();
  
  await db.transaction(async (transaction) => {
    const id1 = await transaction.create('collection1', data1);
    await transaction.create('collection2', { ...data2, related_id: id1 });
  });
}
```

## Error Handling
```typescript
static async safeOperation(id: string): Promise<DataType | null> {
  try {
    const db = getDatabase();
    return await db.read<DataType>('collection', id);
  } catch (error) {
    console.error('Database operation failed:', error);
    throw new Error('Failed to fetch data');
  }
}
```

## Migration from Direct Firebase
When migrating existing Firebase services:

1. Replace direct Firebase imports with database abstraction
2. Change Firestore-specific operations to abstracted operations
3. Update data models to extend `DatabaseDocument`
4. Handle nested collections vs foreign keys appropriately

## Available Database Adapters
- **FirebaseAdapter**: For Firestore operations
- **PostgreSQLAdapter**: For PostgreSQL operations (requires `pg` package)
- **Future**: MongoDB, MySQL, and other adapters can be added

## Testing
Mock the database for unit tests:
```typescript
jest.mock('../database/DatabaseFactory', () => ({
  getDatabase: () => ({
    query: jest.fn().mockResolvedValue({ data: [], total: 0, hasMore: false }),
    create: jest.fn().mockResolvedValue('mock-id'),
    read: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  })
}));
```