# API Integration Standards

## Supported APIs
- **OpenAI API**: Direct integration for AI-powered features (resume enhancement, job matching)
- **Firebase**: Authentication, Firestore database, and storage
- **JSearch API**: Job search and listings functionality
- **Daily.co**: Video chat for AI interviews
- **Tavus API**: Video processing capabilities

## OpenAI Integration
- Use `NEXT_PUBLIC_OPENAI_API_KEY` environment variable
- Default model: `gpt-4o` for optimal performance
- Always validate API key before making requests
- Include proper error handling for rate limits and API errors
- Use structured prompts for consistent AI responses

## Firebase Integration
- Use Firebase SDK v9+ modular approach
- Initialize Firebase in `lib/firebase.ts`
- Use proper error handling for auth and database operations
- Implement proper security rules for Firestore
- Use typed interfaces for Firestore documents

## External API Patterns
```typescript
// Standard API call pattern
export class APIService {
  private static readonly API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  private static readonly BASE_URL = 'https://api.example.com';

  static async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.API_KEY) {
      throw new Error('API key not configured');
    }

    try {
      const response = await fetch(`${this.BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }
}
```

## Error Handling
- Use custom error utilities from `utils/apiErrorUtils.ts`
- Provide user-friendly error messages
- Log detailed errors for debugging
- Handle network timeouts and connection issues
- Implement retry logic for transient failures

## Rate Limiting
- Implement proper rate limiting for API calls
- Use exponential backoff for retries
- Cache responses where appropriate
- Monitor API usage and costs

## Security Best Practices
- Never expose API keys in client-side code (use NEXT_PUBLIC_ only when necessary)
- Validate and sanitize all user inputs
- Use HTTPS for all API communications
- Implement proper CORS handling
- Use environment variables for sensitive configuration

## Data Validation
- Validate API responses against expected schemas
- Use TypeScript interfaces for type safety
- Handle null/undefined values gracefully
- Sanitize data before storing or displaying