---
inclusion: fileMatch
fileMatchPattern: 'src/services/*.ts'
---

# Service Layer Patterns

## Service Architecture
- Services should be static classes with static methods
- Use proper TypeScript interfaces for request/response types
- Include comprehensive error handling with custom error types
- Use environment variables for configuration
- **Database Operations**: Use the database abstraction layer (`getDatabase()`) instead of direct Firebase calls

## Database Integration Patterns
- **Database Abstraction**: Use `getDatabase()` from `DatabaseFactory` for all database operations
- **Firebase Adapter**: Handles Firestore operations through the abstraction layer
- **PostgreSQL Adapter**: Handles SQL operations through the abstraction layer
- **Service Layer**: Services should be database-agnostic and work with any adapter

## API Integration Patterns
- **Database Services**: Use database abstraction layer for data persistence
- **OpenAI Integration**: Use OpenAI API directly with proper API key management
- **External APIs**: Use fetch with proper error handling and timeout

## Common Service Patterns

### Database Service Pattern (Abstracted)
```typescript
import { getDatabase } from '../database/DatabaseFactory';
import { DatabaseDocument } from '../database/interfaces/IDatabase';

export interface DataType extends DatabaseDocument {
  userId: string;
  name: string;
  // other fields
}

export class ServiceName {
  private static readonly COLLECTION = 'collectionName';

  static async getData(userId: string): Promise<DataType[]> {
    try {
      const db = getDatabase();
      const result = await db.query<DataType>(this.COLLECTION, {
        where: [{ field: 'userId', operator: '==', value: userId }],
        orderBy: 'created_at',
        orderDirection: 'desc'
      });
      return result.data;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }

  static async createData(userId: string, data: Omit<DataType, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const db = getDatabase();
      return await db.create(this.COLLECTION, { ...data, userId });
    } catch (error) {
      console.error('Error creating data:', error);
      throw error;
    }
  }
}
```

### OpenAI Service Pattern
```typescript
export class AIServiceName {
  private static readonly API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  private static readonly MODEL = 'gpt-4o';

  static async processWithAI(input: string): Promise<ProcessedResult> {
    if (!this.API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.MODEL,
          messages: [{ role: 'user', content: input }],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      console.error('AI processing error:', error);
      throw error;
    }
  }
}
```

## Error Handling
- Use custom error types from `utils/apiErrorUtils.ts`
- Include proper logging with console.error
- Provide meaningful error messages for users
- Handle network timeouts and connection issues

## Environment Variables
- Use `NEXT_PUBLIC_` prefix for client-side variables
- Validate required environment variables at service initialization
- Provide fallback values where appropriate

## Data Validation
- Validate input parameters before API calls
- Use TypeScript interfaces for type safety
- Include proper null/undefined checks
- Sanitize user input before processing