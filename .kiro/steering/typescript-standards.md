# TypeScript Standards

## Configuration
- Use strict mode TypeScript configuration
- Enable all strict type checking options
- Use proper module resolution (bundler)
- Include proper path mapping for imports

## Type Definitions
- Define interfaces in `src/types/` directory for shared types
- Use proper naming conventions (PascalCase for interfaces)
- Export types from service files when needed
- Avoid `any` type - use proper typing or `unknown`

## Common Type Patterns
```typescript
// Service response types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Component props with children
export interface ComponentProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

// API request/response types
export interface APIRequest {
  userId: string;
  data: RequestData;
}

export interface APIResponse {
  id: string;
  status: 'success' | 'error';
  result: ResponseData;
}
```

## Existing Type Structure
- `src/types/conversation.ts` - Interview conversation types
- `src/types/jobApplication.ts` - Job application related types
- `src/types/user.ts` - User profile and authentication types
- `src/types/index.ts` - Common shared types
- `src/types/global.d.ts` - Global type declarations

## Firebase Types
```typescript
// Firestore document types
export interface FirestoreDocument {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserProfile extends FirestoreDocument {
  userId: string;
  email: string;
  displayName: string;
  // other fields
}
```

## React Component Types
```typescript
// Functional component with props
export interface ComponentProps {
  title: string;
  isVisible: boolean;
  onClose: () => void;
  data?: OptionalData;
}

const Component: React.FC<ComponentProps> = ({ title, isVisible, onClose, data }) => {
  // component implementation
};

// Event handlers
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  // handle click
};

const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  // handle change
};
```

## Utility Types
- Use `Partial<T>` for optional properties
- Use `Pick<T, K>` to select specific properties
- Use `Omit<T, K>` to exclude specific properties
- Use `Record<K, V>` for key-value mappings

## Type Guards
```typescript
// Type guard functions
export function isValidUser(user: unknown): user is User {
  return typeof user === 'object' && 
         user !== null && 
         'id' in user && 
         'email' in user;
}

// Use with API responses
if (isValidUser(response.data)) {
  // TypeScript knows response.data is User type
}
```

## Generic Types
```typescript
// Generic service methods
export class GenericService {
  static async fetchData<T>(endpoint: string): Promise<T[]> {
    // implementation
  }
}

// Usage
const users = await GenericService.fetchData<User>('/users');
```