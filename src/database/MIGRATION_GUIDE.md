# Database Abstraction Migration Guide

## Overview
This guide explains how to migrate from direct Firebase usage to the database abstraction layer, enabling support for multiple database backends (Firebase, PostgreSQL, etc.).

## Benefits
- **Database Flexibility**: Switch between Firebase, PostgreSQL, or other databases
- **Easier Testing**: Mock database operations for unit tests
- **Consistent API**: Same interface regardless of database backend
- **Future-Proof**: Add new database adapters without changing service code

## Migration Steps

### 1. Update Environment Variables
Add database configuration to your environment:

```bash
# Database Configuration
DATABASE_TYPE=firebase  # or 'postgresql', 'mongodb', etc.

# For Firebase (existing variables)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain

# For PostgreSQL (if switching)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=your-database
DATABASE_USER=your-username
DATABASE_PASSWORD=your-password
DATABASE_SSL=false
```

### 2. Initialize Database in Your App
Update your `_app.tsx` or main layout:

```typescript
import { initializeDatabaseForNextJS } from '../database/init';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    initializeDatabaseForNextJS();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ToastProvider>
          <Component {...pageProps} />
        </ToastProvider>
      </PersistGate>
    </Provider>
  );
}
```

### 3. Migrate Service Classes

#### Before (Direct Firebase):
```typescript
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export class OldService {
  static async getData(userId: string) {
    const snapshot = await getDocs(
      query(collection(db, 'data'), where('userId', '==', userId))
    );
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}
```

#### After (Database Abstraction):
```typescript
import { getDatabase } from '../database/DatabaseFactory';
import { DatabaseDocument } from '../database/interfaces/IDatabase';

export interface DataType extends DatabaseDocument {
  userId: string;
  // other fields
}

export class NewService {
  private static readonly COLLECTION = 'data';

  static async getData(userId: string): Promise<DataType[]> {
    const db = getDatabase();
    const result = await db.query<DataType>(this.COLLECTION, {
      where: [{ field: 'userId', operator: '==', value: userId }]
    });
    return result.data;
  }
}
```

### 4. Update Component Usage
Components using the services don't need to change - the service interface remains the same!

```typescript
// This code works with both old and new services
const Component = () => {
  const [data, setData] = useState<DataType[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await NewService.getData(userId);
        setData(result);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [userId]);

  // Component render logic remains the same
};
```

## Database-Specific Considerations

### Firebase (Firestore)
- Uses nested collections for related data
- Supports real-time subscriptions (can be added to abstraction later)
- Document-based structure

### PostgreSQL
- Uses foreign keys for relationships
- Supports complex queries and joins
- Relational structure with ACID transactions

### Switching Databases
To switch from Firebase to PostgreSQL:

1. Update `DATABASE_TYPE=postgresql` in environment
2. Set up PostgreSQL connection variables
3. Install PostgreSQL dependencies: `npm install pg @types/pg`
4. Run database migrations to create tables
5. Restart your application

## Testing
The abstraction layer makes testing much easier:

```typescript
// Mock the database for testing
jest.mock('../database/DatabaseFactory', () => ({
  getDatabase: () => ({
    query: jest.fn().mockResolvedValue({ data: mockData, total: 1, hasMore: false }),
    create: jest.fn().mockResolvedValue('mock-id'),
    // other mocked methods
  })
}));
```

## Existing Services to Migrate
- `FirebaseJobApplicationService` → `JobApplicationService` ✅ (Done)
- `FirebaseProfileService` → `ProfileService` ✅ (Done)
- `FirebaseJobPreferencesService` → `JobPreferencesService` ✅ (Done)
- `FirebaseProfileExtrasService` → `ProfileExtrasService` ✅ (Done)

## Rollback Plan
If you need to rollback:
1. Set `DATABASE_TYPE=firebase` in environment
2. The Firebase adapter will handle all operations
3. No code changes needed in services using the abstraction