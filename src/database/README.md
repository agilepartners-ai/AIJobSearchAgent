# Database Abstraction Layer

## Overview
This directory contains the database abstraction layer that allows the AIJobSearchAgent application to work with multiple database backends without changing service or component code.

## Architecture

```
src/database/
├── interfaces/
│   └── IDatabase.ts          # Core database interface definitions
├── adapters/
│   ├── FirebaseAdapter.ts    # Firestore implementation
│   └── PostgreSQLAdapter.ts  # PostgreSQL implementation
├── DatabaseFactory.ts        # Factory for creating database instances
├── init.ts                  # Database initialization utilities
├── index.ts                 # Module exports
├── MIGRATION_GUIDE.md       # Migration documentation
└── README.md               # This file
```

## Key Components

### 1. IDatabase Interface
Defines the contract that all database adapters must implement:
- **Document Operations**: create, read, update, delete, set
- **Collection Operations**: list, query with filtering and pagination
- **Nested Operations**: For handling subcollections (Firebase) or foreign keys (SQL)
- **Transaction Support**: Atomic operations across multiple documents
- **Connection Management**: connect, disconnect, connection status

### 2. Database Adapters

#### FirebaseAdapter
- Implements IDatabase for Firestore
- Handles nested collections naturally
- Supports real-time subscriptions (can be extended)
- Uses Firebase SDK v9+ modular approach

#### PostgreSQLAdapter
- Implements IDatabase for PostgreSQL
- Maps nested operations to foreign key relationships
- Supports SQL transactions and complex queries
- Requires `pg` package installation

### 3. DatabaseFactory
- Singleton pattern for managing database instances
- Environment-based configuration
- Easy switching between database types
- Connection lifecycle management

## Usage

### Basic Service Pattern
```typescript
import { getDatabase } from '../database/DatabaseFactory';
import { DatabaseDocument } from '../database/interfaces/IDatabase';

export interface MyData extends DatabaseDocument {
  user_id: string;
  name: string;
}

export class MyService {
  private static readonly COLLECTION = 'my_collection';

  static async getData(userId: string): Promise<MyData[]> {
    const db = getDatabase();
    const result = await db.query<MyData>(this.COLLECTION, {
      where: [{ field: 'user_id', operator: '==', value: userId }]
    });
    return result.data;
  }
}
```

### Environment Configuration
```bash
# Use Firebase (default)
DATABASE_TYPE=firebase

# Use PostgreSQL
DATABASE_TYPE=postgresql
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=myapp
DATABASE_USER=myuser
DATABASE_PASSWORD=mypassword
```

## Migrated Services

### ✅ Completed Migrations
1. **JobApplicationService** (was FirebaseJobApplicationService)
   - Handles job application CRUD operations
   - Supports both Firebase nested collections and SQL foreign keys
   - Includes search and filtering capabilities

2. **ProfileService** (was FirebaseProfileService)
   - User profile management
   - Profile creation and updates
   - Skills and resume URL management

3. **JobPreferencesService** (was FirebaseJobPreferencesService)
   - User job preferences and criteria
   - Salary expectations and location preferences
   - Employment type and remote work preferences

4. **ProfileExtrasService** (was FirebaseProfileExtrasService)
   - Work experience management
   - Education history
   - Skills and certifications

### Updated Components
All components have been updated to use the new abstracted services:
- `useAuth` hook
- `Profile` component
- `JobPreferencesModal`
- `ApplyJobsModal`
- `DashboardMain`
- `Dashboard`
- `ApplicationModal`
- `ApplicationsTable`
- `SavedJobsSection`

## Benefits

1. **Database Flexibility**: Switch between Firebase, PostgreSQL, or other databases
2. **Consistent API**: Same service interface regardless of database backend
3. **Easy Testing**: Mock database operations for unit tests
4. **Future-Proof**: Add new database adapters without changing service code
5. **Type Safety**: Full TypeScript support across all adapters
6. **Performance**: Optimized queries for each database type

## Testing

The abstraction layer makes testing much easier:

```typescript
jest.mock('../database/DatabaseFactory', () => ({
  getDatabase: () => ({
    query: jest.fn().mockResolvedValue({ data: mockData, total: 1, hasMore: false }),
    create: jest.fn().mockResolvedValue('mock-id'),
    read: jest.fn().mockResolvedValue(mockData[0]),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  })
}));
```

## Adding New Database Adapters

To add support for a new database (e.g., MongoDB):

1. Create `src/database/adapters/MongoDBAdapter.ts`
2. Implement the `IDatabase` interface
3. Add the adapter to `DatabaseFactory.createAdapter()`
4. Update environment configuration
5. Add database-specific dependencies

## Performance Considerations

- **Firebase**: Optimized for document-based queries and real-time updates
- **PostgreSQL**: Optimized for complex relational queries and transactions
- **Caching**: Can be added at the adapter level for frequently accessed data
- **Connection Pooling**: Handled by each adapter (PostgreSQL uses connection pools)

## Security

- Environment variables are validated at startup
- Database connections use secure protocols (SSL/TLS)
- User data access is controlled through service-layer authorization
- SQL injection protection through parameterized queries

## Monitoring

- Database operations are logged for debugging
- Connection status is tracked
- Error handling provides detailed context
- Performance metrics can be added at the adapter level